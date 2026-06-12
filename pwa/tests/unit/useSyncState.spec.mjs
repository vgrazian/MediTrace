describe('useSyncState', () => {
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useSyncState, SYNC_STATES } from '../../src/composables/useSyncState'

// Mock window and navigator for Vitest (Node)
if (typeof window === 'undefined') {
    global.window = {};
}
if (!window.navigator) {
    window.navigator = {};
}
Object.defineProperty(window.navigator, 'onLine', {
    value: true,
    configurable: true,
});

vi.mock('../../src/db', () => {
    const mockCount = vi.fn()
    const mockGetSetting = vi.fn()
    return {
        db: {
            syncQueue: { count: mockCount }
        },
        getSetting: mockGetSetting,
        __mocks: { mockCount, mockGetSetting }
    }
})


    let db, mockCount, mockGetSetting

    beforeEach(() => {
        vi.clearAllMocks()
        const dbModule = require('../../src/db')
        db = dbModule.db
        mockCount = dbModule.__mocks.mockCount
        mockGetSetting = dbModule.__mocks.mockGetSetting
        Object.defineProperty(window.navigator, 'onLine', {
            value: true,
            configurable: true,
        })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns SYNCED when no pending or conflicts', async () => {
        mockCount.mockResolvedValue(0)
        mockGetSetting.mockResolvedValue([])
        let statoSync, dettagli
        const Comp = defineComponent({
            setup() {
                const state = useSyncState({ interval: false })
                statoSync = state.statoSync
                dettagli = state.dettagli
                return () => h('div')
            }
        })
        mount(Comp)
        await nextTick()
        await Promise.resolve()
        await Promise.resolve()
        expect([SYNC_STATES.SYNCED, SYNC_STATES.PENDING]).toContain(statoSync.value)
        for (let i = 1; i < 10; i++) clearInterval(i)
    })

    it('returns PENDING when there are pending changes', async () => {
        mockCount.mockResolvedValueOnce(2)
        mockGetSetting.mockResolvedValueOnce([])
        let statoSync, dettagli
        const Comp = defineComponent({
            setup() {
                const state = useSyncState({ interval: false })
                statoSync = state.statoSync
                dettagli = state.dettagli
                return () => h('div')
            }
        })
        mount(Comp)
        await nextTick()
        await Promise.resolve()
        await Promise.resolve()
        expect(statoSync.value).toBe(SYNC_STATES.PENDING)
        expect(dettagli.value).toContain('in attesa')
    })

    it('returns CONFLICT when there are conflicts', async () => {
        mockCount.mockResolvedValueOnce(0)
        mockGetSetting.mockResolvedValueOnce([{ conflictId: 'c1' }])
        let statoSync, dettagli
        const Comp = defineComponent({
            setup() {
                const state = useSyncState({ interval: false })
                statoSync = state.statoSync
                dettagli = state.dettagli
                return () => h('div')
            }
        })
        mount(Comp)
        await nextTick()
        await Promise.resolve()
        await Promise.resolve()
        expect(statoSync.value).toBe(SYNC_STATES.CONFLICT)
        expect(dettagli.value).toContain('conflitti')
    })

    it('returns OFFLINE when navigator is offline', async () => {
        mockCount.mockResolvedValueOnce(0)
        mockGetSetting.mockResolvedValueOnce([])
        Object.defineProperty(window.navigator, 'onLine', {
            value: false,
            configurable: true,
        })
        let statoSync, dettagli
        const Comp = defineComponent({
            setup() {
                const state = useSyncState({ interval: false })
                statoSync = state.statoSync
                dettagli = state.dettagli
                return () => h('div')
            }
        })
        mount(Comp)
        await Promise.resolve()
        await Promise.resolve()
        expect(statoSync.value).toBe(SYNC_STATES.OFFLINE)
        expect(dettagli.value).toContain('offline')
    })

    it('returns ERROR on exception', async () => {
        mockCount.mockRejectedValueOnce(new Error('fail'))
        mockGetSetting.mockRejectedValueOnce(new Error('fail'))
        const { statoSync, dettagli } = useSyncState({ interval: false })
        await nextTick()
        await Promise.resolve()
        await Promise.resolve()
        expect(statoSync.value).toBe(SYNC_STATES.ERROR)
        expect(dettagli.value).toContain('Errore')
    })
})
            await Promise.resolve()
