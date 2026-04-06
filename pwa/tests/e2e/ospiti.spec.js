import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('ospiti view supports create, edit, and delete with extended anagrafica fields', async ({ page }) => {
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
    await details.locator('summary').click()

    await page.getByLabel('Codice interno').fill('OSP-E2E-001')
    await page.getByLabel('Nome', { exact: true }).fill('Carla')
    await page.getByLabel('Cognome', { exact: true }).fill('Bianchi')
    await page.getByLabel('Luogo di nascita').fill('Torino')
    await page.getByLabel('Data di nascita').fill('1947-05-12')
    await page.getByLabel('Sesso').selectOption('F')
    await page.getByLabel('Codice fiscale').fill('BNCCRL47E52L219Z')
    await page.getByLabel('Patologie').fill('Ipertensione')
    await page.getByLabel('Note').fill('Creato da test E2E')
    await page.getByRole('button', { name: 'Salva ospite' }).click()

    await expect(page.getByText(/Ospite ".+" creato\./i)).toBeVisible({ timeout: 5000 })

    const createdRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'OSP-E2E-001' }),
    }).first()
    await expect(createdRow).toBeVisible({ timeout: 5000 })
    await expect(createdRow.getByRole('cell', { name: '[OSP-E2E-001] - Bianchi Carla' })).toBeVisible()

    await createdRow.getByRole('button', { name: 'Modifica' }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Carlotta')
    await page.getByLabel('Patologie').fill('Ipertensione, diabete')
    await page.getByRole('button', { name: 'Salva modifica' }).click()

    await expect(page.getByText(/Ospite ".+" aggiornato\./i)).toBeVisible({ timeout: 5000 })

    const updatedRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'OSP-E2E-001' }),
    }).first()
    await expect(updatedRow.getByRole('cell', { name: '[OSP-E2E-001] - Bianchi Carlotta' })).toBeVisible()

    page.once('dialog', dialog => dialog.accept())
    await updatedRow.getByRole('button', { name: 'Elimina' }).click()

    await expect(page.getByText(/Ospite ".+" eliminato\./i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: 'OSP-E2E-001' })).not.toBeVisible({ timeout: 5000 })
})
