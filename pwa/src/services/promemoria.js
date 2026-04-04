/**
 * promemoria.js — Helpers per la vista Promemoria operativa
 *
 * Logica pura separata dalla UI per facilitare i test unitari:
 *   - buildReminderRows()   filtra e arricchisce i promemoria con label ospite/farmaco
 *   - markReminder()        registra l'esito di una somministrazione (scrive su DB)
 *   - VALID_STATES / OUTCOMES
 */
import { db, enqueue, getSetting } from '../db'

export const REMINDER_OUTCOMES = ['ESEGUITO', 'SALTATO', 'POSTICIPATO']

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
 * @param {string} params.stateFilter — '' | 'DA_ESEGUIRE' | 'ESEGUITO' | 'SALTATO' | 'POSTICIPATO'
 * @param {Date}   params.now         — riferimento temporale
 * @returns {Array} reminders arricchiti, ordinati per scheduledAt asc
 */
export function buildReminderRows({ reminders, hosts, drugs, therapies, dateFilter = 'today', stateFilter = '', now = new Date() }) {
    const hostsById = new Map(hosts.map(h => [h.id, h]))
    const drugsById = new Map(drugs.map(d => [d.id, d]))
    const therapiesById = new Map(therapies.map(t => [t.id, t]))

    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)

    return reminders
        .filter(r => !r.deletedAt)
        .filter(r => {
            if (!stateFilter) return true
            return (r.stato ?? 'DA_ESEGUIRE') === stateFilter
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
            return {
                ...r,
                hostLabel: host ? (host.codiceInterno || host.iniziali || host.id) : (r.hostId ?? '—'),
                stanzaLetto: host ? `${host.stanza || '—'}/${host.letto || '—'}` : '—',
                drugLabel: drug?.principioAttivo ?? (r.drugId ?? '—'),
                stato: r.stato ?? 'DA_ESEGUIRE',
            }
        })
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
}

/**
 * Determina il colore/badge per uno stato promemoria.
 */
export function reminderStateBadge(stato) {
    if (stato === 'ESEGUITO') return 'state-ok'
    if (stato === 'SALTATO') return 'state-skip'
    if (stato === 'POSTICIPATO') return 'state-warn'
    return 'state-pending'
}

export function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

// ── Side-effecting operations ──────────────────────────────────────────────────

/**
 * Registra l'esito di un promemoria (ESEGUITO | SALTATO | POSTICIPATO).
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

    await db.transaction('rw', db.reminders, db.syncQueue, db.activityLog, async () => {
        await db.reminders.put(updated)
        await enqueue('reminders', reminderId, 'upsert')
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
    reminderStateBadge,
    startOfDay,
    endOfDay,
}
