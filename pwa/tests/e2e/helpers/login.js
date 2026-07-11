export async function loginOrRegisterSeededUser(page, options = {}) {
    const { username = 'admin', password = 'A9m4K2qL!Xy' } = options
    const baseUrl = process.env.BASE_URL ? process.env.BASE_URL + '/' : '/'

    await page.goto(baseUrl)
    await page.evaluate(() => {
        localStorage.clear(); sessionStorage.clear()
        return new Promise(r => { const req = indexedDB.deleteDatabase('meditrace'); req.onsuccess = r; req.onerror = r; setTimeout(r, 1500) })
    })
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const homeLink = page.getByRole('link', { name: 'Cruscotto' }).first()
    if (await homeLink.isVisible().catch(() => false)) return

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
        const uname = page.locator('#username-input')
        if (await uname.isVisible({ timeout: 5000 }).catch(() => false)) {
            await uname.fill(username)
            await page.locator('#password-input').fill(password)
            await page.getByRole('button', { name: 'Accedi' }).click()
        }
    }

    await page.waitForLoadState('networkidle').catch(() => {})
    await page.locator('nav').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})

    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
        if (await homeLink.isVisible().catch(() => false)) return
        if (await page.locator('main').isVisible().catch(() => false)) { await page.waitForTimeout(1000); if (await homeLink.isVisible().catch(() => false)) return; return }
        await page.waitForTimeout(200)
    }
    throw new Error('Login E2E fallito')
}
