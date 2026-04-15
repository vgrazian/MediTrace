import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'
import { runWithAcceptedConfirmation } from './helpers/confirm'

test('residenze view supports creating a residence', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Residenze', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()

    const details = page.locator('details:has(summary:has-text("Gestione Residenze"))')
    await expect(details).toBeVisible({ timeout: 5000 })
    await details.locator('summary').click()

    await page.getByLabel('Nome residenza').fill('Residenza E2E')
    await page.getByLabel('Max ospiti').fill('10')
    await page.getByLabel('Note').fill('Creata da test E2E')

    await page.getByRole('button', { name: /Salva residenza/ }).click()

    await expect(page.getByText('Residenza creata.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: 'Residenza E2E' })).toBeVisible({ timeout: 5000 })
})

test('residenze view supports editing and deleting a residence', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Residenze', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()

    const details = page.locator('details:has(summary:has-text("Gestione Residenze"))')
    await details.locator('summary').click()

    await page.getByLabel('Nome residenza').fill('Residenza Deactivate Test')
    await page.getByLabel('Max ospiti').fill('9')
    await page.getByLabel('Note').fill('da aggiornare e poi eliminare')
    await page.getByRole('button', { name: /Salva residenza/ }).click()
    await expect(page.getByRole('cell', { name: 'Residenza Deactivate Test' })).toBeVisible({ timeout: 5000 })

    const row = page.locator('tbody tr', { has: page.getByRole('cell', { name: 'Residenza Deactivate Test' }) }).first()
    await row.getByRole('button', { name: 'Modifica' }).click()

    await page.getByLabel('Max ospiti').fill('10')
    await page.getByRole('button', { name: /Salva modifica/ }).click()
    await expect(page.getByText('Residenza aggiornata.')).toBeVisible({ timeout: 5000 })

    await runWithAcceptedConfirmation(page, async () => {
        await row.getByRole('button', { name: 'Elimina' }).click()
    })

    await expect(page.getByText('Residenza eliminata.')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.undo-banner')).toContainText('Residenza "Residenza Deactivate Test" eliminata.')
    await page.locator('.undo-banner').getByRole('button', { name: 'Annulla eliminazione' }).click()
    await expect(page.getByText('Eliminazione annullata: residenza ripristinata.')).toBeVisible({ timeout: 5000 })
})
