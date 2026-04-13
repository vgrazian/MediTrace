import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'
import { runWithAcceptedConfirmation } from './helpers/confirm'

test('terapie view blocks delete when therapy is assigned to active host', async ({ page }) => {
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

    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
    if (await dryRunCheckbox.isChecked()) {
        await dryRunCheckbox.uncheck()
    }

    await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
    await page.locator('input[type="file"]').setInputFiles({
        name: '03_Ospiti.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('guest_id,codice_interno\nHOST-1,OSP-01\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-1,Paracetamolo\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
    await expect(page.locator('.dataset-frame')).toHaveCount(1)

    const panel = page.locator('details:has(summary:has-text("Gestione Terapie"))')
    await page.getByRole('button', { name: 'Aggiungi' }).click()
    await expect(panel).toHaveAttribute('open', '')

    await page.getByLabel('Ospite').selectOption('HOST-1')
    await page.getByLabel('Farmaco').selectOption('DRUG-1')
    await page.getByLabel('Dose per somministrazione').fill('1')
    await page.getByLabel('Somministrazioni giornaliere').fill('2')
    await page.getByLabel('Consumo medio settimanale').fill('14')
    await page.getByLabel('Data inizio').fill('2030-01-01')
    await page.getByRole('button', { name: 'Salva terapia' }).click()

    await expect(page.getByText(/Terapia salvata/i)).toBeVisible()
    await expect(panel).not.toHaveAttribute('open', '')
    await expect(page.getByRole('cell', { name: '[OSP-01] - OSP-01', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Paracetamolo', exact: true })).toBeVisible()

    await page.getByLabel(/Seleziona terapia/i).check()
    await page.getByRole('button', { name: /^Modifica$/ }).first().click()
    await expect(page.getByRole('button', { name: 'Salva modifica' })).toBeVisible()
    await page.getByRole('button', { name: 'Annulla' }).first().click()

    await page.getByRole('button', { name: 'Elimina (1)' }).first().click()
    await expect(page.getByText(/Non e' possibile eliminare una o piu' terapie/i)).toBeVisible()
    await expect(page.getByText(/ancora assegnate a ospiti attivi/i)).toBeVisible()
    await expect(page.getByRole('cell', { name: '[OSP-01] - OSP-01', exact: true })).toBeVisible()
})
