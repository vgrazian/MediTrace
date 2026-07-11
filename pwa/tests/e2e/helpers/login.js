/**
 * Simplified login helper for Playwright e2e tests.
 * Clears all storage first to force fresh Supabase query, then registers or logs in.
 */
export async function loginOrRegisterSeededUser(page, options = {}) {
    const {
        username = 'admin',
        password = 'A9m4K2qL!Xy',
    } = options;

    const baseUrl = process.env.BASE_URL ? process.env.BASE_URL + '/' : '/'

    // Pulisci tutto lo storage per forzare la app a ricontrollare Supabase
    await page.goto(baseUrl)
    await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
        return new Promise((resolve) => {
            const req = indexedDB.deleteDatabase('meditrace')
            req.onsuccess = () => resolve()
            req.onerror = () => resolve()
            setTimeout(() => resolve(), 2000)
        })
    })

    // Ricarica pulita
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Already authenticated?
    const homeLink = page.getByRole('link', { name: 'Cruscotto' }).first()
    if (await homeLink.isVisible().catch(() => false)) return

    // Prova registrazione (app mostra questo form se 0 profili in Supabase)
    const regInput = page.locator('#reg-username')
    if (await regInput.isVisible({ timeout: 8000 }).catch(() => false)) {
        await regInput.fill(username)
        await page.locator('#reg-first-name').fill('Admin')
        await page.locator('#reg-last-name').fill('MediTrace')
        await page.locator('#reg-email').fill(`${username}@meditrace.app`)
        await page.locator('#reg-password').fill(password)
        await page.locator('#reg-confirm-password').fill(password)
        await page.getByRole('button', { name: /Crea account/i }).click()
    } else {
        // Fallback: prova login
        const usernameInput = page.locator('#username-input')
        if (await usernameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await usernameInput.fill(username)
            await page.locator('#password-input').fill(password)
            await page.getByRole('button', { name: 'Accedi' }).click()
        }
    }

    // Wait for authenticated UI
    await page.waitForLoadState('networkidle').catch(() => { })
    await page.locator('nav').waitFor({ state: 'visible', timeout: 15000 }).catch(() => { })

    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
        if (await homeLink.isVisible().catch(() => false)) return
        if (await page.locator('main').isVisible().catch(() => false)) {
            await page.waitForTimeout(1000)
            if (await homeLink.isVisible().catch(() => false)) return
            return
        }
        await page.waitForTimeout(200)
    }

    throw new Error('Login E2E fallito: UI autenticata non visibile entro timeout')
}
