export async function loginOrRegisterSeededUser(page, {
    username = 'prova',
    password = 'Prova1234!',
    githubToken = 'github_pat_seeded',
} = {}) {
    const usernameInput = page.locator('#username-input')
    const registerUsernameInput = page.locator('#reg-username')
    const homeLink = page.getByRole('link', { name: 'Cruscotto' })
    const settingsLink = page.getByRole('link', { name: '⚙' })
    const loginError = page.locator('.login-error')

    async function isAuthenticatedUiVisible() {
        return (await settingsLink.isVisible().catch(() => false))
            || (await homeLink.isVisible().catch(() => false))
    }

    async function awaitAuthenticated(timeout = 9000) {
        await Promise.race([
            page.locator('main').waitFor({ state: 'visible', timeout }).catch(() => null),
            loginError.waitFor({ state: 'visible', timeout }).catch(() => null),
        ])
    }

    async function waitForAuthEntry(timeout = 12000) {
        await Promise.race([
            usernameInput.waitFor({ state: 'visible', timeout }).catch(() => null),
            registerUsernameInput.waitFor({ state: 'visible', timeout }).catch(() => null),
            homeLink.waitFor({ state: 'visible', timeout }).catch(() => null),
        ])
    }

    await waitForAuthEntry(12000)

    if (!(await usernameInput.isVisible()) && !(await registerUsernameInput.isVisible()) && !(await homeLink.isVisible())) {
        await page.waitForTimeout(500)
        await waitForAuthEntry(12000)
    }

    // Already authenticated (e.g. test calls helper twice in the same session).
    if (await isAuthenticatedUiVisible()) {
        return
    }

    if (await usernameInput.isVisible()) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            await usernameInput.fill(username)
            await page.locator('#password-input').fill(password)
            await page.getByRole('button', { name: 'Accedi' }).click()
            await page.waitForLoadState('load')
            await awaitAuthenticated(9000)
            if (await page.locator('main').isVisible()) break
            if (attempt === 1) break
        }
    } else if (await registerUsernameInput.isVisible()) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            await registerUsernameInput.fill(username)
            await page.locator('#reg-first-name').fill('Test')
            await page.locator('#reg-last-name').fill('Operator')
            await page.locator('#reg-email').fill(`${username}@example.com`)
            await page.locator('#reg-password').fill(password)
            await page.locator('#reg-confirm-password').fill(password)
            const githubTokenInput = page.locator('#reg-gh-token')
            const tokenDisabled = await githubTokenInput.isDisabled().catch(() => false)
            if (!tokenDisabled) {
                await githubTokenInput.fill(githubToken)
            }
            await page.getByRole('button', { name: 'Crea account e accedi' }).click()
            await page.waitForLoadState('load')
            await awaitAuthenticated(9000)
            if (await page.locator('main').isVisible()) break
            if (attempt === 1) break
        }
    }

    if (await loginError.isVisible()) {
        throw new Error(`Login E2E fallito: ${await loginError.textContent()}`)
    }

    await page.waitForLoadState('networkidle')

    // CI-safe final gate: authentication is confirmed by app nav links.
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
        if (await isAuthenticatedUiVisible()) return
        await page.waitForTimeout(200)
    }

    throw new Error('Login E2E fallito: UI autenticata non visibile entro timeout')
}