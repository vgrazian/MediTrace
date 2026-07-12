import { upsertRecord } from './dataService'
/**
 * dataPruning.js — Automatic data pruning to keep sync payloads lean
 *
 * Motivazione: movements e reminders sono append-only e crescono illimitatamente.
 * Dopo 30-90 giorni i dati storici granulari non servono più al caso d'uso operativo.
 *
 * Strategia:
 *  - Reminders: soft-delete quelli completati/annullati da >30 giorni
 *  - Movements: soft-delete quelli più vecchi di 90 giorni
 *  - activityLog: elimina eventi >90 giorni (solo locale, non sync)
 *  - Esegue al massimo una volta al giorno
 */
import { db, getSetting, setSetting } from '../db'

const PRUNING_LAST_RUN_KEY = 'pruningLastRunIso'
const PRUNING_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000
const REMINDER_MAX_AGE_DAYS = 30
const MOVEMENT_MAX_AGE_DAYS = 90
const ACTIVITY_LOG_MAX_AGE_DAYS = 90

export async function pruneStaleData() {
    const lastRun = await getSetting(PRUNING_LAST_RUN_KEY, null)
    const now = Date.now()

    if (lastRun) {
        const elapsed = now - new Date(lastRun).getTime()
        if (elapsed < PRUNING_MIN_INTERVAL_MS) {
            return { pruned: false, reason: 'too-soon', lastRun }
        }
    }

    const nowIso = new Date().toISOString()
    const stats = { reminders: 0, movements: 0, activityLog: 0 }

    try {
        stats.reminders = await pruneOldReminders(REMINDER_MAX_AGE_DAYS, nowIso)
        stats.movements = await pruneOldMovements(MOVEMENT_MAX_AGE_DAYS, nowIso)
        stats.activityLog = await pruneOldActivityLog(ACTIVITY_LOG_MAX_AGE_DAYS)
        await setSetting(PRUNING_LAST_RUN_KEY, nowIso)
        return { pruned: true, stats }
    } catch (err) {
        console.error('[dataPruning] Error during pruning:', err)
        return { pruned: false, reason: 'error', error: err.message }
    }
}

async function pruneOldReminders(maxAgeDays, nowIso) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - maxAgeDays)
    const cutoffIso = cutoff.toISOString()

    const oldReminders = await db.reminders
        .filter(r => !r.deletedAt && r.stato !== 'DA_ESEGUIRE' && r.updatedAt < cutoffIso)
        .toArray()

    let count = 0
    for (const reminder of oldReminders) {
        await db.reminders.put({ ...reminder, deletedAt: nowIso, updatedAt: nowIso })
        count++
    }
    if (count > 0) console.log(`[dataPruning] Soft-deleted ${count} old reminders (>${maxAgeDays} days)`)
    return count
}

async function pruneOldMovements(maxAgeDays, nowIso) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - maxAgeDays)
    const cutoffIso = cutoff.toISOString()

    const oldMovements = await db.movements
        .filter(m => !m.deletedAt && (m.dataMovimento || m.updatedAt || '') < cutoffIso)
        .toArray()

    let count = 0
    for (const movement of oldMovements) {
        await db.movements.put({ ...movement, deletedAt: nowIso, updatedAt: nowIso, syncStatus: 'pending' })
        count++
    }
    if (count > 0) console.log(`[dataPruning] Soft-deleted ${count} old movements (>${maxAgeDays} days)`)
    return count
}

async function pruneOldActivityLog(maxAgeDays) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - maxAgeDays)
    const cutoffIso = cutoff.toISOString()

    const deletedCount = await db.activityLog.where('ts').below(cutoffIso).delete()
    if (deletedCount > 0) console.log(`[dataPruning] Deleted ${deletedCount} old activityLog entries (>${maxAgeDays} days)`)
    return deletedCount
}
