import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('android phone UI smoke loads key sections', async ({ page }) => {
    await page.route('https://api.github.com/user', async (route) => {
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

    const viewport = page.viewportSize()
    expect(viewport?.width || 0).toBeLessThanOrEqual(500)

    await expect(page.getByRole('heading', { name: 'Cruscotto MediTrace' })).toBeVisible()

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    await page.getByRole('link', { name: 'Manuale' }).click()
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
})
