import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login.js'

test.describe('critical workflow parity across browsers', () => {
    test('seeded operator can log in and open Farmaci workflow', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)

        await page.getByRole('link', { name: 'Farmaci' }).click()
        await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

        const panel = page.locator('details:has(summary:has-text("Gestisci Farmaci"))')
        const addButton = page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Aggiungi' })
        await addButton.click()
        await expect(panel).toHaveAttribute('open', '')

        await page.getByRole('button', { name: 'Annulla' }).click()
        await expect(panel).not.toHaveAttribute('open', '')
        await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
    })
})
