import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
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
})

test('@ops performance smoke: initial load within budget', async ({ page }) => {
    const startedAt = Date.now()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'MediTrace' })).toBeVisible()

    const elapsedMs = Date.now() - startedAt
    expect(elapsedMs).toBeLessThan(5000)
})

test('@ops offline prolonged session remains usable after login', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Username').fill('prova')
    await page.getByLabel('Password').fill('Prova123!')
    await page.getByRole('button', { name: 'Accedi' }).click()

    await expect(page.getByText('Home')).toBeVisible()

    await page.context().setOffline(true)
    await page.waitForTimeout(2000)

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.locator('main')).toBeVisible()

    await page.getByRole('link', { name: 'Scorte' }).click()
    await expect(page.locator('main')).toBeVisible()

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.locator('main')).toBeVisible()

    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.locator('main')).toBeVisible()
})
