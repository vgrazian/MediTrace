import { test, expect } from '@playwright/test'

// Percorsi e testi in italiano coerenti con la UI
const SYNC_SELECTOR = '.sync-indicator'

// Helper per simulare offline
async function goOffline(page) {
    await page.route('**/*', route => route.abort())
}

test.describe('Indicatore stato sincronizzazione', () => {
    test('Mostra "Sincronizzato" quando tutto è aggiornato', async ({ page }) => {
        await page.goto('/')
        await page.waitForSelector(SYNC_SELECTOR)
        const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
        expect(tooltip).toContain('Tutti i dati sono sincronizzati')
    })

    test('Mostra "In attesa" se ci sono modifiche da sincronizzare', async ({ page }) => {
        await page.goto('/')
        // Simula una modifica in coda
        await page.evaluate(() => window.db && window.db.syncQueue.add({ entityType: 'hosts', entityId: 'test', operation: 'upsert', createdAt: new Date().toISOString() }))
        await page.waitForTimeout(2100)
        const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
        expect(tooltip).toContain('in attesa')
    })

    test('Mostra "Conflitto" se ci sono conflitti', async ({ page }) => {
        await page.goto('/')
        // Simula conflitto
        await page.evaluate(() => window.db && window.db.settings.put({ key: 'pendingConflicts', value: [{ conflictId: 'c1' }] }))
        await page.waitForTimeout(2100)
        const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
        expect(tooltip).toContain('conflitti da risolvere')
    })

    test('Mostra "Offline" se il browser è offline', async ({ page, context }) => {
        await page.goto('/')
        await context.setOffline(true)
        await page.waitForTimeout(2100)
        const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
        expect(tooltip).toContain('offline')
        await context.setOffline(false)
    })
})
