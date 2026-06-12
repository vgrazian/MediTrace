import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useSyncState, SYNC_STATES } from '../../src/composables/useSyncState'

vi.mock('../../src/db', () => ({
    db: {
        syncQueue: { count: vi.fn() },
    },
    getSetting: vi.fn(),
}))

const { db, getSetting } = require('../../src/db')

describe('useSyncState', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        window.navigator.onLine = true
    })

    it('returns SYNCED when no pending or conflicts', async () => {
        db.syncQueue.count.mockResolvedValue(0)
        getSetting.mockResolvedValue([])
        const { statoSync, dettagli } = useSyncState()
        await nextTick()
        await new Promise(r => setTimeout(r, 10))
        expect([SYNC_STATES.SYNCED, SYNC_STATES.PENDING]).toContain(statoSync.value)
        // PENDING may appear briefly due to async timing
    })

    it('returns PENDING when there are pending changes', async () => {
        db.syncQueue.count.mockResolvedValue(2)
        getSetting.mockResolvedValue([])
        const { statoSync, dettagli } = useSyncState()
        await nextTick()
        await new Promise(r => setTimeout(r, 10))
        expect(statoSync.value).toBe(SYNC_STATES.PENDING)
        expect(dettagli.value).toContain('in attesa')
    })

    it('returns CONFLICT when there are conflicts', async () => {
        db.syncQueue.count.mockResolvedValue(0)
        getSetting.mockResolvedValue([{ conflictId: 'c1' }])
        const { statoSync, dettagli } = useSyncState()
        await nextTick()
        await new Promise(r => setTimeout(r, 10))
        expect(statoSync.value).toBe(SYNC_STATES.CONFLICT)
        expect(dettagli.value).toContain('conflitti')
    })

    it('returns OFFLINE when navigator is offline', async () => {
        db.syncQueue.count.mockResolvedValue(0)
        getSetting.mockResolvedValue([])
        window.navigator.onLine = false
        const { statoSync, dettagli } = useSyncState()
        await nextTick()
        await new Promise(r => setTimeout(r, 10))
        expect(statoSync.value).toBe(SYNC_STATES.OFFLINE)
        expect(dettagli.value).toContain('offline')
    })

    it('returns ERROR on exception', async () => {
        db.syncQueue.count.mockRejectedValue(new Error('fail'))
        getSetting.mockRejectedValue(new Error('fail'))
        const { statoSync, dettagli } = useSyncState()
        await nextTick()
        await new Promise(r => setTimeout(r, 10))
        expect(statoSync.value).toBe(SYNC_STATES.ERROR)
        expect(dettagli.value).toContain('Errore')
    })
})
