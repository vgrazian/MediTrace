import { expect, test } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('mobile deep panel and breadcrumb close on Ospiti', async ({ page }) => {
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

    await page.setViewportSize({ width: 390, height: 780 })
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    await page.getByRole('button', { name: 'Aggiungi' }).click()

    const panel = page.locator('details.deep-panel[open]').first()
    await expect(panel).toBeVisible()
    await expect(page.getByText('Ospiti', { exact: true }).first()).toBeVisible()

    const pos = await panel.evaluate(el => window.getComputedStyle(el).position)
    expect(pos).toBe('fixed')

    await page.getByRole('button', { name: 'Chiudi' }).first().click()
    await expect(page.locator('details.deep-panel[open]')).toHaveCount(0)
})
