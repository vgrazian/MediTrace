import { expect } from '@playwright/test'

export async function loginOrRegisterSeededUser(page, {
    username = 'prova',
    password = 'Prova123!',
    githubToken = 'github_pat_seeded',
} = {}) {
    const usernameInput = page.locator('#username-input')
    const registerUsernameInput = page.locator('#reg-username')
    const homeLink = page.getByRole('link', { name: 'Home' })

    await Promise.race([
        usernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
        registerUsernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
        homeLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    ])

    if (await usernameInput.isVisible()) {
        await usernameInput.fill(username)
        await page.locator('#password-input').fill(password)
        await page.getByRole('button', { name: 'Accedi' }).click()
    } else if (await registerUsernameInput.isVisible()) {
        await registerUsernameInput.fill(username)
        await page.locator('#reg-password').fill(password)
        await page.locator('#reg-confirm-password').fill(password)
        await page.locator('#reg-gh-token').fill(githubToken)
        await page.getByRole('button', { name: 'Crea account e accedi' }).click()
    }

    await expect(page.locator('main')).toBeVisible()
}