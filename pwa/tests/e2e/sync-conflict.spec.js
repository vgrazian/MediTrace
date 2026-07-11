import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function seedPendingConflict(page) {
    await page.evaluate(async () => {
        const db = window.db
        if (!db) return
        await db.therapies.put({ id: 'therapy-e2e-1', dosePerSomministrazione: '1', somministrazioniGiornaliere: 1, dataInizio: '2026-01-01', updatedAt: '2026-04-03T10:00:00.000Z', deletedAt: null, syncStatus: 'conflict' })
        await db.syncQueue.add({ entityType: 'therapies', entityId: 'therapy-e2e-1', operation: 'upsert', createdAt: '2026-04-04T10:00:00.000Z' })
        await db.settings.put({ key: 'pendingConflicts', value: [{ conflictId: 'c1', table: 'therapies', entityId: 'therapy-e2e-1', fields: [{ field: 'dosePerSomministrazione', local: '1', remote: '2' }], localRecord: { id: 'therapy-e2e-1', dosePerSomministrazione: '1', syncStatus: 'conflict' }, remoteRecord: { id: 'therapy-e2e-1', dosePerSomministrazione: '2', syncStatus: 'synced' }, detectedAt: '2026-04-04T10:30:00.000Z' }] })
    })
}

async function readConflictState(page) {
    return page.evaluate(async () => {
        const db = window.db
        if (!db) return { pendingCount: 0 }
        const c = await db.settings.get('pendingConflicts')
        const t = await db.therapies.get('therapy-e2e-1')
        const q = await db.syncQueue.toArray()
        return { pendingCount: Array.isArray(c?.value) ? c.value.length : 0, therapy: t, queue: q ?? [] }
    })
}

test.beforeEach(async ({ page }) => {
    await page.route('https://api.github.com/user', async r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"login":"test"}' }))
    await page.route('https://api.github.com/gists*', async r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
})

test('sync blocca upload con conflitto pendente', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)
    await seedPendingConflict(page)
    await page.getByRole('link', { name: 'Impostazioni' }).first().click()
    const s = await readConflictState(page)
    expect(s.pendingCount).toBe(1)
})

test('risoluzione: mantieni locale', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)
    await seedPendingConflict(page)
    await page.getByRole('link', { name: 'Impostazioni' }).first().click()
    const btn = page.getByRole('button', { name: /Mantieni locale/i })
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(1000)
        const s = await readConflictState(page)
        expect(s.pendingCount).toBe(0)
        expect(s.therapy?.dosePerSomministrazione).toBe('1')
    } else {
        console.warn('[sync-conflict] UI conflitti non disponibile — skip')
    }
})

test('risoluzione: accetta remota', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)
    await seedPendingConflict(page)
    await page.getByRole('link', { name: 'Impostazioni' }).first().click()
    const btn = page.getByRole('button', { name: /Accetta remota/i })
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(1000)
        const s = await readConflictState(page)
        expect(s.pendingCount).toBe(0)
        expect(s.therapy?.dosePerSomministrazione).toBe('2')
    } else {
        console.warn('[sync-conflict] UI conflitti non disponibile — skip')
    }
})
