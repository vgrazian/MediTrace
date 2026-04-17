/**
 * promemoria.js — Helpers per la vista Promemoria operativa
 *
 * Logica pura separata dalla UI per facilitare i test unitari:
 *   - buildReminderRows()   filtra e arricchisce i promemoria con label ospite/farmaco
 *   - markReminder()        registra l'esito di una somministrazione (scrive su DB)
 *   - VALID_STATES / OUTCOMES
 */
import { db, enqueue, getSetting } from '../db'

export const REMINDER_OUTCOMES = ['ESEGUITO', 'SALTATO', 'POSTICIPATO', 'ANNULLATO']
export const BED_SEQUENCE_SETTING_KEY = 'promemoriaBedSequence'
export const CURRENT_RESIDENZA_SETTING_KEY = 'promemoriaCurrentResidenzaId'

// ── Pure helpers (testable) ────────────────────────────────────────────────────

/**
 * Aggiunge label ospite e farmaco a ciascun promemoria, poi filtra per data.
 *
 * @param {object} params
 * @param {Array}  params.reminders   — array di record reminder locali
 * @param {Array}  params.hosts       — array di record host locali
 * @param {Array}  params.drugs       — array di record drug locali
 * @param {Array}  params.therapies   — array di record therapy locali
 * @param {string} params.dateFilter  — 'today' | 'all' | ISO date string (YYYY-MM-DD)
 * @param {string|string[]} params.stateFilter — '' | 'DA_ESEGUIRE' | ['DA_ESEGUIRE','POSTICIPATO']
 * @param {Date}   params.now         — riferimento temporale
 * @returns {Array} reminders arricchiti, ordinati per scheduledAt asc
 */
function toSafeDate(value) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toNaturalNumber(value, fallback = Number.MAX_SAFE_INTEGER) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function minuteKey(value) {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().slice(0, 16)
}

export async function assertUniqueReminderSlot({ reminderId = null, therapyId, hostId, scheduledAt }) {
    const targetMinute = minuteKey(scheduledAt)
    if (!therapyId || !targetMinute) return

    const allReminders = await (db.reminders?.toArray?.() ?? Promise.resolve([]))
    const duplicate = allReminders.find((item) => {
        if (!item || item.deletedAt) return false
        if (reminderId && item.id === reminderId) return false
        if (item.therapyId !== therapyId) return false
        if (hostId && item.hostId !== hostId) return false
        return minuteKey(item.scheduledAt) === targetMinute
    })

    if (duplicate) {
        throw new Error('Promemoria gia esistente per lo stesso orario')
    }
}

export function buildBedSequenceIndex({ beds = [], rooms = [], bedSequence = [] }) {
    const activeBeds = beds.filter(bed => !bed?.deletedAt)
    const roomById = new Map(rooms.filter(room => !room?.deletedAt).map(room => [room.id, room]))
    const configuredIds = Array.isArray(bedSequence) ? bedSequence : []

    const fallbackSortedBeds = [...activeBeds].sort((a, b) => {
        const roomA = roomById.get(a.roomId)
        const roomB = roomById.get(b.roomId)
        const roomCodeCompare = String(roomA?.codice || roomA?.id || '').localeCompare(String(roomB?.codice || roomB?.id || ''))
        if (roomCodeCompare !== 0) return roomCodeCompare

        const bedNumberCompare = toNaturalNumber(a.numero) - toNaturalNumber(b.numero)
        if (bedNumberCompare !== 0) return bedNumberCompare

        return String(a.id || '').localeCompare(String(b.id || ''))
    })

    const orderedIds = [
        ...configuredIds.filter(id => fallbackSortedBeds.some(bed => bed.id === id)),
        ...fallbackSortedBeds.map(bed => bed.id).filter(id => !configuredIds.includes(id)),
    ]

    return new Map(orderedIds.map((id, index) => [id, index]))
}

function buildStanzaLettoLabel(host, bed, room) {
    const roomLabel = room?.codice || host?.stanza || host?.roomId || '—'
    const bedLabel = bed?.numero || host?.letto || host?.bedId || '—'
    return `${roomLabel}/${bedLabel}`
}

function compareReminderRows(a, b, bedSequenceIndex) {
    const dateA = toSafeDate(a.scheduledAt)
    const dateB = toSafeDate(b.scheduledAt)
    const timeCompare = (dateA?.getTime() ?? Number.MAX_SAFE_INTEGER) - (dateB?.getTime() ?? Number.MAX_SAFE_INTEGER)
    if (timeCompare !== 0) return timeCompare

    const bedOrderA = bedSequenceIndex.get(a.bedId) ?? Number.MAX_SAFE_INTEGER
    const bedOrderB = bedSequenceIndex.get(b.bedId) ?? Number.MAX_SAFE_INTEGER
    if (bedOrderA !== bedOrderB) return bedOrderA - bedOrderB

    const roomCompare = String(a.roomSortKey || '').localeCompare(String(b.roomSortKey || ''))
    if (roomCompare !== 0) return roomCompare

    const bedCompare = toNaturalNumber(a.bedSortKey) - toNaturalNumber(b.bedSortKey)
    if (bedCompare !== 0) return bedCompare

    const hostCompare = String(a.hostLabel || '').localeCompare(String(b.hostLabel || ''))
    if (hostCompare !== 0) return hostCompare

    return String(a.id || '').localeCompare(String(b.id || ''))
}

export function buildReminderRows({ reminders, hosts, drugs, therapies, beds = [], rooms = [], bedSequence = [], dateFilter = 'today', stateFilter = '', residenzaFilter = '', now = new Date() }) {
    const hostsById = new Map(hosts.map(h => [h.id, h]))
    const drugsById = new Map(drugs.map(d => [d.id, d]))
    const therapiesById = new Map(therapies.map(t => [t.id, t]))
    const bedsById = new Map(beds.map(b => [b.id, b]))
    const roomsById = new Map(rooms.map(r => [r.id, r]))
    const bedSequenceIndex = buildBedSequenceIndex({ beds, rooms, bedSequence })

    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)
    const normalizedStateFilters = Array.isArray(stateFilter)
        ? stateFilter.filter(Boolean)
        : (stateFilter ? [stateFilter] : [])
    const stateFilterSet = new Set(normalizedStateFilters)

    // Build a map of therapyId+YYYY-MM-DD → sorted HH:MM time strings for all reminders
    const therapyDayTimes = new Map()
    for (const r of reminders) {
        if (r.deletedAt || !r.therapyId || !r.scheduledAt) continue
        const d = new Date(r.scheduledAt)
        if (Number.isNaN(d.getTime())) continue
        const dayKey = `${r.therapyId}|${d.toISOString().slice(0, 10)}`
        if (!therapyDayTimes.has(dayKey)) therapyDayTimes.set(dayKey, [])
        const hhmm = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })
        therapyDayTimes.get(dayKey).push(hhmm)
    }
    for (const [k, times] of therapyDayTimes) {
        therapyDayTimes.set(k, [...new Set(times)].sort())
    }

    return reminders
        .filter(r => !r.deletedAt)
        .filter(r => {
            if (stateFilterSet.size === 0) return true
            return stateFilterSet.has(r.stato ?? 'DA_ESEGUIRE')
        })
        .filter(r => {
            if (!residenzaFilter) return true
            const host = hostsById.get(r.hostId)
            const bed = bedsById.get(host?.bedId)
            const roomId = host?.roomId ?? bed?.roomId ?? null
            return roomId === residenzaFilter
        })
        .filter(r => {
            const when = new Date(r.scheduledAt)
            if (Number.isNaN(when.getTime())) return true
            if (dateFilter === 'today') return when >= dayStart && when <= dayEnd
            if (dateFilter === 'all') return true
            // Specific YYYY-MM-DD date
            const dayStart2 = new Date(dateFilter + 'T00:00:00')
            const dayEnd2 = new Date(dateFilter + 'T23:59:59.999')
            return when >= dayStart2 && when <= dayEnd2
        })
        .map(r => {
            const therapy = therapiesById.get(r.therapyId)
            const host = hostsById.get(r.hostId)
            const drug = drugsById.get(r.drugId ?? therapy?.drugId)
            const bed = bedsById.get(host?.bedId)
            const room = roomsById.get(host?.roomId ?? bed?.roomId)
            const fullName = host ? [host.cognome, host.nome].filter(Boolean).join(' ').trim() : ''
            const hostName = fullName || host?.iniziali || host?.codiceInterno || r.hostId
            const scheduledDay = r.scheduledAt ? new Date(r.scheduledAt).toISOString().slice(0, 10) : null
            const dailyScheduleTimes = (scheduledDay && r.therapyId)
                ? (therapyDayTimes.get(`${r.therapyId}|${scheduledDay}`) ?? null)
                : null
            return {
                ...r,
                bedId: host?.bedId ?? null,
                roomId: host?.roomId ?? bed?.roomId ?? null,
                hostLabel: hostName,
                stanzaLetto: host ? buildStanzaLettoLabel(host, bed, room) : '—',
                drugLabel: drug?.principioAttivo ?? (r.drugId ?? '—'),
                stato: r.stato ?? 'DA_ESEGUIRE',
                dosePerSomministrazione: therapy?.dosePerSomministrazione ?? null,
                somministrazioniGiornaliere: therapy?.somministrazioniGiornaliere ?? null,
                consumoMedioSettimanale: therapy?.consumoMedioSettimanale ?? null,
                dailyScheduleTimes,
                dataInizio: therapy?.dataInizio ?? null,
                dataFine: therapy?.dataFine ?? null,
                roomSortKey: room?.codice || host?.stanza || host?.roomId || '',
                bedSortKey: bed?.numero || host?.letto || host?.bedId || '',
                residenzaId: room?.id ?? host?.roomId ?? null,
                residenzaLabel: room?.codice || host?.stanza || '—',
            }
        })
        .sort((a, b) => compareReminderRows(a, b, bedSequenceIndex))
}

/**
 * Determina il colore/badge per uno stato promemoria.
 */
export function reminderStateBadge(stato) {
    if (stato === 'ESEGUITO') return 'state-ok'
    if (stato === 'SALTATO') return 'state-skip'
    if (stato === 'POSTICIPATO') return 'state-warn'
    if (stato === 'ANNULLATO') return 'state-cancel'
    return 'state-pending'
}

/**
 * Mappa stato promemoria a colore/stile per il pulsante.
 */
export function reminderActionButtonColor(outcome) {
    if (outcome === 'ESEGUITO') return { bg: '#d1fae5', text: '#065f46' }
    if (outcome === 'POSTICIPATO') return { bg: '#fef3c7', text: '#92400e' }
    if (outcome === 'SALTATO') return { bg: '#fed7aa', text: '#9a3412' }
    if (outcome === 'ANNULLATO') return { bg: '#fee2e2', text: '#991b1b' }
    return { bg: '#e5e7eb', text: '#1f2937' }
}

export function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

// ── Side-effecting operations ──────────────────────────────────────────────────

/**
 * Registra l'esito di un promemoria (ESEGUITO | SALTATO | POSTICIPATO | ANNULLATO).
 * Se ESEGUITO, deducere la dose dalla terapia e creare movimento in scorte.
 * Aggiorna il record reminder, enquea sync, registra audit log.
 */
export async function markReminder({ reminderId, outcome, operatorId = null, note = '' }) {
    if (!REMINDER_OUTCOMES.includes(outcome)) {
        throw new Error(`Esito non valido: ${outcome}. Attesi: ${REMINDER_OUTCOMES.join(', ')}`)
    }

    const existing = await db.reminders.get(reminderId)
    if (!existing) throw new Error(`Promemoria ${reminderId} non trovato.`)

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const updated = {
        ...existing,
        stato: outcome,
        eseguitoAt: outcome === 'ESEGUITO' ? now : (existing.eseguitoAt ?? null),
        operatore: operatorId ?? existing.operatore,
        note: note || existing.note || '',
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.reminders, db.syncQueue, db.activityLog, db.movements, db.stockBatches, db.therapies, async () => {
        await db.reminders.put(updated)
        await enqueue('reminders', reminderId, 'upsert')

        // Se ESEGUITO, deducere dal magazzino
        if (outcome === 'ESEGUITO') {
            const therapy = await db.therapies.get(existing.therapyId)
            if (therapy && !therapy.deletedAt) {
                const dosePerSomministrazione = therapy.dosePerSomministrazione ?? 1

                // Trovare batch di magazzino per il farmaco
                const batches = await db.stockBatches
                    .where('drugId')
                    .equals(therapy.drugId)
                    .toArray()
                const batchDaScarico = batches.find(b => !b.deletedAt && b.quantitaAttuale > 0)

                if (batchDaScarico) {
                    const newQty = Math.max(0, batchDaScarico.quantitaAttuale - dosePerSomministrazione)
                    const updatedBatch = {
                        ...batchDaScarico,
                        quantitaAttuale: newQty,
                        updatedAt: now,
                        syncStatus: 'pending',
                    }
                    await db.stockBatches.put(updatedBatch)
                    await enqueue('stockBatches', batchDaScarico.id, 'upsert')

                    // Creare movimento SOMMINISTRAZIONE
                    const movement = {
                        id: `__movement_${reminderId}_${now.replace(/[^0-9]/g, '')}`,
                        type: 'SOMMINISTRAZIONE',
                        drugId: therapy.drugId,
                        batchId: batchDaScarico.id,
                        quantita: dosePerSomministrazione,
                        hostId: existing.hostId,
                        therapyId: existing.therapyId,
                        reminderId: reminderId,
                        note: `Somministrazione registrata: ${existing.note || 'somministrazione'}`,
                        createdAt: now,
                        createdBy: operatorId ?? 'system',
                        syncStatus: 'pending',
                    }
                    await db.movements.put(movement)
                    await enqueue('movements', movement.id, 'upsert')
                }
            }
        }

        await db.activityLog.add({
            entityType: 'reminders',
            entityId: reminderId,
            action: `reminder_${outcome.toLowerCase()}`,
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return updated
}

export const promemoriaTestUtils = {
    buildReminderRows,
    buildBedSequenceIndex,
    reminderStateBadge,
    compareReminderRows,
    startOfDay,
    endOfDay,
    assertUniqueReminderSlot,
}
