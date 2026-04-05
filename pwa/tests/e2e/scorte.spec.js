import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('scorte view supports edit/delete for drug and batch', async ({ page }) => {
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

    // Seed via Farmaci view so Scorte has concrete rows to manage
    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    await page.locator('summary', { hasText: 'Gestisci Farmaci' }).click()

    await page.getByLabel('ID farmaco (opzionale)').fill('drug-scorte-e2e')
    await page.getByLabel('Nome farmaco').fill('Brufen Test Scorte')
    await page.getByLabel('Principio attivo').fill('Ibuprofene Test Scorte')
    await page.getByLabel('Classe terapeutica').fill('Antinfiammatori')
    await page.getByLabel('Scorta minima').fill('8')
    await page.getByRole('button', { name: 'Salva farmaco' }).click()
    await expect(page.getByRole('cell', { name: 'Brufen Test Scorte' }).first()).toBeVisible()

    await page.locator('select').first().selectOption('drug-scorte-e2e')
    await page.getByLabel('Nome commerciale').fill('Brufen Test Scorte')
    await page.getByLabel('Dosaggio').fill('400mg')
    await page.getByLabel("Quantita' attuale").fill('15')
    await page.getByLabel('Soglia riordino').fill('5')
    await page.getByRole('button', { name: 'Salva confezione' }).click()
    await expect(page.getByText('Confezione salvata.')).toBeVisible()

    // Go to Scorte and update drug from report table
    await page.getByRole('link', { name: 'Scorte' }).click()
    await expect(page.getByRole('heading', { name: 'Scorte' })).toBeVisible()

    const reportCard = page.locator('div.card', { hasText: 'Riepilogo segnalazioni' }).first()
    const batchCard = page.locator('div.card', { hasText: 'Confezioni monitorate (Gestione completa)' }).first()

    const drugRow = page.locator('tr', { hasText: 'Ibuprofene Test Scorte' }).first()
    await drugRow.getByRole('button', { name: 'Modifica' }).click()

    await page.locator('summary', { hasText: 'Gestione Scorte' }).click()
    const scorteForm = page.locator('details:has(summary:has-text("Gestione Scorte"))')

    await scorteForm.getByLabel('Principio attivo').fill('إيبوبروفين محدث')
    await scorteForm.getByLabel('Classe terapeutica').fill('Antinfiammatori')
    await scorteForm.getByRole('button', { name: 'Salva modifica farmaco' }).click()

    await expect(page.getByText('Farmaco aggiornato.')).toBeVisible()
    await expect(batchCard.getByRole('cell', { name: 'إيبوبروفين محدث - Brufen Test Scorte' })).toBeVisible()

    // Update batch in Scorte
    const batchRow = page.locator('tr', { hasText: 'Brufen Test Scorte' }).first()
    await batchRow.getByRole('button', { name: 'Modifica' }).click()
    await scorteForm.getByLabel('Nome commerciale').fill('بروفين محدث')
    await scorteForm.getByRole('button', { name: 'Salva modifica', exact: true }).click()

    await expect(page.getByText('Confezione aggiornata.')).toBeVisible()
    await expect(batchCard.getByRole('cell', { name: 'إيبوبروفين محدث - بروفين محدث' })).toBeVisible()

    // Delete batch
    page.once('dialog', dialog => dialog.accept())
    await batchCard.locator('tr', { hasText: 'بروفين محدث' }).first().getByRole('button', { name: 'Elimina' }).click()
    await expect(page.getByText('Confezione eliminata.')).toBeVisible()
    await expect(batchCard.getByRole('cell', { name: 'إيبوبروفين محدث - بروفين محدث' })).toHaveCount(0)

    // Delete drug
    page.once('dialog', dialog => dialog.accept())
    await reportCard.locator('tr', { hasText: 'إيبوبروفين محدث' }).first().getByRole('button', { name: 'Elimina' }).click()
    await expect(page.getByText('Farmaco eliminato.')).toBeVisible()
})
