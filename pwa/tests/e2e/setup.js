// Playwright test setup: clear IndexedDB before each test to ensure clean state
import { test as base } from '@playwright/test'

export const test = base.extend({
    page: async ({ page }, use) => {
        await page.goto('/')
        await page.evaluate(() => {
            if ('indexedDB' in window) {
                // Not all browsers support indexedDB.databases(), fallback to known DB name
                try {
                    window.indexedDB.deleteDatabase('medi-trace')
                } catch { }
            }
        })
        await use(page)
    },
})
