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
