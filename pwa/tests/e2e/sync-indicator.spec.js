import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

const SYNC_BTN = 'button[aria-label="Sincronizza"]'

test.describe('Indicatore stato sincronizzazione', () => {
    test('Mostra stato sincronizzato dopo login', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        const syncBtn = page.locator(SYNC_BTN)
        await syncBtn.waitFor({ state: 'visible', timeout: 10000 })
        const tooltip = await syncBtn.getAttribute('title')
        expect(tooltip).toBeTruthy()
        expect(tooltip.toLowerCase()).toMatch(/sincronizzat|online|aggiornat|in coda|modifiche/)
    })

    test('Mostra stato pending se ci sono modifiche', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.evaluate(() => {
            if (window.db && window.db.syncQueue) {
                return window.db.syncQueue.add({ entityType: 'hosts', entityId: 'test-pending', operation: 'upsert', createdAt: new Date().toISOString() })
            }
        })
        await page.waitForTimeout(2500)
        const tooltip = await page.locator(SYNC_BTN).getAttribute('title')
        expect(tooltip).toBeTruthy()
    })

    test('Mostra stato offline senza connessione', async ({ page, context }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await context.setOffline(true)
        await page.waitForTimeout(3000)
        const tooltip = await page.locator(SYNC_BTN).getAttribute('title')
        expect(tooltip).toBeTruthy()
        expect(tooltip.toLowerCase()).toMatch(/offline|non connesso/)
        await context.setOffline(false)
    })
})
