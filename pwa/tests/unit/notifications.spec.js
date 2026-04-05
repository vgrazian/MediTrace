import { describe, expect, it } from 'vitest'
import {
    computeNotifiableReminders,
    computeUpcomingReminders24h,
    getNotificationStatusSnapshot,
    notificationsTestUtils,
} from '../../src/services/notifications'

describe('notifications service', () => {
    it('selects pending reminders due within look-ahead window and not yet notified', () => {
        const now = Date.parse('2026-04-04T12:00:00.000Z')
        const reminders = [
            {
                id: 'r-1',
                scheduledAt: '2026-04-04T12:05:00.000Z',
                stato: 'DA_ESEGUIRE',
            },
            {
                id: 'r-2',
                scheduledAt: '2026-04-04T12:20:00.000Z',
                stato: 'DA_ESEGUIRE',
            },
            {
                id: 'r-3',
                scheduledAt: '2026-04-04T11:55:00.000Z',
                stato: 'SOMMINISTRATO',
            },
            {
                id: 'r-4',
                scheduledAt: '2026-04-04T12:03:00.000Z',
                stato: 'POSTICIPATO',
            },
        ]

        const result = computeNotifiableReminders({
            reminders,
            notifiedIds: { 'r-4': now },
            now,
            lookAheadMinutes: 10,
        })

        expect(result.map(item => item.id)).toEqual(['r-1'])
    })

    it('returns reminders ordered by nearest schedule first', () => {
        const now = Date.parse('2026-04-04T12:00:00.000Z')
        const reminders = [
            { id: 'r-2', scheduledAt: '2026-04-04T12:07:00.000Z', stato: 'DA_ESEGUIRE' },
            { id: 'r-1', scheduledAt: '2026-04-04T12:01:00.000Z', stato: 'DA_ESEGUIRE' },
            { id: 'r-3', scheduledAt: '2026-04-04T12:04:00.000Z', stato: 'POSTICIPATO' },
        ]

        const result = computeNotifiableReminders({
            reminders,
            notifiedIds: [],
            now,
            lookAheadMinutes: 10,
        })

        expect(result.map(item => item.id)).toEqual(['r-1', 'r-3', 'r-2'])
    })

    it('respects repeat cooldown before re-notifying the same reminder', () => {
        const now = Date.parse('2026-04-04T12:00:00.000Z')
        const reminders = [
            { id: 'r-1', scheduledAt: '2026-04-04T12:01:00.000Z', stato: 'DA_ESEGUIRE' },
        ]

        const coolingDown = computeNotifiableReminders({
            reminders,
            notifiedIds: { 'r-1': now - (30 * 60 * 1000) },
            now,
            lookAheadMinutes: 10,
            repeatCooldownMinutes: 120,
        })

        const allowedAgain = computeNotifiableReminders({
            reminders,
            notifiedIds: { 'r-1': now - (3 * 60 * 60 * 1000) },
            now,
            lookAheadMinutes: 10,
            repeatCooldownMinutes: 120,
        })

        expect(coolingDown).toEqual([])
        expect(allowedAgain.map(item => item.id)).toEqual(['r-1'])
    })

    it('returns unsupported snapshot when Notification API is unavailable', () => {
        const status = getNotificationStatusSnapshot()
        expect(status.supported).toBe(false)
        expect(status.permission).toBe('unsupported')
        expect(status.enabled).toBe(false)
    })

    it('exposes deterministic helper behavior for parsing and dedup windows', () => {
        expect(Number.isNaN(notificationsTestUtils.toMillis('not-a-date'))).toBe(true)
        expect(notificationsTestUtils.toMillis('2026-04-04T12:00:00.000Z')).toBeGreaterThan(0)

        expect(notificationsTestUtils.isReminderPending({ stato: 'DA_ESEGUIRE' })).toBe(true)
        expect(notificationsTestUtils.isReminderPending({ stato: 'SOMMINISTRATO' })).toBe(false)
        expect(notificationsTestUtils.normalizePermission('weird-value')).toBe('default')

        const normalized = notificationsTestUtils.normalizeReminderNotificationsState(['a', 'b'])
        expect(normalized).toEqual({ a: 0, b: 0 })

        const merged = notificationsTestUtils.mergeReminderNotificationState({ a: 10, stale: 1 }, ['c'], 10 + (2 * 60 * 60 * 1000))
        expect(merged.c).toBeGreaterThan(0)

        const pruned = notificationsTestUtils.pruneReminderNotificationsMap({ keep: Date.parse('2026-04-04T11:00:00.000Z'), old: Date.parse('2026-04-02T11:00:00.000Z') }, Date.parse('2026-04-04T12:00:00.000Z'), 24)
        expect(pruned).toEqual({ keep: Date.parse('2026-04-04T11:00:00.000Z') })
        expect(notificationsTestUtils.buildReminderRoute('rem-1')).toBe('/promemoria?highlight=rem-1')
    })

    it('computes upcoming pending reminders within 24h with host and drug labels', () => {
        const now = Date.parse('2026-04-04T08:00:00.000Z')
        const rows = computeUpcomingReminders24h({
            now,
            reminders: [
                {
                    id: 'rem-1',
                    hostId: 'host-1',
                    therapyId: 'therapy-1',
                    scheduledAt: '2026-04-04T10:00:00.000Z',
                    stato: 'DA_ESEGUIRE',
                },
                {
                    id: 'rem-2',
                    hostId: 'host-2',
                    therapyId: 'therapy-2',
                    scheduledAt: '2026-04-05T09:00:00.000Z',
                    stato: 'ESEGUITO',
                },
                {
                    id: 'rem-3',
                    hostId: 'host-1',
                    therapyId: 'therapy-1',
                    scheduledAt: '2026-04-06T09:00:00.000Z',
                    stato: 'DA_ESEGUIRE',
                },
            ],
            hosts: [
                { id: 'host-1', nome: 'Mario', cognome: 'Rossi', codiceInterno: 'OSP-1' },
                { id: 'host-2', nome: 'Anna', cognome: 'Bianchi', codiceInterno: 'OSP-2' },
            ],
            therapies: [
                { id: 'therapy-1', drugId: 'drug-1' },
                { id: 'therapy-2', drugId: 'drug-2' },
            ],
            drugs: [
                { id: 'drug-1', principioAttivo: 'Paracetamolo' },
                { id: 'drug-2', principioAttivo: 'Ramipril' },
            ],
        })

        expect(rows).toHaveLength(1)
        expect(rows[0].id).toBe('rem-1')
        expect(rows[0].hostLabel).toBe('Rossi Mario')
        expect(rows[0].drugLabel).toBe('Paracetamolo')
    })
})
