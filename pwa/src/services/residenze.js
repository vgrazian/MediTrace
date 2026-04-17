import { db, getSetting } from '../db'
import { createRoom, updateRoom, deactivateRoom, deactivateBed, restoreRoom } from './stanze'

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
    // Cascade-delete any orphaned beds before deactivating the room.
    // Beds without active hosts can be safely removed; hosts-assigned beds
    // will still throw through deactivateBed's own guard.
    const allBeds = await db.beds.toArray()
    const activeBeds = allBeds.filter(bed => bed.roomId === roomId && !bed.deletedAt)
    for (const bed of activeBeds) {
        await deactivateBed({ bedId: bed.id, operatorId })
    }
    return deactivateRoom({ roomId, operatorId })
}

export async function restoreResidenza({ roomId, existing, operatorId = null }) {
    return restoreRoom({ roomId, existing, operatorId })
}

export async function getCurrentResidenzaId() {
    return getSetting('promemoriaCurrentResidenzaId', '')
}
