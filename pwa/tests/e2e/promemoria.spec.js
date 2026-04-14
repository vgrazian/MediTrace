import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'
import { runWithAcceptedConfirmation } from './helpers/confirm'

test('promemoria view shows reminders with labels and supports mark as eseguito/saltato', async ({ page }) => {
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

    // ----------------------------------------------------------------
    // Seed prerequisites via CSV import (host, drug, therapy, reminder)
    // ----------------------------------------------------------------
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
    if (await dryRunCheckbox.isChecked()) await dryRunCheckbox.uncheck()

    // Import ospite
    await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '03_Ospiti.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('guest_id,codice_interno,attivo\nHOST-PROM-1,PROM-01,si\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // Import farmaco
    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-PROM-1,Ramipril E2E\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // Import terapia
    await page.getByLabel('Sorgente').selectOption('04_TerapieAttive.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '04_TerapieAttive.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('therapy_id,guest_id,drug_id,attiva\nTHERAPY-PROM-1,HOST-PROM-1,DRUG-PROM-1,true\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // Import promemoria per oggi
    const today = new Date().toISOString().slice(0, 10)
    await page.getByLabel('Sorgente').selectOption('09_PromemoriaSomministrazioni.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '09_PromemoriaSomministrazioni.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            `reminder_id,guest_id,therapy_id,drug_id,scheduled_at,stato\n` +
            `REM-E2E-1,HOST-PROM-1,THERAPY-PROM-1,DRUG-PROM-1,${today}T09:00:00.000Z,DA_ESEGUIRE\n`
        ),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // ----------------------------------------------------------------
    // Navigate to Promemoria
    // ----------------------------------------------------------------
    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()

    // Default filter is "oggi" — the reminder should be visible
    await expect(page.getByRole('cell', { name: 'PROM-01' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Ramipril E2E' })).toBeVisible()
    await expect(page.getByText('DA_ESEGUIRE')).toBeVisible()

    // Mark as ESEGUITO
    await page.getByRole('button', { name: 'Eseguito' }).first().click()
    await expect(page.getByText('Promemoria contrassegnato: ESEGUITO.')).toBeVisible()
    await expect(page.getByText('ESEGUITO', { exact: true })).toBeVisible()

    // Azioni column should show no buttons after marking
    await expect(page.getByRole('button', { name: 'Eseguito' })).toHaveCount(0)
})

test('promemoria view date filter hides reminders outside selected day', async ({ page }) => {
    await page.route('https://api.github.com/user', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ login: 'seeded-gh-user', name: 'Seeded User', avatar_url: '' }),
        })
    })

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // Seed a reminder for a past date (never today)
    await page.getByRole('link', { name: '⚙' }).click()
    const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
    if (await dryRunCheckbox.isChecked()) await dryRunCheckbox.uncheck()

    await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '03_Ospiti.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('guest_id,codice_interno,attivo\nHOST-FILTER-1,FILT-01,si\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-FILTER-1,Metformina E2E\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('04_TerapieAttive.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '04_TerapieAttive.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('therapy_id,guest_id,drug_id,attiva\nTHERAPY-FILTER-1,HOST-FILTER-1,DRUG-FILTER-1,true\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('09_PromemoriaSomministrazioni.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '09_PromemoriaSomministrazioni.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            `reminder_id,guest_id,therapy_id,drug_id,scheduled_at,stato\n` +
            `REM-PAST-1,HOST-FILTER-1,THERAPY-FILTER-1,DRUG-FILTER-1,2026-01-10T09:00:00.000Z,DA_ESEGUIRE\n`
        ),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // Navigate to Promemoria with default "oggi" filter
    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()

    // Past reminder should not appear with "oggi" filter
    await expect(page.getByRole('cell', { name: 'FILT-01' })).toHaveCount(0)
    await expect(page.getByText('Nessun promemoria per il filtro selezionato.')).toBeVisible()

    // Switch to "Tutti" — past reminder should become visible
    await page.getByLabel('Data').selectOption('all')
    await expect(page.getByRole('cell', { name: 'FILT-01' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Metformina E2E' })).toBeVisible()
})

test('promemoria view supports edit/delete and handles Arabic host names', async ({ page }) => {
    await page.route('https://api.github.com/user', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ login: 'seeded-gh-user', name: 'Seeded User', avatar_url: '' }),
        })
    })

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // Seed data via CSV import
    await page.getByRole('link', { name: '⚙' }).click()
    const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
    if (await dryRunCheckbox.isChecked()) await dryRunCheckbox.uncheck()

    // Arabic host label hardening: codice_interno with Arabic characters
    await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '03_Ospiti.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('guest_id,codice_interno,attivo\nHOST-AR-1,أحمد علي,si\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-AR-1,Omeprazolo E2E\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('04_TerapieAttive.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '04_TerapieAttive.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('therapy_id,guest_id,drug_id,attiva\nTHERAPY-AR-1,HOST-AR-1,DRUG-AR-1,true\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    const today = new Date().toISOString().slice(0, 10)
    await page.getByLabel('Sorgente').selectOption('09_PromemoriaSomministrazioni.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '09_PromemoriaSomministrazioni.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            `reminder_id,guest_id,therapy_id,drug_id,scheduled_at,stato,note\n` +
            `REM-AR-1,HOST-AR-1,THERAPY-AR-1,DRUG-AR-1,${today}T10:00:00.000Z,DA_ESEGUIRE,nota iniziale\n`
        ),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // Navigate and validate Arabic host rendering
    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()
    await expect(page.getByText('أحمد علي')).toBeVisible()

    // Edit reminder
    const row = page.locator('tr', { hasText: 'Omeprazolo E2E' }).first()
    await row.getByRole('button', { name: 'Modifica' }).click()
    const gestionePromemoria = page.locator('details:has(summary:has-text("Gestione Promemoria"))')
    await gestionePromemoria.locator('summary').click()
    await expect(gestionePromemoria.getByLabel('Stato')).toBeVisible()
    await gestionePromemoria.getByLabel('Orario promemoria').fill(`${today}T12:30`)
    await gestionePromemoria.getByLabel('Note').fill('nota aggiornata')
    await gestionePromemoria.getByLabel('Orario promemoria').fill(`${today}T12:30`)
    await gestionePromemoria.getByLabel('Stato').selectOption('SALTATO')
    await gestionePromemoria.getByLabel('Note').fill('nota aggiornata')
    await gestionePromemoria.getByRole('button', { name: 'Salva modifica' }).click()
    await expect(page.getByText('Promemoria aggiornato.')).toBeVisible()
    await expect(row.getByText('SALTATO', { exact: true })).toBeVisible()

    // Delete reminder
    await runWithAcceptedConfirmation(page, async () => {
        await row.getByRole('button', { name: 'Elimina' }).click()
    })
    await expect(page.getByText('Promemoria eliminato.')).toBeVisible()
})

