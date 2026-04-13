import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'
import { runWithAcceptedConfirmation } from './helpers/confirm'

test('ospiti view supports create, selection-based edit, and bulk delete with extended anagrafica fields', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()
    await expect(page.locator('.dataset-frame')).toHaveCount(1)

    const details = page.locator('details:has(summary:has-text("Gestione Ospiti"))')
    await expect(details).toBeVisible({ timeout: 5000 })
    await expect(details).not.toHaveAttribute('open', '')

    const addButton = page.getByRole('button', { name: 'Aggiungi' })
    const editButton = page.getByRole('button', { name: 'Modifica' }).first()
    const deleteButton = page.getByRole('button', { name: 'Elimina' })
    await expect(addButton).toBeVisible()
    await expect(editButton).toBeDisabled()
    await expect(deleteButton).toBeDisabled()

    await addButton.click()
    await expect(details).toHaveAttribute('open', '')
    await page.getByLabel('Codice interno').fill('OSP-E2E-001')
    await page.getByLabel(/^Nome/).fill('Carla')
    await page.getByLabel(/^Cognome/).fill('Bianchi')
    await page.getByLabel('Luogo di nascita').fill('Torino')
    await page.getByLabel('Data di nascita').fill('1947-05-12')
    await page.getByLabel('Sesso').selectOption('F')
    await page.getByLabel('Codice fiscale').fill('BNCCRL47E52L219Z')
    await page.getByLabel('Patologie').fill('Ipertensione')
    const roomSelect = page.getByLabel('Stanza')
    if (await roomSelect.isEnabled()) {
        await roomSelect.selectOption({ index: 1 })
    }
    await page.getByLabel('Note').fill('Creato da test E2E')
    await page.getByRole('button', { name: 'Salva ospite' }).click()

    await expect(page.getByText(/Ospite ".+" creato\./i)).toBeVisible({ timeout: 5000 })
    await expect(details).not.toHaveAttribute('open', '')

    const firstRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'OSP-E2E-001', exact: true }),
    }).first()
    await expect(firstRow).toBeVisible({ timeout: 5000 })
    await expect(firstRow.getByRole('cell', { name: '[OSP-E2E-001] - Bianchi Carla', exact: true })).toBeVisible()

    const firstRowCheckbox = firstRow.getByRole('checkbox', { name: /Seleziona/i })
    await firstRowCheckbox.check()
    await expect(page.getByText(/1 ospite selezionato/i)).toBeVisible()
    await expect(editButton).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Elimina \(1\)' })).toBeEnabled()

    await editButton.click()
    await page.getByLabel(/^Nome/).fill('Carlotta')
    await page.getByLabel('Patologie').fill('Ipertensione, diabete')
    await page.getByRole('button', { name: 'Salva modifica' }).click()

    await expect(page.getByText(/Ospite ".+" aggiornato\./i)).toBeVisible({ timeout: 5000 })

    const updatedFirstRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'OSP-E2E-001', exact: true }),
    }).first()
    await expect(updatedFirstRow.getByRole('cell', { name: '[OSP-E2E-001] - Bianchi Carlotta', exact: true })).toBeVisible()

    const deleteOneButton = page.getByRole('button', { name: 'Elimina (1)' })
    await expect(deleteOneButton).toBeEnabled()

    await runWithAcceptedConfirmation(page, async () => {
        await deleteOneButton.click()
    })

    await expect(page.locator('p.muted', { hasText: /Ospite ".+" eliminato\./i })).toBeVisible({ timeout: 5000 })
    const undoBanner = page.locator('.undo-banner')
    await expect(undoBanner).toContainText('Ospite')
    await undoBanner.getByRole('button', { name: 'Annulla eliminazione' }).click()
    await expect(page.getByText(/Eliminazione annullata: ospite ripristinato\./i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: 'OSP-E2E-001', exact: true })).toBeVisible({ timeout: 5000 })
})

test('ospiti delete cascades therapies and asks explicit confirmation', async ({ page }) => {
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
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '03_Ospiti.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('guest_id,codice_interno\nHOST-CASCADE,OSP-CASCADE\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-CASCADE,Farmaco Cascata\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
    await page.getByRole('button', { name: 'Aggiungi' }).click()
    await page.getByLabel('Ospite').selectOption('HOST-CASCADE')
    await page.getByLabel('Farmaco').selectOption('DRUG-CASCADE')
    await page.getByLabel('Dose per somministrazione').fill('1')
    await page.getByLabel('Somministrazioni giornaliere').fill('2')
    await page.getByLabel('Consumo medio settimanale').fill('14')
    await page.getByLabel('Data inizio').fill('2030-01-01')
    await page.getByRole('button', { name: 'Salva terapia' }).click()
    await expect(page.getByText(/Terapia salvata/i)).toBeVisible()

    await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    const hostRow = page.locator('tbody tr', { hasText: 'OSP-CASCADE' }).first()
    await expect(hostRow).toBeVisible()
    await hostRow.locator('input[type="checkbox"]').first().check()

    await page.locator('.card', { hasText: 'Lista ospiti' }).getByRole('button', { name: 'Elimina (1)' }).click()

    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText('terapie associate')
    await expect(confirmDialog).toContainText('stanza/letto')
    await confirmDialog.locator('.actions button').last().click()

    await expect(page.locator('p.muted', { hasText: /eliminato\./i })).toBeVisible({ timeout: 5000 })
    await expect(page.locator('tbody tr', { hasText: 'OSP-CASCADE' })).toHaveCount(0)

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    const drugRow = page.locator('tbody tr', { hasText: 'Farmaco Cascata' }).first()
    await expect(drugRow).toBeVisible()
    await drugRow.locator('input[type="checkbox"]').first().check()
    await runWithAcceptedConfirmation(page, async () => {
        await page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Elimina (1)' }).click()
    })

    await expect(page.getByText(/Farmaco eliminato/i)).toBeVisible()
    await expect(page.getByText(/Non e' possibile eliminare (il farmaco|uno o piu' farmaci)/i)).toHaveCount(0)
})
