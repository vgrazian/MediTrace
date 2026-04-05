/**
 * ospiti.js — Helpers per la gestione degli ospiti
 *
 * Logica pura separata dalla UI per facilitare i test unitari:
 *   - buildHostRows()     filtra e arricchisce gli ospiti con conteggio terapie attive
 *   - createHost()        crea un nuovo ospite (scrive su DB + audit log)
 *   - deactivateHost()    disattiva un ospite (soft-delete + audit log)
 */
import { db, enqueue } from '../db'

export function formatHostDisplay(host) {
    if (!host) return '—'
    const fullName = [host.cognome, host.nome].filter(Boolean).join(' ').trim()
    const namePart = fullName || host.iniziali || host.codiceInterno || host.id
    return `[${host.id}] - ${namePart}`
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
export function buildHostRows({ hosts, therapies, showAll = false }) {
    const therapyCountByHost = new Map()
    for (const t of therapies) {
        if (!t.deletedAt && !t.dataFine) {
            therapyCountByHost.set(t.hostId, (therapyCountByHost.get(t.hostId) ?? 0) + 1)
        }
    }

    return hosts
        .filter(h => !h.deletedAt)
        .filter(h => showAll || h.attivo !== false)
        .map(h => ({
            ...h,
            activeTherapies: therapyCountByHost.get(h.id) ?? 0,
        }))
        .sort((a, b) => (a.codiceInterno || a.id).localeCompare(b.codiceInterno || b.id))
}

// ── Side-effecting operations ─────────────────────────────────────────────────

/**
 * Crea un nuovo ospite nel database locale.
 *
 * @param {object} params
 * @param {string} params.id               — ID univoco ospite
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
    if (!id?.trim()) throw new Error('ID obbligatorio')
    if (!codiceInterno?.trim() && !iniziali?.trim()) throw new Error('Codice interno o iniziali obbligatori')

    const existing = await db.hosts.get(id.trim())
    if (existing && !existing.deletedAt) throw new Error(`Ospite con ID "${id.trim()}" esiste già`)

    const now = new Date().toISOString()
    const record = {
        id: id.trim(),
        codiceInterno: codiceInterno?.trim() ?? '',
        iniziali: iniziali?.trim() ?? '',
        nome: nome?.trim() ?? '',
        cognome: cognome?.trim() ?? '',
        luogoNascita: luogoNascita?.trim() ?? '',
        dataNascita: dataNascita || null,
        sesso: sesso?.trim() ?? '',
        codiceFiscale: codiceFiscale?.trim() ?? '',
        patologie: patologie?.trim() ?? '',
        roomId: roomId ?? null,
        bedId: bedId ?? null,
        stanza: stanza?.trim() ?? '',
        letto: letto?.trim() ?? '',
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
            operatorId: operatorId ?? null,
            timestamp: now,
            note: '',
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

    const now = new Date().toISOString()
    const updated = {
        ...host,
        attivo: false,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.hosts, db.syncQueue, db.activityLog, async () => {
        await db.hosts.put(updated)
        await enqueue('hosts', hostId, 'delete')
        await db.activityLog.add({
            entityType: 'hosts',
            entityId: hostId,
            action: 'host_deactivated',
            operatorId: operatorId ?? null,
            timestamp: now,
            note: '',
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

    const now = new Date().toISOString()
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
        roomId: roomId ?? null,
        bedId: bedId ?? null,
        stanza: stanza?.trim() ?? '',
        letto: letto?.trim() ?? '',
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
            operatorId: operatorId ?? null,
            timestamp: now,
            note: '',
        })
    })

    return updated
}

export async function deleteHost({ hostId, operatorId }) {
    return deactivateHost({ hostId, operatorId })
}
