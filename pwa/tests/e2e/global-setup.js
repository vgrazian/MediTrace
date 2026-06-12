// Playwright global setup for ESM: clear IndexedDB before all tests
/** @type {import('@playwright/test').FullConfig} */
export default async function globalSetup(config) {
    // No-op: Vite dev server and IndexedDB are reset per test via test hooks.
    // If you need to seed or clean up, do it here.
}
