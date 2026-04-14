import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildReminderRows, reminderStateBadge, startOfDay, endOfDay, REMINDER_OUTCOMES, reminderActionButtonColor } from '../../src/services/promemoria'

// ── Mock db — needed for markReminder side-effect tests ──────────────────────

const dbReminders = new Map()
const dbTherapies = new Map()
const dbStockBatches = new Map()
const dbMovements = new Map()
const dbDrugs = new Map()
const activityLogRows = []
const enqueueCalls = []

vi.mock('../../src/db', () => ({
    db: {
        reminders: {
            async get(id) { return dbReminders.get(id) ?? undefined },
            async put(row) { dbReminders.set(row.id, row) },
        },
        therapies: {
            async get(id) { return dbTherapies.get(id) ?? undefined },
            async put(row) { dbTherapies.set(row.id, row) },
        },
        stockBatches: {
            async get(id) { return dbStockBatches.get(id) ?? undefined },
            async put(row) { dbStockBatches.set(row.id, row) },
            where(field) {
                return {
                    equals: (value) => ({
                        toArray: async () => {
                            return Array.from(dbStockBatches.values()).filter(batch => batch[field] === value)
                        }
                    })
                }
            },
        },
        movements: {
            async get(id) { return dbMovements.get(id) ?? undefined },
            async put(row) { dbMovements.set(row.id, row) },
            async toArray() { return Array.from(dbMovements.values()) },
        },
        drugs: {
            async get(id) { return dbDrugs.get(id) ?? undefined },
            async put(row) { dbDrugs.set(row.id, row) },
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
    dbTherapies.clear()
    dbStockBatches.clear()
    dbMovements.clear()
    dbDrugs.clear()
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

    it('sorts by configured bed sequence when scheduledAt is equal', () => {
        const hosts = [
            { id: 'h1', codiceInterno: 'OSP-01', roomId: 'room-a', bedId: 'bed-1', deletedAt: null },
            { id: 'h2', codiceInterno: 'OSP-02', roomId: 'room-a', bedId: 'bed-2', deletedAt: null },
        ]
        const beds = [
            { id: 'bed-1', roomId: 'room-a', numero: 1, deletedAt: null },
            { id: 'bed-2', roomId: 'room-a', numero: 2, deletedAt: null },
        ]
        const rooms = [
            { id: 'room-a', codice: 'A', deletedAt: null },
        ]
        const reminders = [
            { id: 'r1', hostId: 'h1', therapyId: 't1', drugId: 'd1', scheduledAt: '2026-04-04T09:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: null },
            { id: 'r2', hostId: 'h2', therapyId: 't2', drugId: 'd2', scheduledAt: '2026-04-04T09:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: null },
        ]

        const rows = buildReminderRows({
            reminders,
            hosts,
            drugs: DRUGS,
            therapies: THERAPIES,
            beds,
            rooms,
            bedSequence: ['bed-2', 'bed-1'],
            dateFilter: 'all',
            now: NOW,
        })

        expect(rows.map(row => row.id)).toEqual(['r2', 'r1'])
    })

    it('falls back to stable room and bed ordering without configured sequence', () => {
        const hosts = [
            { id: 'h1', codiceInterno: 'OSP-01', roomId: 'room-b', bedId: 'bed-9', deletedAt: null },
            { id: 'h2', codiceInterno: 'OSP-02', roomId: 'room-a', bedId: 'bed-2', deletedAt: null },
        ]
        const beds = [
            { id: 'bed-9', roomId: 'room-b', numero: 9, deletedAt: null },
            { id: 'bed-2', roomId: 'room-a', numero: 2, deletedAt: null },
        ]
        const rooms = [
            { id: 'room-a', codice: 'A', deletedAt: null },
            { id: 'room-b', codice: 'B', deletedAt: null },
        ]
        const reminders = [
            { id: 'r1', hostId: 'h1', therapyId: 't1', drugId: 'd1', scheduledAt: '2026-04-04T09:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: null },
            { id: 'r2', hostId: 'h2', therapyId: 't2', drugId: 'd2', scheduledAt: '2026-04-04T09:00:00.000Z', stato: 'DA_ESEGUIRE', deletedAt: null },
        ]

        const rows = buildReminderRows({ reminders, hosts, drugs: DRUGS, therapies: THERAPIES, beds, rooms, dateFilter: 'all', now: NOW })
        expect(rows.map(row => row.id)).toEqual(['r2', 'r1'])
        expect(rows[0].stanzaLetto).toBe('A/2')
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
        ['ANNULLATO', 'state-cancel'],
        ['DA_ESEGUIRE', 'state-pending'],
        ['UNKNOWN', 'state-pending'],
    ])('maps %s → %s', (stato, expected) => {
        expect(reminderStateBadge(stato)).toBe(expected)
    })
})

// ── reminderActionButtonColor ─────────────────────────────────────────────────

describe('reminderActionButtonColor', () => {
    it('returns green colors for ESEGUITO', () => {
        const color = reminderActionButtonColor('ESEGUITO')
        expect(color).toEqual({ bg: '#d1fae5', text: '#065f46' })
    })

    it('returns yellow colors for POSTICIPATO', () => {
        const color = reminderActionButtonColor('POSTICIPATO')
        expect(color).toEqual({ bg: '#fef3c7', text: '#92400e' })
    })

    it('returns orange colors for SALTATO', () => {
        const color = reminderActionButtonColor('SALTATO')
        expect(color).toEqual({ bg: '#fed7aa', text: '#9a3412' })
    })

    it('returns red colors for ANNULLATO', () => {
        const color = reminderActionButtonColor('ANNULLATO')
        expect(color).toEqual({ bg: '#fee2e2', text: '#991b1b' })
    })

    it('returns gray colors for unknown outcome', () => {
        const color = reminderActionButtonColor('UNKNOWN')
        expect(color).toEqual({ bg: '#e5e7eb', text: '#1f2937' })
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
    it('includes ESEGUITO, SALTATO, POSTICIPATO, ANNULLATO', () => {
        expect(REMINDER_OUTCOMES).toContain('ESEGUITO')
        expect(REMINDER_OUTCOMES).toContain('SALTATO')
        expect(REMINDER_OUTCOMES).toContain('POSTICIPATO')
        expect(REMINDER_OUTCOMES).toContain('ANNULLATO')
        expect(REMINDER_OUTCOMES).toHaveLength(4)
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

    it('records standard audit fields for reminder annullato', async () => {
        await markReminder({ reminderId: 'r-test', outcome: 'ANNULLATO', operatorId: 'op-admin' })
        expect(activityLogRows.length).toBe(1)
        const audit = activityLogRows[0]
        expect(audit.entityType).toBe('reminders')
        expect(audit.entityId).toBe('r-test')
        expect(audit.action).toBe('reminder_annullato')
        expect(audit.operatorId).toBe('op-admin')
        expect(audit.deviceId).toBe('unknown')
        expect(typeof audit.ts).toBe('string')
    })

    it('does not overwrite eseguitoAt when marking SALTATO', async () => {
        const result = await markReminder({ reminderId: 'r-test', outcome: 'SALTATO' })
        expect(result.eseguitoAt).toBeNull()
    })

    it('does not overwrite eseguitoAt when marking ANNULLATO', async () => {
        const result = await markReminder({ reminderId: 'r-test', outcome: 'ANNULLATO' })
        expect(result.eseguitoAt).toBeNull()
    })

    it('rejects invalid outcome', async () => {
        await expect(markReminder({ reminderId: 'r-test', outcome: 'INVENTATO' })).rejects.toThrow('Esito non valido')
    })

    it('rejects missing reminder', async () => {
        await expect(markReminder({ reminderId: 'nonexistent', outcome: 'ESEGUITO' })).rejects.toThrow('non trovato')
    })
})

// ── Stock Batch & Movement Integration Tests ──────────────────────────────────

describe('markReminder with stock batch deduction', () => {
    beforeEach(() => {
        resetState()
        dbReminders.set('r-sb1', {
            id: 'r-sb1',
            hostId: 'h1',
            therapyId: 't1',
            drugId: 'd1',
            scheduledAt: '2026-04-04T08:00:00.000Z',
            stato: 'DA_ESEGUIRE',
            eseguitoAt: null,
            updatedAt: '2026-04-04T07:00:00.000Z',
        })
        dbTherapies.set('t1', {
            id: 't1',
            drugId: 'd1',
            dosePerSomministrazione: 2,
            somministrazioniGiornaliere: 3,
            deletedAt: null,
        })
        dbStockBatches.set('sb1', {
            id: 'sb1',
            drugId: 'd1',
            quantitaAttuale: 100,
            quantitaIniziale: 100,
            sogliaRiordino: 20,
            updatedAt: '2026-04-04T00:00:00.000Z',
            syncStatus: 'synced',
            deletedAt: null,
        })
    })

    it('deducts dose from stock batch when reminder marked ESEGUITO', async () => {
        await markReminder({ reminderId: 'r-sb1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const updatedBatch = dbStockBatches.get('sb1')
        expect(updatedBatch.quantitaAttuale).toBe(98) // 100 - 2
        expect(updatedBatch.syncStatus).toBe('pending')
    })

    it('enqueues stock batch for sync after deduction', async () => {
        await markReminder({ reminderId: 'r-sb1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const batchSyncCalls = enqueueCalls.filter(call => call.entityType === 'stockBatches' && call.entityId === 'sb1')
        expect(batchSyncCalls.length).toBeGreaterThan(0)
    })

    it('does NOT deduct dose when reminder marked SALTATO', async () => {
        const initialQty = dbStockBatches.get('sb1').quantitaAttuale
        await markReminder({ reminderId: 'r-sb1', outcome: 'SALTATO', operatorId: 'op-1' })
        const batch = dbStockBatches.get('sb1')
        expect(batch.quantitaAttuale).toBe(initialQty)
    })

    it('does NOT deduct dose when reminder marked POSTICIPATO', async () => {
        const initialQty = dbStockBatches.get('sb1').quantitaAttuale
        await markReminder({ reminderId: 'r-sb1', outcome: 'POSTICIPATO', operatorId: 'op-1' })
        const batch = dbStockBatches.get('sb1')
        expect(batch.quantitaAttuale).toBe(initialQty)
    })

    it('does NOT deduct dose when reminder marked ANNULLATO', async () => {
        const initialQty = dbStockBatches.get('sb1').quantitaAttuale
        await markReminder({ reminderId: 'r-sb1', outcome: 'ANNULLATO', operatorId: 'op-1' })
        const batch = dbStockBatches.get('sb1')
        expect(batch.quantitaAttuale).toBe(initialQty)
    })

    it('does not let quantity go below zero', async () => {
        dbStockBatches.set('sb1', {
            ...dbStockBatches.get('sb1'),
            quantitaAttuale: 1, // Less than dose
        })
        await markReminder({ reminderId: 'r-sb1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const updatedBatch = dbStockBatches.get('sb1')
        expect(updatedBatch.quantitaAttuale).toBe(0) // max(0, 1 - 2)
    })

    it('selects first available batch with quantity > 0', async () => {
        dbStockBatches.set('sb2', {
            id: 'sb2',
            drugId: 'd1',
            quantitaAttuale: 0,
            quantitaIniziale: 100,
            sogliaRiordino: 20,
            updatedAt: '2026-04-04T00:00:00.000Z',
            syncStatus: 'synced',
            deletedAt: null,
        })
        await markReminder({ reminderId: 'r-sb1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const sb1 = dbStockBatches.get('sb1')
        const sb2 = dbStockBatches.get('sb2')
        // Should have deducted from sb1 (first one with qty > 0)
        expect(sb1.quantitaAttuale).toBeLessThan(100)
        expect(sb2.quantitaAttuale).toBe(0)
    })

    it('skips deleted batches', async () => {
        dbStockBatches.set('sb1', {
            ...dbStockBatches.get('sb1'),
            deletedAt: '2026-04-04T10:00:00.000Z',
        })
        // No non-deleted batch available — should not crash
        await markReminder({ reminderId: 'r-sb1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const reminder = dbReminders.get('r-sb1')
        expect(reminder.stato).toBe('ESEGUITO') // Still marked as executed, just no deduction
    })
})

// ── Movement Creation Integration Tests ────────────────────────────────────────

describe('markReminder with movement creation', () => {
    beforeEach(() => {
        resetState()
        dbReminders.set('r-mv1', {
            id: 'r-mv1',
            hostId: 'h1',
            therapyId: 't1',
            drugId: 'd1',
            scheduledAt: '2026-04-04T08:00:00.000Z',
            stato: 'DA_ESEGUIRE',
            note: 'Prima colazione',
            updatedAt: '2026-04-04T07:00:00.000Z',
        })
        dbTherapies.set('t1', {
            id: 't1',
            drugId: 'd1',
            dosePerSomministrazione: 1.5,
            deletedAt: null,
        })
        dbStockBatches.set('sb1', {
            id: 'sb1',
            drugId: 'd1',
            quantitaAttuale: 50,
            deletedAt: null,
        })
    })

    it('creates SOMMINISTRAZIONE movement on ESEGUITO', async () => {
        await markReminder({ reminderId: 'r-mv1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const movements = Array.from(dbMovements.values())
        expect(movements.length).toBe(1)
        expect(movements[0].type).toBe('SOMMINISTRAZIONE')
    })

    it('movement includes correct fields from reminder and therapy', async () => {
        await markReminder({ reminderId: 'r-mv1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const movement = Array.from(dbMovements.values())[0]
        expect(movement.reminderId).toBe('r-mv1')
        expect(movement.therapyId).toBe('t1')
        expect(movement.hostId).toBe('h1')
        expect(movement.drugId).toBe('d1')
        expect(movement.batchId).toBe('sb1')
        expect(movement.quantita).toBe(1.5)
    })

    it('movement includes note from reminder', async () => {
        await markReminder({ reminderId: 'r-mv1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const movement = Array.from(dbMovements.values())[0]
        expect(movement.note).toContain('Prima colazione')
    })

    it('enqueues movement for sync', async () => {
        await markReminder({ reminderId: 'r-mv1', outcome: 'ESEGUITO', operatorId: 'op-1' })
        const movementSyncCalls = enqueueCalls.filter(call => call.entityType === 'movements')
        expect(movementSyncCalls.length).toBeGreaterThan(0)
    })

    it('does NOT create movement on SALTATO', async () => {
        await markReminder({ reminderId: 'r-mv1', outcome: 'SALTATO', operatorId: 'op-1' })
        const movements = Array.from(dbMovements.values())
        expect(movements.length).toBe(0)
    })

    it('does NOT create movement on ANNULLATO', async () => {
        await markReminder({ reminderId: 'r-mv1', outcome: 'ANNULLATO', operatorId: 'op-1' })
        const movements = Array.from(dbMovements.values())
        expect(movements.length).toBe(0)
    })
})

