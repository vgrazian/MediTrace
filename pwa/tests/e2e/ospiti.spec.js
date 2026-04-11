import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

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

    page.once('dialog', dialog => dialog.accept())
    await deleteOneButton.click()

    await expect(page.getByText(/Ospite ".+" eliminato\./i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: 'OSP-E2E-001' })).not.toBeVisible({ timeout: 5000 })
})
