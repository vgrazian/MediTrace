import { db, enqueue, getSetting } from '../db'
import { generateEntityId } from './ids'

/**
 * Create a new room (stanza).
 */
export async function createRoom({ id, codice, note = '', operatorId = null }) {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const roomId = String(id || '').trim() || generateEntityId('room')
    const roomCode = String(codice || '').trim() || roomId

    const record = {
        id: roomId,
        codice: roomCode,
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
    const safeRoomId = String(roomId || '').trim()
    if (!safeRoomId) throw new Error('Room ID obbligatorio')
    const numericBed = Number(numero)
    if (!Number.isFinite(numericBed) || numericBed <= 0) throw new Error('Numero letto non valido')

    const id = generateEntityId('bed')
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const record = {
        id,
        roomId: safeRoomId,
        numero: numericBed,
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

    return record
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

    return record
}

/**
 * Get all active rooms with their beds.
 */
export async function getRoomsWithBeds() {
    const [allRooms, allBeds, allHosts] = await Promise.all([
        db.rooms.toArray(),
        db.beds.toArray(),
        db.hosts.toArray(),
    ])

    const activeRooms = allRooms.filter(r => !r.deletedAt)
    const activeBeds = allBeds.filter(b => !b.deletedAt)
    const activeHosts = allHosts.filter(h => !h.deletedAt && h.attivo !== false)
    const hostByBedId = new Map(activeHosts.filter(h => h.bedId).map(h => [h.bedId, h]))

    return activeRooms.map(room => ({
        ...room,
        beds: activeBeds
            .filter(bed => bed.roomId === room.id)
            .sort((a, b) => a.numero - b.numero)
            .map(bed => ({
                ...bed,
                host: hostByBedId.get(bed.id) || null,
            })),
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
