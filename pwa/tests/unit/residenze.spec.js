import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbRooms = new Map()
const dbBeds = new Map()
const dbHosts = new Map()
const activityLogRows = []
const enqueueCalls = []
const createRoomCalls = []

vi.mock('../../src/services/stanze', () => ({
    async createRoom({ codice, note = '', operatorId = null }) {
        const id = `room_${String(codice).replace(/\s+/g, '_').toLowerCase()}`
        const now = new Date().toISOString()
        const record = {
            id,
            codice,
            note,
            updatedAt: now,
            deletedAt: null,
            syncStatus: 'pending',
            metadata: {},
        }
        dbRooms.set(id, record)
        createRoomCalls.push({ codice, note, operatorId })
        return record
    },
    async updateRoom() {
        throw new Error('updateRoom not expected in this test')
    },
    async restoreRoom() {
        throw new Error('restoreRoom not expected in this test')
    },
}))

vi.mock('../../src/db', () => ({
    db: {
        rooms: {
            async get(id) { return dbRooms.get(id) ?? undefined },
            async put(row) { dbRooms.set(row.id, row) },
            async toArray() { return Array.from(dbRooms.values()) },
        },
        beds: {
            async put(row) { dbBeds.set(row.id, row) },
            async toArray() { return Array.from(dbBeds.values()) },
        },
        hosts: {
            async toArray() { return Array.from(dbHosts.values()) },
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
    async setSetting() { },
}))

function resetState() {
    dbRooms.clear()
    dbBeds.clear()
    dbHosts.clear()
    activityLogRows.length = 0
    enqueueCalls.length = 0
    createRoomCalls.length = 0
}

function makeRoom({ id, codice, updatedAt = '2026-04-17T10:00:00.000Z', deletedAt = null }) {
    return {
        id,
        codice,
        note: '',
        updatedAt,
        deletedAt,
        syncStatus: 'synced',
        metadata: { maxOspiti: 10 },
    }
}

describe('residenze self-healing', () => {
    beforeEach(() => {
        resetState()
    })

    it('deactivates duplicate active residenze with same name when empty', async () => {
        dbRooms.set('room-a', makeRoom({ id: 'room-a', codice: 'Via Bellani', updatedAt: '2026-04-17T08:00:00.000Z' }))
        dbRooms.set('room-b', makeRoom({ id: 'room-b', codice: 'Via Bellani', updatedAt: '2026-04-17T09:00:00.000Z' }))
        dbRooms.set('room-c', makeRoom({ id: 'room-c', codice: 'Il Rifugio', updatedAt: '2026-04-17T07:00:00.000Z' }))

        dbBeds.set('bed-b1', {
            id: 'bed-b1',
            roomId: 'room-b',
            numero: 1,
            deletedAt: null,
            updatedAt: '2026-04-17T09:00:00.000Z',
            syncStatus: 'synced',
        })

        const { ensureDefaultResidenze, listResidenze } = await import('../../src/services/residenze')

        await ensureDefaultResidenze({ operatorId: 'op-admin' })

        const active = (await listResidenze()).map((item) => item.codice)
        expect(active.filter((code) => code === 'Via Bellani')).toHaveLength(1)
        expect(active).toContain('Il Rifugio')
        expect(createRoomCalls).toHaveLength(0)

        const duplicateRoom = dbRooms.get('room-b')
        expect(duplicateRoom.deletedAt).toBeTruthy()
        expect(dbBeds.get('bed-b1').deletedAt).toBeTruthy()
    })

    it('keeps the duplicate that has active hosts and removes empty one', async () => {
        dbRooms.set('room-a', makeRoom({ id: 'room-a', codice: 'Il Rifugio', updatedAt: '2026-04-17T08:00:00.000Z' }))
        dbRooms.set('room-b', makeRoom({ id: 'room-b', codice: 'Il Rifugio', updatedAt: '2026-04-17T09:00:00.000Z' }))

        dbHosts.set('host-1', {
            id: 'host-1',
            roomId: 'room-b',
            attivo: true,
            deletedAt: null,
        })

        const { ensureDefaultResidenze } = await import('../../src/services/residenze')
        await ensureDefaultResidenze({ operatorId: 'op-admin' })

        expect(dbRooms.get('room-b').deletedAt).toBeNull()
        expect(dbRooms.get('room-a').deletedAt).toBeTruthy()
    })
})
