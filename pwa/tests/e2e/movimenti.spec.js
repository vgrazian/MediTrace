import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('movimenti view supports registering a carico and a scarico', async ({ page }) => {
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

    // Pre-load a drug and a stock batch via CSV import
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
    if (await dryRunCheckbox.isChecked()) await dryRunCheckbox.uncheck()

    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-MOV-1,Ibuprofene E2E\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('02_ConfezioniMagazzino.csv')
    await page.locator('input[type="file"]').setInputFiles({
        name: '02_ConfezioniMagazzino.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('stock_item_id,drug_id,nome_commerciale,quantita_attuale\nBATCH-MOV-1,DRUG-MOV-1,Moment E2E,50\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // Navigate to Movimenti
    await page.getByRole('link', { name: 'Movimenti' }).click()
    await expect(page.getByRole('heading', { name: 'Movimenti' })).toBeVisible()

    await page.locator('summary', { hasText: 'Gestione Movimenti' }).click()

    // Validation should block invalid quantity after required fields are present
    const batchSelect = page.locator('select').filter({ has: page.getByRole('option', { name: 'Seleziona confezione' }) })
    await batchSelect.selectOption({ label: 'Ibuprofene E2E - Moment E2E' })
    await page.getByLabel('Quantita').fill('0')
    await expect(page.getByRole('button', { name: 'Registra movimento' })).toBeDisabled()

    // Register a CARICO
    await page.getByLabel('Tipo movimento').selectOption('carico')
    await page.getByLabel('Quantita').fill('20')
    await page.getByRole('button', { name: 'Registra movimento' }).click()

    await expect(page.getByText(/Movimento registrato/i)).toBeVisible()

    // The new record should appear in the history table
    await expect(page.getByRole('cell', { name: 'carico' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '20', exact: true })).toBeVisible()

    // Register a SCARICO
    await batchSelect.selectOption({ label: 'Ibuprofene E2E - Moment E2E' })
    await page.getByLabel('Tipo movimento').selectOption('scarico')
    await page.getByLabel('Quantita').fill('5')
    await page.getByRole('button', { name: 'Registra movimento' }).click()

    await expect(page.getByText(/Movimento registrato/i)).toBeVisible()
    await expect(page.getByRole('cell', { name: 'scarico' })).toBeVisible()
})
