import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

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
    const loginHeading = page.getByRole('heading', { name: 'MediTrace' })
    const homeLink = page.getByRole('link', { name: 'Cruscotto' })
    await Promise.race([
        loginHeading.waitFor({ state: 'visible' }).catch(() => null),
        homeLink.waitFor({ state: 'visible' }).catch(() => null),
    ])
    await expect(loginHeading.or(homeLink)).toBeVisible()

    const elapsedMs = Date.now() - startedAt
    expect(elapsedMs).toBeLessThan(5000)
})

test('@ops offline prolonged session remains usable after login', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

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
