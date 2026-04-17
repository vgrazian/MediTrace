/**
 * ospiti.js — Helpers per la gestione degli ospiti
 *
 * Logica pura separata dalla UI per facilitare i test unitari:
 *   - buildHostRows()     filtra e arricchisce gli ospiti con conteggio terapie attive
 *   - createHost()        crea un nuovo ospite (scrive su DB + audit log)
 *   - deactivateHost()    disattiva un ospite (soft-delete + audit log)
 */
import { db, enqueue, getSetting } from '../db'
import { generateEntityId } from './ids'

const DEFAULT_RESIDENZA_CAPACITY = 10

function parseResidenzaCapacity(room) {
    const parsed = Number(room?.metadata?.maxOspiti)
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_RESIDENZA_CAPACITY
    return Math.floor(parsed)
}

async function assertResidenzaCapacity({ roomId, excludeHostId = null }) {
    const safeRoomId = String(roomId || '').trim()
    if (!safeRoomId) return

    const room = await db.rooms?.get?.(safeRoomId)
    if (!room || room.deletedAt) {
        throw new Error('Residenza selezionata non trovata')
    }

    const allHosts = await (db.hosts?.toArray?.() ?? Promise.resolve([]))
    const activeHostsInRoom = allHosts
        .filter(host => !host?.deletedAt)
        .filter(host => host?.attivo !== false)
        .filter(host => host?.roomId === safeRoomId)
        .filter(host => !excludeHostId || host?.id !== excludeHostId)

    const capacity = parseResidenzaCapacity(room)
    if (activeHostsInRoom.length >= capacity) {
        throw new Error(`Impossibile assegnare l'ospite: capienza massima residenza raggiunta (${capacity} ospiti).`)
    }
}

async function normalizeHostPlacement({ roomId, bedId, stanza, letto }) {
    const safeRoomId = String(roomId || '').trim()
    if (!safeRoomId) {
        return {
            roomId: null,
            bedId: null,
            stanza: '',
            letto: '',
        }
    }

    const room = await db.rooms?.get?.(safeRoomId)
    if (!room || room.deletedAt) {
        throw new Error('Residenza selezionata non trovata')
    }

    const safeBedId = String(bedId || '').trim()
    let normalizedBedId = null
    let normalizedLetto = ''

    if (safeBedId) {
        const bed = await db.beds?.get?.(safeBedId)
        if (bed && !bed.deletedAt && bed.roomId === safeRoomId) {
            normalizedBedId = safeBedId
            normalizedLetto = String(bed.numero || '').trim()
        }
    }

    return {
        roomId: safeRoomId,
        bedId: normalizedBedId,
        stanza: String(room.codice || stanza || '').trim(),
        letto: normalizedLetto || String(letto || '').trim(),
    }
}

export function formatHostDisplay(host) {
    if (!host) return '—'
    const fullName = [host.cognome, host.nome].filter(Boolean).join(' ').trim()
    const namePart = fullName || host.iniziali || host.codiceInterno || host.id
    const visibleId = host.codiceInterno || host.id
    return `[${visibleId}] - ${namePart}`
}

// ── Pure helpers (testable) ────────────────────────────────────────────────────

/**
 * Costruisce le righe della lista ospiti, arricchendo con conteggio terapie attive.
 *
 * @param {object} params
 * @param {Array}  params.hosts       — array di record host locali
 * @param {Array}  params.therapies   — array di record therapy locali
 * @param {boolean} params.showAll    — se true, include anche ospiti disattivati
 * @returns {Array} host arricchiti, ordinati per codiceInterno asc
 */
export function buildHostRows({ hosts, therapies, showAll = false, rooms = [] }) {
    const therapyCountByHost = new Map()
    for (const t of therapies) {
        if (!t.deletedAt && !t.dataFine) {
            therapyCountByHost.set(t.hostId, (therapyCountByHost.get(t.hostId) ?? 0) + 1)
        }
    }

    const roomById = new Map(rooms.map(r => [r.id, r]))
    const bedById = new Map()
    for (const room of rooms) {
        for (const bed of (room.beds ?? [])) {
            bedById.set(bed.id, bed)
        }
    }

    return hosts
        .filter(h => !h.deletedAt)
        .filter(h => showAll || h.attivo !== false)
        .map(h => {
            let stanza = h.stanza || ''
            let letto = h.letto !== null && h.letto !== undefined ? String(h.letto) : ''
            if (h.roomId && !stanza) {
                const room = roomById.get(h.roomId)
                if (room) stanza = room.codice || ''
            }
            if (h.bedId && !letto) {
                const bed = bedById.get(h.bedId)
                if (bed) letto = String(bed.numero || '')
            }
            return {
                ...h,
                stanza,
                letto,
                activeTherapies: therapyCountByHost.get(h.id) ?? 0,
            }
        })
        .sort((a, b) => (a.codiceInterno || a.id).localeCompare(b.codiceInterno || b.id))
}

// ── Side-effecting operations ─────────────────────────────────────────────────

/**
 * Crea un nuovo ospite nel database locale.
 *
 * @param {object} params
 * @param {string} [params.id]             — ID univoco ospite (opzionale, auto-generato se assente)
 * @param {string} params.codiceInterno    — codice operativo (es. "OSP-01")
 * @param {string} [params.iniziali]       — iniziali (es. "M.R.")
 * @param {string} [params.roomId]         — stanza (ID Room)
 * @param {string} [params.bedId]          — letto (ID Bed)
 * @param {string} [params.stanza]         — numero stanza (campo di testo libero, legacy)
 * @param {string} [params.letto]          — numero letto (campo di testo libero, legacy)
 * @param {string} [params.note]           — note libere
 * @param {string} [params.operatorId]     — login operatore corrente
 * @returns {Promise<object>} record salvato
 */
export async function createHost({
    id,
    codiceInterno,
    iniziali,
    nome,
    cognome,
    luogoNascita,
    dataNascita,
    sesso,
    codiceFiscale,
    patologie,
    roomId,
    bedId,
    stanza,
    letto,
    note,
    operatorId,
}) {
    if (!codiceInterno?.trim() && !iniziali?.trim()) throw new Error('Codice interno o iniziali obbligatori')

    await assertResidenzaCapacity({ roomId })
    const normalizedPlacement = await normalizeHostPlacement({ roomId, bedId, stanza, letto })

    const hostId = id?.trim() || generateEntityId('host')

    const existing = await db.hosts.get(hostId)
    if (existing && !existing.deletedAt) throw new Error(`Ospite con ID "${hostId}" esiste già`)

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const record = {
        id: hostId,
        codiceInterno: codiceInterno?.trim() ?? '',
        iniziali: iniziali?.trim() ?? '',
        nome: nome?.trim() ?? '',
        cognome: cognome?.trim() ?? '',
        luogoNascita: luogoNascita?.trim() ?? '',
        dataNascita: dataNascita || null,
        sesso: sesso?.trim() ?? '',
        codiceFiscale: codiceFiscale?.trim() ?? '',
        patologie: patologie?.trim() ?? '',
        roomId: normalizedPlacement.roomId,
        bedId: normalizedPlacement.bedId,
        stanza: normalizedPlacement.stanza,
        letto: normalizedPlacement.letto,
        note: note?.trim() ?? '',
        attivo: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.hosts, db.syncQueue, db.activityLog, async () => {
        await db.hosts.put(record)
        await enqueue('hosts', record.id)
        await db.activityLog.add({
            entityType: 'hosts',
            entityId: record.id,
            action: 'host_created',
            deviceId,
            operatorId: operatorId ?? null,
            ts: now,
        })
    })

    return record
}

/**
 * Disattiva (soft-delete) un ospite esistente.
 *
 * @param {object} params
 * @param {string} params.hostId       — ID ospite da disattivare
 * @param {string} [params.operatorId] — login operatore corrente
 * @returns {Promise<object>} record aggiornato
 */
export async function deactivateHost({ hostId, operatorId }) {
    const host = await db.hosts.get(hostId)
    if (!host || host.deletedAt) throw new Error(`Ospite "${hostId}" non trovato`)

    const allTherapies = await (db.therapies?.toArray?.() ?? Promise.resolve([]))
    const therapiesToDeactivate = allTherapies
        .filter(therapy => therapy.hostId === hostId)
        .filter(therapy => !therapy.deletedAt)

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const updated = {
        ...host,
        roomId: null,
        bedId: null,
        stanza: '',
        letto: '',
        attivo: false,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
    }

    const deactivatedTherapies = therapiesToDeactivate.map((therapy) => ({
        ...therapy,
        attiva: false,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
    }))

    await db.transaction('rw', db.hosts, db.therapies, db.syncQueue, db.activityLog, async () => {
        await db.hosts.put(updated)
        await enqueue('hosts', hostId, 'delete')

        for (const therapy of deactivatedTherapies) {
            await db.therapies.put(therapy)
            await enqueue('therapies', therapy.id, 'upsert')
        }

        await db.activityLog.add({
            entityType: 'hosts',
            entityId: hostId,
            action: 'host_deleted',
            deviceId,
            operatorId: operatorId ?? null,
            ts: now,
        })

        for (const therapy of deactivatedTherapies) {
            await db.activityLog.add({
                entityType: 'therapies',
                entityId: therapy.id,
                action: 'therapy_deactivated_due_host_delete',
                deviceId,
                operatorId: operatorId ?? null,
                ts: now,
            })
        }
    })

    return {
        ...updated,
        roomId: host.roomId ?? null,
        bedId: host.bedId ?? null,
        stanza: host.stanza ?? '',
        letto: host.letto ?? '',
        _cascadeDeletedTherapies: deactivatedTherapies,
    }
}

export async function restoreHost({ hostId, existing, operatorId }) {
    if (!existing || !existing.deletedAt) {
        throw new Error(`Ospite "${hostId}" non ripristinabile`)
    }

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const updated = {
        ...existing,
        attivo: true,
        deletedAt: null,
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.hosts, db.therapies, db.syncQueue, db.activityLog, async () => {
        await db.hosts.put(updated)
        await enqueue('hosts', hostId, 'upsert')

        const cascadeTherapies = Array.isArray(existing._cascadeDeletedTherapies)
            ? existing._cascadeDeletedTherapies
            : []
        for (const therapy of cascadeTherapies) {
            const restoredTherapy = {
                ...therapy,
                attiva: true,
                deletedAt: null,
                updatedAt: now,
                syncStatus: 'pending',
            }
            await db.therapies.put(restoredTherapy)
            await enqueue('therapies', restoredTherapy.id, 'upsert')
            await db.activityLog.add({
                entityType: 'therapies',
                entityId: restoredTherapy.id,
                action: 'therapy_restored_due_host_undo',
                deviceId,
                operatorId: operatorId ?? null,
                ts: now,
            })
        }

        await db.activityLog.add({
            entityType: 'hosts',
            entityId: hostId,
            action: 'host_restored',
            deviceId,
            operatorId: operatorId ?? null,
            ts: now,
        })
    })

    return updated
}

export async function updateHost({
    hostId,
    codiceInterno,
    iniziali,
    nome,
    cognome,
    luogoNascita,
    dataNascita,
    sesso,
    codiceFiscale,
    patologie,
    roomId,
    bedId,
    stanza,
    letto,
    note,
    operatorId,
}) {
    const host = await db.hosts.get(hostId)
    if (!host || host.deletedAt) throw new Error(`Ospite "${hostId}" non trovato`)

    await assertResidenzaCapacity({ roomId, excludeHostId: hostId })
    const normalizedPlacement = await normalizeHostPlacement({ roomId, bedId, stanza, letto })

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const updated = {
        ...host,
        codiceInterno: codiceInterno?.trim() ?? '',
        iniziali: iniziali?.trim() ?? '',
        nome: nome?.trim() ?? '',
        cognome: cognome?.trim() ?? '',
        luogoNascita: luogoNascita?.trim() ?? '',
        dataNascita: dataNascita || null,
        sesso: sesso?.trim() ?? '',
        codiceFiscale: codiceFiscale?.trim() ?? '',
        patologie: patologie?.trim() ?? '',
        roomId: normalizedPlacement.roomId,
        bedId: normalizedPlacement.bedId,
        stanza: normalizedPlacement.stanza,
        letto: normalizedPlacement.letto,
        note: note?.trim() ?? '',
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.hosts, db.syncQueue, db.activityLog, async () => {
        await db.hosts.put(updated)
        await enqueue('hosts', hostId, 'upsert')
        await db.activityLog.add({
            entityType: 'hosts',
            entityId: hostId,
            action: 'host_updated',
            deviceId,
            operatorId: operatorId ?? null,
            ts: now,
        })
    })

    return updated
}

export async function deleteHost({ hostId, operatorId }) {
    return deactivateHost({ hostId, operatorId })
}
