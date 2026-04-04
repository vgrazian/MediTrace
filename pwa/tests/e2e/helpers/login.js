import { expect } from '@playwright/test'

export async function loginOrRegisterSeededUser(page, {
    username = 'prova',
    password = 'Prova123!',
    githubToken = 'github_pat_seeded',
} = {}) {
    const usernameInput = page.locator('#username-input')
    const registerUsernameInput = page.locator('#reg-username')
    const homeLink = page.getByRole('link', { name: 'Cruscotto' })
    const settingsLink = page.getByRole('link', { name: '⚙' })
    const loginError = page.locator('.login-error')

    async function awaitAuthenticated(timeout = 8000) {
        await Promise.race([
            page.locator('main').waitFor({ state: 'visible', timeout }).catch(() => null),
            loginError.waitFor({ state: 'visible', timeout }).catch(() => null),
        ])
    }

    await Promise.race([
        usernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
        registerUsernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
        homeLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    ])

    if (await usernameInput.isVisible()) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            await usernameInput.fill(username)
            await page.locator('#password-input').fill(password)
            await page.getByRole('button', { name: 'Accedi' }).click()
            await awaitAuthenticated(7000)
            if (await page.locator('main').isVisible()) break
            if (attempt === 1) break
        }
    } else if (await registerUsernameInput.isVisible()) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            await registerUsernameInput.fill(username)
            await page.locator('#reg-password').fill(password)
            await page.locator('#reg-confirm-password').fill(password)
            await page.locator('#reg-gh-token').fill(githubToken)
            await page.getByRole('button', { name: 'Crea account e accedi' }).click()
            await awaitAuthenticated(7000)
            if (await page.locator('main').isVisible()) break
            if (attempt === 1) break
        }
    }

    if (await loginError.isVisible()) {
        throw new Error(`Login E2E fallito: ${await loginError.textContent()}`)
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
    await expect(settingsLink).toBeVisible({ timeout: 10000 })
}