import { db, enqueue, getSetting } from '../db'

/**
 * Create a new room (stanza).
 */
export async function createRoom({ id, codice, note = '', operatorId = null }) {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const record = {
        id,
        codice: codice || id,
        note: note || '',
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.rooms, db.syncQueue, db.activityLog, async () => {
        await db.rooms.put(record)
        await enqueue('rooms', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'rooms',
            entityId: record.id,
            action: 'room_created',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

/**
 * Create a new bed (letto) in a room.
 */
export async function createBed({ roomId, numero, note = '', operatorId = null }) {
    const id = `${roomId}-L${numero}`
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const record = {
        id,
        roomId,
        numero: Number(numero),
        note: note || '',
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.beds, db.syncQueue, db.activityLog, async () => {
        await db.beds.put(record)
        await enqueue('beds', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'beds',
            entityId: record.id,
            action: 'bed_created',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

/**
 * Deactivate a room (soft delete).
 */
export async function deactivateRoom({ roomId, operatorId = null }) {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const room = await db.rooms.get(roomId)
    if (!room) throw new Error(`Room ${roomId} not found`)

    const record = { ...room, deletedAt: now, updatedAt: now, syncStatus: 'pending' }

    await db.transaction('rw', db.rooms, db.syncQueue, db.activityLog, async () => {
        await db.rooms.put(record)
        await enqueue('rooms', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'rooms',
            entityId: record.id,
            action: 'room_deactivated',
            deviceId,
            operatorId,
            ts: now,
        })
    })
}

/**
 * Deactivate a bed (soft delete).
 */
export async function deactivateBed({ bedId, operatorId = null }) {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const bed = await db.beds.get(bedId)
    if (!bed) throw new Error(`Bed ${bedId} not found`)

    const record = { ...bed, deletedAt: now, updatedAt: now, syncStatus: 'pending' }

    await db.transaction('rw', db.beds, db.syncQueue, db.activityLog, async () => {
        await db.beds.put(record)
        await enqueue('beds', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'beds',
            entityId: record.id,
            action: 'bed_deactivated',
            deviceId,
            operatorId,
            ts: now,
        })
    })
}

/**
 * Get all active rooms with their beds.
 */
export async function getRoomsWithBeds() {
    const [allRooms, allBeds] = await Promise.all([
        db.rooms.toArray(),
        db.beds.toArray(),
    ])

    const activeRooms = allRooms.filter(r => !r.deletedAt)
    const activeBeds = allBeds.filter(b => !b.deletedAt)

    return activeRooms.map(room => ({
        ...room,
        beds: activeBeds.filter(bed => bed.roomId === room.id).sort((a, b) => a.numero - b.numero),
    }))
}

/**
 * Get a specific room with its beds.
 */
export async function getRoomWithBeds(roomId) {
    const room = await db.rooms.get(roomId)
    if (!room || room.deletedAt) return null

    const beds = await db.beds.where('roomId').equals(roomId).toArray()
    return {
        ...room,
        beds: beds.filter(b => !b.deletedAt).sort((a, b) => a.numero - b.numero),
    }
}

/**
 * Get all active beds, optionally filtered by room.
 */
export async function getActiveBeds(roomId = null) {
    let query = db.beds.toArray()
    if (roomId) {
        const beds = await db.beds.where('roomId').equals(roomId).toArray()
        return beds.filter(b => !b.deletedAt).sort((a, b) => a.numero - b.numero)
    }
    const allBeds = await query
    return allBeds.filter(b => !b.deletedAt)
}
