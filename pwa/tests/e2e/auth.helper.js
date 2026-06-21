/**
 * E2E Auth Helper — login/logout for Playwright tests.
 *
 * Uses the local auth system (IndexedDB-backed, no Supabase needed).
 * Credentials: dev seed account + default operators from auth.js
 */

const CREDENTIALS = {
    admin: { username: 'test', password: 'A7!vQ2#kLp9zXw4$eRt6@bY8^sJ0uH3m' },
    valerio: { username: 'valerio', password: 'V@lerio123!' },
    anna: { username: 'anna', password: 'Anna@456!Xy' },
}

/**
 * Navigate to the app and log in with the given credentials.
 * The app uses an in-App.vue login screen (not a separate route).
 * After login, the user stays on /#/ and the router-view renders.
 */
export async function login(page, user = 'admin') {
    const creds = CREDENTIALS[user]
    if (!creds) throw new Error(`Unknown test user: ${user}`)

    // Force a clean page load
    await page.goto('/#/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Wait for the login form
    await page.waitForSelector('#username-input, #reg-username, button:has-text("Accedi")', { timeout: 15_000 })

    // Check if we need to register first (no users exist)
    const regBtn = page.locator('button:has-text("Crea account")')
    if (await regBtn.isVisible({ timeout: 3000 })) {
        await page.locator('#reg-username').fill(creds.username)
        await page.locator('#reg-first-name').fill('Test')
        await page.locator('#reg-last-name').fill('Admin')
        await page.locator('#reg-email').fill('test@meditrace.local')
        await page.locator('#reg-password').fill(creds.password)
        await page.locator('#reg-confirm-password').fill(creds.password)
        await regBtn.click()
    } else {
        await page.locator('#username-input').fill(creds.username)
        await page.locator('#password-input').fill(creds.password)
        await page.locator('button:has-text("Accedi")').click()
    }

    // Wait for app nav to appear (authenticated)
    await page.waitForSelector('.app-nav', { timeout: 15_000 })
    await page.waitForTimeout(2000)
}

/**
 * Log out: click Logout, confirm, then force-reload the login page.
 */
export async function logout(page) {
    const logoutBtn = page.locator('button:has-text("Logout")').first()
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click()
        await page.waitForTimeout(500)

        const confirmBtn = page.locator('button:has-text("Esci")').first()
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await confirmBtn.click()
            await page.waitForTimeout(1000)
        }
    }
    // Force a clean load so the login screen is fresh
    await page.goto('/#/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
}
export async function selectResidenza(page, residenzaLabel) {
    // Click the residence badge
    const badge = page.locator('.residenza-badge').first()
    await badge.click()

    // Click the target residence in dropdown
    const item = page.locator('.residenza-dropdown-item', { hasText: residenzaLabel }).first()
    await item.click()

    // Wait for data reload
    await page.waitForTimeout(2000)
}

/**
 * Generate demo data via the Impostazioni page.
 */
export async function generateDemoData(page) {
    await page.goto('/#/impostazioni', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Look for demo data button
    const genBtn = page.locator('button:has-text("Genera"), button:has-text("Dati demo"), button:has-text("demo")').first()
    if (await genBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await genBtn.click()
        await page.waitForTimeout(4000)
        return true
    }
    return false
}

/**
 * Navigate to a view and wait for it to load.
 */
export async function goToView(page, viewPath) {
    await page.goto(`/#/${viewPath}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
}

export { CREDENTIALS }
