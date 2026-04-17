import { db, enqueue, getSetting } from '../db'
import { createRoom, updateRoom, restoreRoom } from './stanze'

export const DEFAULT_RESIDENZE = [
    { codice: 'Il Rifugio', maxOspiti: 10, note: 'Casa alloggio attiva (5 ospiti target)' },
    { codice: 'Via Bellani', maxOspiti: 10, note: 'Casa alloggio attiva (7 ospiti target)' },
]

const DEFAULT_MAX_OSPITI = 10

function parseMaxOspiti(value) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_OSPITI
    return Math.floor(parsed)
}

function readMaxOspiti(room) {
    return parseMaxOspiti(room?.metadata?.maxOspiti)
}

function isActiveHost(host) {
    if (!host || host.deletedAt) return false
    return host.attivo !== false
}

function normalizeId(value) {
    return String(value ?? '').trim()
}

function buildActiveHostsCountByRoom(hosts = []) {
    const counts = new Map()
    for (const host of hosts) {
        if (!isActiveHost(host)) continue
        const roomKey = normalizeId(host.roomId)
        if (!roomKey) continue
        counts.set(roomKey, (counts.get(roomKey) ?? 0) + 1)
    }
    return counts
}

function timestampOrMax(value) {
    const parsed = Date.parse(value || '')
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function sortDuplicateCandidates(a, b, activeHostsByRoom) {
    const hostDiff = (activeHostsByRoom.get(normalizeId(b.id)) ?? 0) - (activeHostsByRoom.get(normalizeId(a.id)) ?? 0)
    if (hostDiff !== 0) return hostDiff

    const updatedDiff = timestampOrMax(a.updatedAt) - timestampOrMax(b.updatedAt)
    if (updatedDiff !== 0) return updatedDiff

    return normalizeId(a.id).localeCompare(normalizeId(b.id))
}

export async function healDuplicateResidenze({ operatorId = null } = {}) {
    const [rooms, hosts] = await Promise.all([
        db.rooms.toArray(),
        db.hosts.toArray(),
    ])

    const activeHostsByRoom = buildActiveHostsCountByRoom(hosts)
    const activeRooms = rooms.filter((room) => !room.deletedAt && String(room.codice || '').trim())
    const groupsByCode = new Map()

    for (const room of activeRooms) {
        const key = String(room.codice || '').trim().toLowerCase()
        if (!groupsByCode.has(key)) groupsByCode.set(key, [])
        groupsByCode.get(key).push(room)
    }

    let cleaned = 0
    for (const group of groupsByCode.values()) {
        if (group.length <= 1) continue

        const ordered = [...group].sort((a, b) => sortDuplicateCandidates(a, b, activeHostsByRoom))
        const duplicates = ordered.slice(1)

        for (const duplicate of duplicates) {
            const duplicateId = normalizeId(duplicate.id)
            if ((activeHostsByRoom.get(duplicateId) ?? 0) > 0) continue
            await deactivateResidenza({ roomId: duplicateId, operatorId: operatorId ?? 'system:self-heal-dedupe' })
            cleaned += 1
        }
    }

    return cleaned
}

export async function ensureDefaultResidenze({ operatorId = null } = {}) {
    await healDuplicateResidenze({ operatorId })

    const existingRooms = await db.rooms.toArray()
    const activeCodes = new Set(
        existingRooms
            .filter(room => !room.deletedAt)
            .map(room => String(room.codice || '').trim().toLowerCase()),
    )

    for (const residenza of DEFAULT_RESIDENZE) {
        const key = String(residenza.codice).trim().toLowerCase()
        if (activeCodes.has(key)) continue

        await createRoom({
            codice: residenza.codice,
            note: residenza.note,
            operatorId,
        })
    }
}

export async function listResidenze() {
    const [rooms, hosts] = await Promise.all([
        db.rooms.toArray(),
        db.hosts.toArray(),
    ])

    const activeHostsByRoom = buildActiveHostsCountByRoom(hosts)

    return rooms
        .filter(room => !room.deletedAt)
        .map(room => {
            const maxOspiti = readMaxOspiti(room)
            const ospitiAttivi = activeHostsByRoom.get(normalizeId(room.id)) ?? 0
            return {
                ...room,
                maxOspiti,
                ospitiAttivi,
                postiDisponibili: Math.max(0, maxOspiti - ospitiAttivi),
            }
        })
        .sort((a, b) => String(a.codice || '').localeCompare(String(b.codice || '')))
}

export async function createResidenza({ codice, note = '', maxOspiti = DEFAULT_MAX_OSPITI, operatorId = null }) {
    const cleanCode = String(codice || '').trim()
    if (!cleanCode) throw new Error('Nome residenza obbligatorio')

    const existing = await db.rooms.toArray()
    if (existing.some(room => !room.deletedAt && String(room.codice || '').trim().toLowerCase() === cleanCode.toLowerCase())) {
        throw new Error('Residenza gia esistente')
    }

    const created = await createRoom({ codice: cleanCode, note, operatorId })
    const metadata = {
        ...(created.metadata || {}),
        maxOspiti: parseMaxOspiti(maxOspiti),
    }

    await db.rooms.put({
        ...created,
        metadata,
    })

    return {
        ...created,
        metadata,
    }
}

export async function updateResidenza({ roomId, codice, note = '', maxOspiti = DEFAULT_MAX_OSPITI, operatorId = null }) {
    const cleanCode = String(codice || '').trim()
    if (!cleanCode) throw new Error('Nome residenza obbligatorio')

    const room = await db.rooms.get(roomId)
    if (!room || room.deletedAt) throw new Error('Residenza non trovata')

    const allRooms = await db.rooms.toArray()
    if (allRooms.some(item => item.id !== roomId && !item.deletedAt && String(item.codice || '').trim().toLowerCase() === cleanCode.toLowerCase())) {
        throw new Error('Residenza gia esistente')
    }

    const updated = await updateRoom({ roomId, codice: cleanCode, note, operatorId })
    const metadata = {
        ...(updated.metadata || {}),
        maxOspiti: parseMaxOspiti(maxOspiti),
    }

    await db.rooms.put({
        ...updated,
        metadata,
    })

    return {
        ...updated,
        metadata,
    }
}

export async function deactivateResidenza({ roomId, operatorId = null }) {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const safeRoomId = normalizeId(roomId)

    const room = await db.rooms.get(safeRoomId)
    if (!room || room.deletedAt) throw new Error('Residenza non trovata')

    // Keep the room-level host constraint explicit to avoid partially deleting
    // beds when active hosts are still assigned to this residenza.
    const allHosts = await (db.hosts?.toArray?.() ?? Promise.resolve([]))
    const activeHostsByRoom = buildActiveHostsCountByRoom(allHosts)
    if ((activeHostsByRoom.get(safeRoomId) ?? 0) > 0) {
        throw new Error('Impossibile eliminare la residenza: sono presenti ospiti assegnati. Spostare prima gli ospiti in un altra residenza.')
    }

    // Cleanup legacy bed links: deactivate all beds in the room in one batch
    // so room deletion is not blocked by stale host-bed references.
    const allBeds = await db.beds.toArray()
    const activeBeds = allBeds.filter(bed => normalizeId(bed.roomId) === safeRoomId && !bed.deletedAt)
    if (activeBeds.length > 0) {
        await db.transaction('rw', db.beds, db.syncQueue, db.activityLog, async () => {
            for (const bed of activeBeds) {
                const record = { ...bed, deletedAt: now, updatedAt: now, syncStatus: 'pending' }
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
            }
        })
    }

    const record = {
        ...room,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
    }

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

export async function restoreResidenza({ roomId, existing, operatorId = null }) {
    return restoreRoom({ roomId, existing, operatorId })
}

export async function getCurrentResidenzaId() {
    return getSetting('promemoriaCurrentResidenzaId', '')
}
