import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('route /stanze redirects to /residenze after authentication', async ({ page }) => {
    await page.goto('/#/stanze')
    await loginOrRegisterSeededUser(page)

    await expect(page).toHaveURL(/\/#\/residenze$/)
    await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()
})

test('route /informazioni redirects to /manuale after authentication', async ({ page }) => {
    await page.goto('/#/informazioni')
    await loginOrRegisterSeededUser(page)

    await expect(page).toHaveURL(/\/#\/manuale$/)
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
})