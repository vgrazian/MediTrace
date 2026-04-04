import { describe, it, expect, vi, beforeEach } from 'vitest'

const data = {
    reminders: [],
    pendingSync: 0,
    datasetVersion: 4,
    lastSyncAt: '2026-04-04T08:15:00.000Z',
}

vi.mock('../../src/db', () => ({
    db: {
        reminders: { async toArray() { return data.reminders } },
        syncQueue: { async count() { return data.pendingSync } },
    },
    getSetting: async () => data.datasetVersion,
    getSyncState: async () => data.lastSyncAt,
}))

vi.mock('../../src/services/reporting', () => ({
    buildOperationalReport: async () => ({
        summary: {
            totalDrugs: 8,
            critical: 2,
            high: 3,
            medium: 1,
            ok: 2,
        },
    }),
}))

import { buildHomeDashboardKpis, homeDashboardTestUtils } from '../../src/services/homeDashboard'

describe('home dashboard kpis', () => {
    beforeEach(() => {
        data.reminders = [
            { id: 'r1', scheduledAt: '2026-04-04T07:00:00.000Z', stato: 'DA_ESEGUIRE' },
            { id: 'r2', scheduledAt: '2026-04-04T12:00:00.000Z', stato: 'ESEGUITO' },
            { id: 'r3', scheduledAt: '2026-04-05T12:00:00.000Z', stato: 'DA_ESEGUIRE' },
        ]
        data.pendingSync = 5
        data.datasetVersion = 7
        data.lastSyncAt = '2026-04-04T08:15:00.000Z'
    })

    it('builds combined home dashboard metrics', async () => {
        const kpi = await buildHomeDashboardKpis(new Date('2026-04-04T15:00:00.000Z'))

        expect(kpi.datasetVersion).toBe(7)
        expect(kpi.pendingSync).toBe(5)
        expect(kpi.stockCritical).toBe(2)
        expect(kpi.stockHigh).toBe(3)
        expect(kpi.monitoredDrugs).toBe(8)

        expect(kpi.remindersToday).toBe(2)
        expect(kpi.remindersPending).toBe(1)
        expect(kpi.remindersDone).toBe(1)
    })

    it('exposes day boundary helpers', () => {
        const date = new Date('2026-04-04T15:00:00.000Z')
        const start = homeDashboardTestUtils.startOfDay(date)
        const end = homeDashboardTestUtils.endOfDay(date)

        expect(start.getHours()).toBe(0)
        expect(start.getMinutes()).toBe(0)
        expect(end.getHours()).toBe(23)
    })
})
