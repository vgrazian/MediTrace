import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('daily operations scenario covers therapy edits, executions, stock checks and order prep', async ({ page }) => {
    test.setTimeout(120_000)

    await page.route('https://api.github.com/user', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                login: 'seeded-gh-user',
                name: 'Seeded User',
                avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
            }),
        })
    })

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // Deterministic baseline setup for scenario execution.
    await page.evaluate(async () => {
        const seed = await import('/src/services/seedData.js')
        await seed.clearSeedData()
        await seed.loadSeedData()
    })

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    const today = new Date().toISOString().slice(0, 10)

    const editableTherapyRows = page.locator('tbody tr').filter({
        has: page.getByRole('button', { name: 'Modifica' }),
    })
    await expect.poll(async () => editableTherapyRows.count()).toBeGreaterThanOrEqual(2)

    for (let i = 0; i < 2; i += 1) {
        const row = editableTherapyRows.nth(i)
        await row.getByRole('button', { name: 'Modifica' }).click()
        await page.getByLabel('Dose per somministrazione').fill(String(2 + i))
        await page.getByLabel('Somministrazioni giornaliere').fill(String(3 + i))
        await page.getByLabel('Data inizio').fill(today)
        await page.getByLabel('Note').fill(`Scenario giornata operativa #${i + 1}`)
        await page.getByRole('button', { name: 'Salva modifica' }).click()
        await expect(page.getByText('Terapia aggiornata.')).toBeVisible()
    }

    // End-of-day execution flow: complete therapies/reminders for at least 4 hosts.
    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()
    await page.getByLabel('Data').selectOption('all')
    await page.getByLabel('Stato').first().selectOption('DA_ESEGUIRE')

    const eseguiButtons = page.getByRole('button', { name: 'Eseguito' })
    const pendingCount = await eseguiButtons.count()
    expect(pendingCount).toBeGreaterThanOrEqual(4)

    for (let i = 0; i < 4; i += 1) {
        await page.getByRole('button', { name: 'Eseguito' }).first().click()
        await expect(page.getByText('Promemoria contrassegnato: ESEGUITO.')).toBeVisible()
    }

    // End-of-day stock status check.
    await page.getByRole('link', { name: 'Scorte' }).click()
    await expect(page.getByRole('heading', { name: 'Scorte' })).toBeVisible()
    await expect(page.getByText('Riepilogo segnalazioni')).toBeVisible()
    await expect(page.getByText(/Farmaci monitorati:/)).toBeVisible()

    // Prepare order text/email draft from stock priorities.
    await page.getByRole('button', { name: 'Aggiorna report' }).click()
    await page.getByRole('button', { name: 'Prepara testo ordine farmaci' }).click()

    const draftPanelTitle = page.getByText('Bozza testo ordine farmaci')
    const noPriorityMessage = page.getByText(/Nessun farmaco con priorita'/)

    if (await noPriorityMessage.isVisible().catch(() => false)) {
        // Force at least one order-worthy drug by increasing threshold, then re-prepare.
        const firstDrugRow = page.locator('div.card', { hasText: 'Riepilogo segnalazioni' })
            .locator('tbody tr')
            .filter({ has: page.getByRole('button', { name: 'Modifica' }) })
            .first()

        await firstDrugRow.getByRole('button', { name: 'Modifica' }).click()
        await page.locator('summary', { hasText: 'Gestione Scorte' }).click()
        await page.getByLabel('Scorta minima').fill('999')
        await page.getByRole('button', { name: 'Salva modifica farmaco' }).click()
        await expect(page.getByText('Farmaco aggiornato.')).toBeVisible()

        await page.getByRole('button', { name: 'Aggiorna report' }).click()
        await page.getByRole('button', { name: 'Prepara testo ordine farmaci' }).click()
    }

    await expect(draftPanelTitle).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copia' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Annulla' })).toBeVisible()
})
