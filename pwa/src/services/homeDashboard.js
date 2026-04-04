import { db, getSetting, getSyncState } from '../db'
import { buildOperationalReport } from './reporting'

function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date = new Date()) {
    const start = startOfDay(date)
    return new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1)
}

export async function buildHomeDashboardKpis(now = new Date()) {
    const [report, reminders, pendingSync, datasetVersion, lastSyncAt] = await Promise.all([
        buildOperationalReport(),
        db.reminders.toArray(),
        db.syncQueue.count(),
        getSetting('datasetVersion', null),
        getSyncState('lastSyncAt', null),
    ])

    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)

    const remindersToday = reminders
        .filter(item => !item.deletedAt)
        .filter(item => {
            const when = new Date(item.scheduledAt)
            if (Number.isNaN(when.getTime())) return false
            return when >= dayStart && when <= dayEnd
        })

    const remindersPending = remindersToday.filter(item => (item.stato ?? 'DA_ESEGUIRE') !== 'ESEGUITO').length
    const remindersDone = remindersToday.filter(item => item.stato === 'ESEGUITO').length

    return {
        datasetVersion,
        lastSyncAt,
        pendingSync,
        stockCritical: report.summary.critical,
        stockHigh: report.summary.high,
        monitoredDrugs: report.summary.totalDrugs,
        remindersToday: remindersToday.length,
        remindersPending,
        remindersDone,
    }
}

export const homeDashboardTestUtils = {
    startOfDay,
    endOfDay,
}
