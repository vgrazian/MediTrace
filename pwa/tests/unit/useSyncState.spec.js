import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSyncState, SYNC_STATES } from '../../src/composables/useSyncState'
import { db } from '../../src/db'

vi.mock('../../src/db', () => ({
    db: {
        syncQueue: { count: vi.fn() },
    },
}))

vi.mock('../../src/services/dataService', () => ({
    isDataServiceAvailable: () => true,
}))

describe('useSyncState', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        Object.defineProperty(window.navigator, 'onLine', {
            value: true,
            writable: true,
            configurable: true,
        })
    })

    it('returns ONLINE when no pending changes', async () => {
        db.syncQueue.count.mockResolvedValue(0)
        const { statoSync, updateSyncState } = useSyncState()
        await updateSyncState()
        expect(statoSync.value).toBe(SYNC_STATES.ONLINE)
    })

    it('returns PENDING when there are pending changes', async () => {
        db.syncQueue.count.mockResolvedValue(5)
        const { statoSync, updateSyncState } = useSyncState()
        await updateSyncState()
        expect(statoSync.value).toBe(SYNC_STATES.PENDING)
    })

    it('returns OFFLINE when navigator is offline', async () => {
        db.syncQueue.count.mockResolvedValue(0)
        Object.defineProperty(window.navigator, 'onLine', {
            value: false,
            writable: true,
            configurable: true,
        })
        const { statoSync, updateSyncState } = useSyncState()
        await updateSyncState()
        expect(statoSync.value).toBe(SYNC_STATES.OFFLINE)
    })

    it('returns ERROR on exception', async () => {
        db.syncQueue.count.mockRejectedValue(new Error('fail'))
        const { statoSync, updateSyncState } = useSyncState()
        await updateSyncState()
        expect(statoSync.value).toBe(SYNC_STATES.ERROR)
    })
})
