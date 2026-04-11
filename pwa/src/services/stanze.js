import { db, enqueue, getSetting } from '../db'
import { generateEntityId } from './ids'
import { AppError, ErrorCategory, ErrorSeverity } from './errorHandling'

function isActiveHost(host) {
    if (!host || host.deletedAt) return false
    return host.attivo !== false
}

function buildConstraintError(message, code, technicalDetails = {}) {
    return new AppError(message, {
        category: ErrorCategory.CONFLICT,
        severity: ErrorSeverity.HIGH,
        code,
        recoverable: true,
        technicalDetails,
    })
}

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
 * Update an existing room.
 */
export async function updateRoom({ roomId, codice, note = '', operatorId = null }) {
    const existing = await db.rooms.get(roomId)
    if (!existing || existing.deletedAt) throw new Error(`Room ${roomId} not found`)

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const roomCode = String(codice || '').trim()
    if (!roomCode) throw new Error('Codice stanza obbligatorio')

    const record = {
        ...existing,
        codice: roomCode,
        note: note || '',
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.rooms, db.syncQueue, db.activityLog, async () => {
        await db.rooms.put(record)
        await enqueue('rooms', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'rooms',
            entityId: record.id,
            action: 'room_updated',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

/**
 * Update an existing bed.
 */
export async function updateBed({ bedId, roomId, numero, note = '', operatorId = null }) {
    const existing = await db.beds.get(bedId)
    if (!existing || existing.deletedAt) throw new Error(`Bed ${bedId} not found`)

    const safeRoomId = String(roomId || '').trim()
    if (!safeRoomId) throw new Error('Room ID obbligatorio')
    const numericBed = Number(numero)
    if (!Number.isFinite(numericBed) || numericBed <= 0) throw new Error('Numero letto non valido')

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const record = {
        ...existing,
        roomId: safeRoomId,
        numero: numericBed,
        note: note || '',
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.beds, db.syncQueue, db.activityLog, async () => {
        await db.beds.put(record)
        await enqueue('beds', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'beds',
            entityId: record.id,
            action: 'bed_updated',
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
    if (!room || room.deletedAt) throw new Error(`Room ${roomId} not found`)

    const [allBeds, allHosts] = await Promise.all([
        db.beds.toArray(),
        db.hosts?.toArray?.() ?? Promise.resolve([]),
    ])

    const activeBedsInRoom = allBeds.filter(bed => bed.roomId === roomId && !bed.deletedAt)
    if (activeBedsInRoom.length > 0) {
        throw buildConstraintError(
            'Impossibile eliminare la stanza: sono presenti letti attivi associati. Eliminare prima i letti della stanza.',
            'ROOM_HAS_ACTIVE_BEDS',
            { roomId, bedIds: activeBedsInRoom.map(bed => bed.id) },
        )
    }

    const assignedHosts = allHosts
        .filter(isActiveHost)
        .filter(host => host.roomId === roomId)
    if (assignedHosts.length > 0) {
        throw buildConstraintError(
            'Impossibile eliminare la stanza: sono presenti ospiti assegnati. Spostare prima gli ospiti in un altra stanza.',
            'ROOM_ASSIGNED_TO_ACTIVE_HOSTS',
            { roomId, hostIds: assignedHosts.map(host => host.id) },
        )
    }

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
    if (!bed || bed.deletedAt) throw new Error(`Bed ${bedId} not found`)

    const allHosts = await (db.hosts?.toArray?.() ?? Promise.resolve([]))
    const assignedHosts = allHosts
        .filter(isActiveHost)
        .filter(host => {
            if (host.bedId === bedId) return true
            return host.roomId === bed.roomId && String(host.letto || '') === String(bed.numero || '')
        })
    if (assignedHosts.length > 0) {
        throw buildConstraintError(
            'Impossibile eliminare il letto: e assegnato a ospiti attivi. Spostare prima gli ospiti su un altro letto.',
            'BED_ASSIGNED_TO_ACTIVE_HOSTS',
            { bedId, hostIds: assignedHosts.map(host => host.id) },
        )
    }

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
