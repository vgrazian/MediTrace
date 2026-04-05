import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildReminderRows, reminderStateBadge, startOfDay, endOfDay, REMINDER_OUTCOMES } from '../../src/services/promemoria'

// ── Mock db — needed for markReminder side-effect tests ──────────────────────

const dbReminders = new Map()
const activityLogRows = []
const enqueueCalls = []

vi.mock('../../src/db', () => ({
    db: {
        reminders: {
            async get(id) { return dbReminders.get(id) ?? undefined },
            async put(row) { dbReminders.set(row.id, row) },
        },
        syncQueue: { async add() { } },
        activityLog: { async add(row) { activityLogRows.push(row) } },
        async transaction(_mode, ...args) {
            const callback = args.at(-1)
            await callback()
        },
    },
    async enqueue(entityType, entityId, operation = 'upsert') {
        enqueueCalls.push({ entityType, entityId, operation })
    },
    async getSetting(_key, fallback = null) { return fallback },
}))

import { markReminder } from '../../src/services/promemoria'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-04T14:00:00.000Z')

const HOSTS = [
    { id: 'h1', codiceInterno: 'OSP-01', roomId: 1, bedId: 1, deletedAt: null },
    { id: 'h2', codiceInterno: 'OSP-02', roomId: 2, bedId: 2, deletedAt: null },
]

const DRUGS = [
    { id: 'd1', principioAttivo: 'Paracetamolo', deletedAt: null },
    { id: 'd2', principioAttivo: 'Ibuprofene', deletedAt: null },
]

const THERAPIES = [
    { id: 't1', hostId: 'h1', drugId: 'd1', deletedAt: null },
    { id: 't2', hostId: 'h2', drugId: 'd2', deletedAt: null },
]

const REMINDERS_TODAY = [
    { id: 'r1', hostId: 'h1', therapyId: 't1', drugId: 'd1', scheduledAt: '2026-04-04T08:00:00.000Z', stato: 'ESEGUITO', deletedAt: null },
    { id: 'r2', hostId: 'h1', therapyId: 't1', drugId: 'd1', scheduledAt: '2026-04-04T20:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: null },
    { id: 'r3', hostId: 'h2', therapyId: 't2', drugId: 'd2', scheduledAt: '2026-04-04T07:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: null },
]

const REMINDERS_TOMORROW = [
    { id: 'r4', hostId: 'h1', therapyId: 't1', drugId: 'd1', scheduledAt: '2026-04-05T08:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: null },
]

const ALL_REMINDERS = [...REMINDERS_TODAY, ...REMINDERS_TOMORROW]

function resetState() {
    dbReminders.clear()
    activityLogRows.length = 0
    enqueueCalls.length = 0
}

// ── buildReminderRows ─────────────────────────────────────────────────────────

describe('buildReminderRows', () => {
    it('adds hostLabel and drugLabel based on IDs', () => {
        const rows = buildReminderRows({ reminders: REMINDERS_TODAY, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: 'all', now: NOW })
        const r1 = rows.find(r => r.id === 'r1')
        expect(r1.hostLabel).toBe('OSP-01')
        expect(r1.stanzaLetto).toBe('1/1')
        expect(r1.drugLabel).toBe('Paracetamolo')
    })

    it('filters to today only by default', () => {
        const rows = buildReminderRows({ reminders: ALL_REMINDERS, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: 'today', now: NOW })
        expect(rows.every(r => r.scheduledAt.startsWith('2026-04-04'))).toBe(true)
        expect(rows.some(r => r.id === 'r4')).toBe(false)
    })

    it('returns all reminders when dateFilter is "all"', () => {
        const rows = buildReminderRows({ reminders: ALL_REMINDERS, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: 'all', now: NOW })
        expect(rows).toHaveLength(4)
    })

    it('filters by specific YYYY-MM-DD date', () => {
        const rows = buildReminderRows({ reminders: ALL_REMINDERS, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: '2026-04-05', now: NOW })
        expect(rows).toHaveLength(1)
        expect(rows[0].id).toBe('r4')
    })

    it('sorts by scheduledAt ascending', () => {
        const rows = buildReminderRows({ reminders: ALL_REMINDERS, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: 'today', now: NOW })
        const times = rows.map(r => new Date(r.scheduledAt).getTime())
        expect(times).toEqual([...times].sort((a, b) => a - b))
    })

    it('filters by stato', () => {
        const rows = buildReminderRows({ reminders: REMINDERS_TODAY, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: 'all', stateFilter: 'DA_ESEGUIRE', now: NOW })
        expect(rows.every(r => r.stato === 'DA_ESEGUIRE')).toBe(true)
        expect(rows.some(r => r.id === 'r1')).toBe(false)
    })

    it('excludes soft-deleted reminders', () => {
        const withDeleted = [...REMINDERS_TODAY, { id: 'rd', hostId: 'h1', therapyId: 't1', scheduledAt: '2026-04-04T09:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: '2026-04-04T10:00:00.000Z' }]
        const rows = buildReminderRows({ reminders: withDeleted, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: 'all', now: NOW })
        expect(rows.some(r => r.id === 'rd')).toBe(false)
    })

    it('falls back to hostId and drugId when labels not found', () => {
        const rows = buildReminderRows({ reminders: REMINDERS_TODAY, hosts: [], drugs: [], therapies: [], dateFilter: 'all', now: NOW })
        // r3 (07:00) sorts first; all rows should have raw IDs as fallback labels
        expect(rows.every(r => typeof r.hostLabel === 'string' && r.hostLabel.length > 0)).toBe(true)
        const r1Row = rows.find(r => r.id === 'r1')
        expect(r1Row.hostLabel).toBe('h1')
        expect(r1Row.drugLabel).toBe('d1')
    })

    it('defaults stato to DA_ESEGUIRE when missing', () => {
        const noState = [{ id: 'rx', hostId: 'h1', therapyId: 't1', scheduledAt: '2026-04-04T10:00:00.000Z', deletedAt: null }]
        const rows = buildReminderRows({ reminders: noState, hosts: HOSTS, drugs: DRUGS, therapies: THERAPIES, dateFilter: 'all', now: NOW })
        expect(rows[0].stato).toBe('DA_ESEGUIRE')
    })
})

// ── reminderStateBadge ────────────────────────────────────────────────────────

describe('reminderStateBadge', () => {
    it.each([
        ['ESEGUITO', 'state-ok'],
        ['SALTATO', 'state-skip'],
        ['POSTICIPATO', 'state-warn'],
        ['DA_ESEGUIRE', 'state-pending'],
        ['UNKNOWN', 'state-pending'],
    ])('maps %s → %s', (stato, expected) => {
        expect(reminderStateBadge(stato)).toBe(expected)
    })
})

// ── Day boundary helpers ──────────────────────────────────────────────────────

describe('startOfDay / endOfDay', () => {
    it('startOfDay zeroes time to midnight', () => {
        const d = startOfDay(new Date('2026-04-04T14:35:00'))
        expect(d.getHours()).toBe(0)
        expect(d.getMinutes()).toBe(0)
        expect(d.getSeconds()).toBe(0)
    })

    it('endOfDay sets time to 23:59:59.999', () => {
        const d = endOfDay(new Date('2026-04-04T14:35:00'))
        expect(d.getHours()).toBe(23)
        expect(d.getMinutes()).toBe(59)
        expect(d.getMilliseconds()).toBe(999)
    })
})

// ── REMINDER_OUTCOMES ─────────────────────────────────────────────────────────

describe('REMINDER_OUTCOMES', () => {
    it('includes ESEGUITO, SALTATO, POSTICIPATO', () => {
        expect(REMINDER_OUTCOMES).toContain('ESEGUITO')
        expect(REMINDER_OUTCOMES).toContain('SALTATO')
        expect(REMINDER_OUTCOMES).toContain('POSTICIPATO')
    })
})

// ── markReminder ──────────────────────────────────────────────────────────────

describe('markReminder', () => {
    beforeEach(() => {
        resetState()
        dbReminders.set('r-test', {
            id: 'r-test',
            hostId: 'h1',
            therapyId: 't1',
            scheduledAt: '2026-04-04T08:00:00.000Z',
            stato: 'DA_ESEGUIRE',
            eseguitoAt: null,
            updatedAt: '2026-04-04T07:00:00.000Z',
        })
    })

    it('marks reminder as ESEGUITO and sets eseguitoAt', async () => {
        const result = await markReminder({ reminderId: 'r-test', outcome: 'ESEGUITO', operatorId: 'op-1' })
        expect(result.stato).toBe('ESEGUITO')
        expect(result.eseguitoAt).toBeTruthy()
        expect(result.syncStatus).toBe('pending')
    })

    it('persists the updated reminder in db', async () => {
        await markReminder({ reminderId: 'r-test', outcome: 'SALTATO' })
        const stored = dbReminders.get('r-test')
        expect(stored.stato).toBe('SALTATO')
    })

    it('enqueues a sync upsert', async () => {
        await markReminder({ reminderId: 'r-test', outcome: 'POSTICIPATO' })
        expect(enqueueCalls).toEqual([{ entityType: 'reminders', entityId: 'r-test', operation: 'upsert' }])
    })

    it('records standard audit fields for reminder eseguito', async () => {
        await markReminder({ reminderId: 'r-test', outcome: 'ESEGUITO', operatorId: 'op-admin' })
        expect(activityLogRows.length).toBe(1)
        const audit = activityLogRows[0]
        expect(audit.entityType).toBe('reminders')
        expect(audit.entityId).toBe('r-test')
        expect(audit.action).toBe('reminder_eseguito')
        expect(audit.operatorId).toBe('op-admin')
        expect(audit.deviceId).toBe('unknown')
        expect(typeof audit.ts).toBe('string')
    })

    it('records standard audit fields for reminder saltato', async () => {
        await markReminder({ reminderId: 'r-test', outcome: 'SALTATO', operatorId: 'op-nurse' })
        expect(activityLogRows.length).toBe(1)
        const audit = activityLogRows[0]
        expect(audit.entityType).toBe('reminders')
        expect(audit.entityId).toBe('r-test')
        expect(audit.action).toBe('reminder_saltato')
        expect(audit.operatorId).toBe('op-nurse')
        expect(audit.deviceId).toBe('unknown')
        expect(typeof audit.ts).toBe('string')
    })

    it('records standard audit fields for reminder posticipato', async () => {
        await markReminder({ reminderId: 'r-test', outcome: 'POSTICIPATO', operatorId: 'op-admin' })
        expect(activityLogRows.length).toBe(1)
        const audit = activityLogRows[0]
        expect(audit.entityType).toBe('reminders')
        expect(audit.entityId).toBe('r-test')
        expect(audit.action).toBe('reminder_posticipato')
        expect(audit.operatorId).toBe('op-admin')
        expect(audit.deviceId).toBe('unknown')
        expect(typeof audit.ts).toBe('string')
    })

    it('does not overwrite eseguitoAt when marking SALTATO', async () => {
        const result = await markReminder({ reminderId: 'r-test', outcome: 'SALTATO' })
        expect(result.eseguitoAt).toBeNull()
    })

    it('rejects invalid outcome', async () => {
        await expect(markReminder({ reminderId: 'r-test', outcome: 'INVENTATO' })).rejects.toThrow('Esito non valido')
    })

    it('rejects missing reminder', async () => {
        await expect(markReminder({ reminderId: 'nonexistent', outcome: 'ESEGUITO' })).rejects.toThrow('non trovato')
    })
})
