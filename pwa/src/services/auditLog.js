/**
 * auditLog.js — Query utilities for activity log inspection
 *
 * Provides queryable interface to activityLog for audit inspection,
 * filtered by operator, date range, action type, or entity.
 */
import { db } from '../db'

/**
 * Query audit events by operator ID
 * @param {string} operatorId — operator identifier
 * @param {number} limit — max results (default: 100)
 * @returns {Promise<Array>} array of audit events
 */
export async function queryByOperator(operatorId, limit = 100) {
    if (!operatorId) return []
    const events = await db.activityLog
        .where('operatorId')
        .equals(operatorId)
        .reverse() // newest first
        .limit(limit)
        .toArray()
    return events
}

/**
 * Query audit events by date range
 * @param {Date|string} startDate — ISO 8601 or Date object
 * @param {Date|string} endDate — ISO 8601 or Date object
 * @param {number} limit — max results (default: 1000)
 * @returns {Promise<Array>} sorted by timestamp descending
 */
export async function queryByDateRange(startDate, endDate, limit = 1000) {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate

    const allEvents = await db.activityLog.toArray()
    const filtered = allEvents
        .filter(e => {
            const ts = new Date(e.ts)
            return ts >= start && ts <= end
        })
        .sort((a, b) => new Date(b.ts) - new Date(a.ts))
        .slice(0, limit)
    return filtered
}

/**
 * Query audit events by action type
 * @param {string} action — action name (e.g., 'host_created', 'sync_downloaded')
 * @param {number} limit — max results (default: 100)
 * @returns {Promise<Array>} audit events matching action
 */
export async function queryByAction(action, limit = 100) {
    if (!action) return []
    const events = await db.activityLog
        .where('action')
        .equals(action)
        .reverse() // newest first
        .limit(limit)
        .toArray()
    return events
}

/**
 * Query audit events by entity type + id
 * @param {string} entityType — type (e.g., 'therapies', 'hosts')
 * @param {string} entityId — specific entity ID (optional; if omitted, all of type)
 * @param {number} limit — max results (default: 100)
 * @returns {Promise<Array>} audit events for entity
 */
export async function queryByEntity(entityType, entityId = null, limit = 100) {
    if (!entityType) return []

    let query = db.activityLog.where('entityType').equals(entityType)
    const results = await query.reverse().limit(limit).toArray()

    if (!entityId) return results
    return results.filter(e => e.entityId === entityId)
}

/**
 * Get recent audit events (newest first)
 * @param {number} limit — max results (default: 50)
 * @returns {Promise<Array>} recent audit events
 */
export async function queryRecent(limit = 50) {
    const events = await db.activityLog
        .reverse()
        .limit(limit)
        .toArray()
    return events
}

/**
 * Get audit event statistics by action
 * @returns {Promise<Object>} map of action -> count
 */
export async function getActionStats() {
    const allEvents = await db.activityLog.toArray()
    const stats = {}
    for (const event of allEvents) {
        stats[event.action] = (stats[event.action] ?? 0) + 1
    }
    return stats
}

/**
 * Get audit event statistics by entity type
 * @returns {Promise<Object>} map of entityType -> count
 */
export async function getEntityStats() {
    const allEvents = await db.activityLog.toArray()
    const stats = {}
    for (const event of allEvents) {
        stats[event.entityType] = (stats[event.entityType] ?? 0) + 1
    }
    return stats
}

/**
 * Get audit event statistics by operator
 * @returns {Promise<Object>} map of operatorId -> count
 */
export async function getOperatorStats() {
    const allEvents = await db.activityLog.toArray()
    const stats = {}
    for (const event of allEvents) {
        const op = event.operatorId ?? 'system'
        stats[op] = (stats[op] ?? 0) + 1
    }
    return stats
}

/**
 * Export all audit events as JSON
 * @returns {Promise<string>} JSON string of all audit events
 */
export async function exportAuditJson() {
    const allEvents = await db.activityLog.toArray()
    return JSON.stringify(allEvents, null, 2)
}

/**
 * Clear all audit events (WARNING: destructive)
 * @returns {Promise<void>}
 */
export async function clearAllAuditEvents() {
    await db.activityLog.clear()
}

/**
 * Summary: count all audit events
 * @returns {Promise<number>} total events
 */
export async function countAllEvents() {
    return await db.activityLog.count()
}

function normalize(value) {
    return String(value || '').trim().toLowerCase()
}

function hasMatch(value, query) {
    if (!query) return true
    return normalize(value).includes(normalize(query))
}

/**
 * Build reference maps for audit enrichment and filtering labels.
 *
 * @returns {Promise<object>} maps for hosts/drugs/therapies/movements/reminders
 */
export async function buildAuditReferences() {
    const [hosts, drugs, therapies, movements, reminders] = await Promise.all([
        db.hosts?.toArray?.() ?? Promise.resolve([]),
        db.drugs?.toArray?.() ?? Promise.resolve([]),
        db.therapies?.toArray?.() ?? Promise.resolve([]),
        db.movements?.toArray?.() ?? Promise.resolve([]),
        db.reminders?.toArray?.() ?? Promise.resolve([]),
    ])

    return {
        hostById: new Map(hosts.map(host => [host.id, host])),
        drugById: new Map(drugs.map(drug => [drug.id, drug])),
        therapyById: new Map(therapies.map(therapy => [therapy.id, therapy])),
        movementById: new Map(movements.map(movement => [movement.id, movement])),
        reminderById: new Map(reminders.map(reminder => [reminder.id, reminder])),
    }
}

function labelHost(host) {
    if (!host) return ''
    const fullName = [host.cognome, host.nome].filter(Boolean).join(' ').trim()
    const code = host.codiceInterno || host.id
    return `[${code}] ${fullName || host.iniziali || host.id}`
}

function labelDrug(drug) {
    if (!drug) return ''
    return String(drug.nomeFarmaco || drug.principioAttivo || drug.id || '').trim()
}

/**
 * Enrich raw audit events with host/drug/therapy references and labels.
 *
 * @param {Array} events
 * @param {object} refs
 * @returns {Array}
 */
export function enrichAuditEvents(events = [], refs = null) {
    if (!refs) return events

    return events.map(event => {
        const enriched = { ...event, hostId: null, drugId: null, therapyId: null }

        if (event.entityType === 'hosts') enriched.hostId = event.entityId
        if (event.entityType === 'drugs') enriched.drugId = event.entityId
        if (event.entityType === 'therapies') enriched.therapyId = event.entityId

        if (event.entityType === 'movements') {
            const movement = refs.movementById.get(event.entityId)
            if (movement) {
                enriched.hostId = movement.hostId || enriched.hostId
                enriched.therapyId = movement.therapyId || enriched.therapyId
                enriched.drugId = movement.drugId || enriched.drugId
            }
        }

        if (event.entityType === 'reminders') {
            const reminder = refs.reminderById.get(event.entityId)
            if (reminder) {
                enriched.hostId = reminder.hostId || enriched.hostId
                enriched.therapyId = reminder.therapyId || enriched.therapyId
                enriched.drugId = reminder.drugId || enriched.drugId
            }
        }

        let therapy = null
        if (enriched.therapyId) {
            therapy = refs.therapyById.get(enriched.therapyId)
            if (therapy) {
                enriched.hostId = enriched.hostId || therapy.hostId || null
                enriched.drugId = enriched.drugId || therapy.drugId || null
            }
        }

        const host = enriched.hostId ? refs.hostById.get(enriched.hostId) : null
        const drug = enriched.drugId ? refs.drugById.get(enriched.drugId) : null

        enriched.hostLabel = labelHost(host)
        enriched.drugLabel = labelDrug(drug)
        const therapyNote = String(therapy?.nomeTerapia || therapy?.notaTerapia || therapy?.note || '').trim()
        enriched.therapyLabel = therapyNote || enriched.therapyId || ''

        return enriched
    })
}

/**
 * Apply UI-level filters to already loaded/enriched events.
 *
 * @param {Array} events
 * @param {object} filters
 * @returns {Array}
 */
export function filterAuditEvents(events = [], filters = {}) {
    const operator = filters.operator || ''
    const host = filters.host || ''
    const drug = filters.drug || ''
    const therapy = filters.therapy || ''
    const action = filters.action || ''
    const entity = filters.entity || ''
    const fromDate = filters.fromDate ? new Date(filters.fromDate) : null
    const toDate = filters.toDate ? new Date(filters.toDate) : null
    if (toDate) toDate.setHours(23, 59, 59, 999)

    return events.filter(event => {
        if (!hasMatch(event.operatorId, operator)) return false
        if (!hasMatch(event.action, action)) return false
        if (!hasMatch(event.entityType, entity)) return false

        if (host) {
            const hostMatch = hasMatch(event.hostId, host) || hasMatch(event.hostLabel, host)
            if (!hostMatch) return false
        }

        if (drug) {
            const drugMatch = hasMatch(event.drugId, drug) || hasMatch(event.drugLabel, drug)
            if (!drugMatch) return false
        }

        if (therapy) {
            const therapyMatch = hasMatch(event.therapyId, therapy) || hasMatch(event.therapyLabel, therapy)
            if (!therapyMatch) return false
        }

        if (fromDate || toDate) {
            const ts = new Date(event.ts)
            if (fromDate && ts < fromDate) return false
            if (toDate && ts > toDate) return false
        }

        return true
    })
}
