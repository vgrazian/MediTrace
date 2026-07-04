/**
 * Simplified login helper for production (remote BASE_URL) tests.
 * 
 * Remote pages behave differently from the local dev server:
 * - Multiple elements can match `getByRole('link', { name: 'Cruscotto' }).first()` (skip links, etc.)
 * - IndexedDB.clear + reload can be slow
 * - Timing issues with SPA hydration
 */
export async function loginProd(page, options = {}) {
    const {
        username = 'admin',
        password = 'A9m4K2qL!Xy',
        baseUrl = process.env.BASE_URL || 'https://vgrazian.github.io/MediTrace',
    } = options;

    // Navigate
    await page.goto(baseUrl + '/', { waitUntil: 'networkidle' }).catch(() => { });
    await page.waitForTimeout(1000);

    // Check if already authenticated
    const homeLink = page.getByRole('link', { name: 'Cruscotto' }).first();
    if (await homeLink.isVisible().catch(() => false)) {
        return;
    }

    // Wait for login form
    const usernameInput = page.locator('#username-input');
    try {
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
    } catch {
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
        } else {
            throw new Error('Login form not found on production page');
        }
    }

    // Fill and submit login form
    if (await usernameInput.isVisible().catch(() => false)) {
        await usernameInput.fill(username);
        await page.locator('#password-input').fill(password);
        await page.getByRole('button', { name: 'Accedi' }).click();
    }

    // Wait for authenticated UI
    await page.waitForLoadState('networkidle').catch(() => { });

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
        if (await homeLink.isVisible().catch(() => false)) return;
        await page.waitForTimeout(200);
    }

    throw new Error('Login produzione fallito: UI autenticata non visibile entro timeout');
}
