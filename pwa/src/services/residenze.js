import { db, enqueue, getSetting } from '../db'
import { createRoom, updateRoom, deactivateRoom, restoreRoom } from './stanze'

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

export async function ensureDefaultResidenze({ operatorId = null } = {}) {
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

    const activeHosts = hosts.filter(host => !host.deletedAt && host.attivo !== false)

    return rooms
        .filter(room => !room.deletedAt)
        .map(room => {
            const maxOspiti = readMaxOspiti(room)
            const ospitiAttivi = activeHosts.filter(host => host.roomId === room.id).length
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

    // Keep the room-level host constraint explicit to avoid partially deleting
    // beds when active hosts are still assigned to this residenza.
    const allHosts = await (db.hosts?.toArray?.() ?? Promise.resolve([]))
    const assignedHosts = allHosts
        .filter(host => host && !host.deletedAt && host.attivo !== false)
        .filter(host => host.roomId === roomId)
    if (assignedHosts.length > 0) {
        throw new Error('Impossibile eliminare la residenza: sono presenti ospiti assegnati. Spostare prima gli ospiti in un altra residenza.')
    }

    // Cleanup legacy bed links: deactivate all beds in the room in one batch
    // so room deletion is not blocked by stale host-bed references.
    const allBeds = await db.beds.toArray()
    const activeBeds = allBeds.filter(bed => bed.roomId === roomId && !bed.deletedAt)
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

    return deactivateRoom({ roomId, operatorId })
}

export async function restoreResidenza({ roomId, existing, operatorId = null }) {
    return restoreRoom({ roomId, existing, operatorId })
}

export async function getCurrentResidenzaId() {
    return getSetting('promemoriaCurrentResidenzaId', '')
}
