// Playwright test setup: clear IndexedDB before each test to ensure clean state
import { test as base } from '@playwright/test'

export const test = base.extend({
    page: async ({ page }, use) => {
        // Clear IndexedDB BEFORE navigating to avoid DatabaseClosedError
        await page.evaluate(() => {
            if ('indexedDB' in window) {
                try { window.indexedDB.deleteDatabase('medi-trace'); } catch { }
            }
        })
        await page.goto('/')
        await use(page)
    },
})
