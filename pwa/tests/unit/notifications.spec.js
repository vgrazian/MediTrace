import { describe, expect, it } from 'vitest'
import { computeNotifiableReminders } from '../../src/services/notifications'

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
            notifiedIds: ['r-4'],
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
})
