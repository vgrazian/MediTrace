import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoom, deactivateRoom, createBed, deactivateBed } from '../../src/services/stanze'

// ── Mock db ────────────────────────────────────────────────────────────────────

const dbRooms = new Map()
const dbBeds = new Map()
const activityLogRows = []
const enqueueCalls = []

vi.mock('../../src/db', () => ({
    db: {
        rooms: {
            async get(id) { return dbRooms.get(id) ?? undefined },
            async put(row) { dbRooms.set(row.id, row) },
        },
        beds: {
            async get(id) { return dbBeds.get(id) ?? undefined },
            async put(row) { dbBeds.set(row.id, row) },
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

function resetState() {
    dbRooms.clear()
    dbBeds.clear()
    activityLogRows.length = 0
    enqueueCalls.length = 0
}

// ── createRoom ─────────────────────────────────────────────────────────────────

describe('createRoom', () => {
    beforeEach(() => {
        resetState()
    })

    it('creates room and writes standard audit fields', async () => {
        const result = await createRoom({
            id: 'room-1',
            codice: 'Girasole 1',
            note: 'Stanza confortevole',
            operatorId: 'op-admin',
        })

        expect(result.id).toBe('room-1')
        expect(result.codice).toBe('Girasole 1')
        expect(result.syncStatus).toBe('pending')

        const createdAudit = activityLogRows.find(row => row.action === 'room_created')
        expect(createdAudit?.entityType).toBe('rooms')
        expect(createdAudit?.entityId).toBe('room-1')
        expect(createdAudit?.action).toBe('room_created')
        expect(createdAudit?.operatorId).toBe('op-admin')
        expect(createdAudit?.deviceId).toBe('unknown')
        expect(typeof createdAudit?.ts).toBe('string')
    })

    it('persists room in database', async () => {
        await createRoom({ id: 'room-1', codice: 'Girasole 1', operatorId: 'op-admin' })
        const stored = dbRooms.get('room-1')
        expect(stored.codice).toBe('Girasole 1')
    })

    it('enqueues sync operation', async () => {
        await createRoom({ id: 'room-1', codice: 'Girasole 1', operatorId: 'op-admin' })
        expect(enqueueCalls).toEqual([{ entityType: 'rooms', entityId: 'room-1', operation: 'upsert' }])
    })
})

// ── deactivateRoom ────────────────────────────────────────────────────────────

describe('deactivateRoom', () => {
    beforeEach(() => {
        resetState()
        dbRooms.set('room-1', {
            id: 'room-1',
            codice: 'Girasole 1',
            updatedAt: '2026-04-04T10:00:00.000Z',
        })
    })

    it('soft-deletes room and writes deactivation audit', async () => {
        const result = await deactivateRoom({ roomId: 'room-1', operatorId: 'op-admin' })

        expect(result.deletedAt).toBeTruthy()
        expect(result.syncStatus).toBe('pending')

        const deactivatedAudit = activityLogRows.find(row => row.action === 'room_deactivated')
        expect(deactivatedAudit?.entityType).toBe('rooms')
        expect(deactivatedAudit?.entityId).toBe('room-1')
        expect(deactivatedAudit?.action).toBe('room_deactivated')
        expect(deactivatedAudit?.operatorId).toBe('op-admin')
        expect(deactivatedAudit?.deviceId).toBe('unknown')
        expect(typeof deactivatedAudit?.ts).toBe('string')
    })
})

// ── createBed ──────────────────────────────────────────────────────────────────

describe('createBed', () => {
    beforeEach(() => {
        resetState()
    })

    it('creates bed and writes standard audit fields', async () => {
        const result = await createBed({
            roomId: 'room-1',
            numero: 1,
            note: 'Letto A',
            operatorId: 'op-nurse',
        })

        expect(result.id).toBe('room-1-L1')
        expect(result.roomId).toBe('room-1')
        expect(result.numero).toBe(1)
        expect(result.syncStatus).toBe('pending')

        const createdAudit = activityLogRows.find(row => row.action === 'bed_created')
        expect(createdAudit?.entityType).toBe('beds')
        expect(createdAudit?.entityId).toBe('room-1-L1')
        expect(createdAudit?.action).toBe('bed_created')
        expect(createdAudit?.operatorId).toBe('op-nurse')
        expect(createdAudit?.deviceId).toBe('unknown')
        expect(typeof createdAudit?.ts).toBe('string')
    })

    it('persists bed in database', async () => {
        await createBed({ roomId: 'room-1', numero: 2, operatorId: 'op-nurse' })
        const stored = dbBeds.get('room-1-L2')
        expect(stored.numero).toBe(2)
    })
})

// ── deactivateBed ─────────────────────────────────────────────────────────────

describe('deactivateBed', () => {
    beforeEach(() => {
        resetState()
        dbBeds.set('room-1-L1', {
            id: 'room-1-L1',
            roomId: 'room-1',
            numero: 1,
            updatedAt: '2026-04-04T10:00:00.000Z',
        })
    })

    it('soft-deletes bed and writes deactivation audit', async () => {
        const result = await deactivateBed({ bedId: 'room-1-L1', operatorId: 'op-nurse' })

        expect(result.deletedAt).toBeTruthy()
        expect(result.syncStatus).toBe('pending')

        const deactivatedAudit = activityLogRows.find(row => row.action === 'bed_deactivated')
        expect(deactivatedAudit?.entityType).toBe('beds')
        expect(deactivatedAudit?.entityId).toBe('room-1-L1')
        expect(deactivatedAudit?.action).toBe('bed_deactivated')
        expect(deactivatedAudit?.operatorId).toBe('op-nurse')
        expect(deactivatedAudit?.deviceId).toBe('unknown')
        expect(typeof deactivatedAudit?.ts).toBe('string')
    })
})
