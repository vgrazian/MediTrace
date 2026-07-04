/**
 * Simplified login helper for Playwright e2e tests.
 * Works with both local dev server and remote production (GitHub Pages).
 */
export async function loginOrRegisterSeededUser(page, options = {}) {
    const {
        username = 'admin',
        password = 'A9m4K2qL!Xy',
    } = options;

    // Navigate to app
    const targetUrl = process.env.BASE_URL ? process.env.BASE_URL + '/' : '/';
    await page.goto(targetUrl, { waitUntil: 'networkidle' }).catch(() => { });
    await page.waitForTimeout(1000);

    // Already authenticated?
    const homeLink = page.getByRole('link', { name: 'Cruscotto' }).first();
    if (await homeLink.isVisible().catch(() => false)) return;

    // Wait for login form (up to 10s)
    const usernameInput = page.locator('#username-input');
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { });

    if (await usernameInput.isVisible()) {
        await usernameInput.fill(username);
        await page.locator('#password-input').fill(password);
        await page.getByRole('button', { name: 'Accedi' }).click();
    } else {
        // Try registration form
        const regInput = page.locator('#reg-username');
        if (await regInput.isVisible().catch(() => false)) {
            await regInput.fill(username);
            await page.locator('#reg-first-name').fill('Test');
            await page.locator('#reg-last-name').fill('Operator');
            await page.locator('#reg-email').fill(`${username}@example.com`);
            await page.locator('#reg-password').fill(password);
            await page.locator('#reg-confirm-password').fill(password);
            await page.getByRole('button', { name: /Crea account/i }).click();
        }
    }

    // Wait for authenticated UI — SPA hydration
    await page.waitForLoadState('networkidle').catch(() => { });
    // Wait for nav to be present (indicates full SPA render)
    await page.locator('nav').waitFor({ state: 'visible', timeout: 10000 }).catch(() => { });

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
        if (await homeLink.isVisible().catch(() => false)) return;
        if (await page.locator('main').isVisible().catch(() => false)) {
            await page.waitForTimeout(1000);
            if (await homeLink.isVisible().catch(() => false)) return;
            return;
        }
        await page.waitForTimeout(200);
    }

    throw new Error('Login E2E fallito: UI autenticata non visibile entro timeout');
}
