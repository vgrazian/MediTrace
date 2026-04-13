import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('menu navigation opens major sections', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()

    await page.getByRole('link', { name: 'Manuale' }).click()
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
})

test('global logout is available from main navigation', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Scorte' }).click()
    await expect(page.getByRole('heading', { name: 'Scorte' })).toBeVisible()

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page.locator('.login-screen')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
})
