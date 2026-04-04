import { db, getSetting, setSetting } from '../db'

const NOTIFIED_REMINDER_IDS_KEY = 'notifiedReminderIds'
const NOTIFICATION_LOOKAHEAD_MINUTES = Number.parseInt(import.meta.env.VITE_REMINDER_LOOKAHEAD_MINUTES || '10', 10)
const NOTIFICATION_POLL_INTERVAL_MS = Number.parseInt(import.meta.env.VITE_REMINDER_POLL_INTERVAL_MS || '60000', 10)

let loopHandle = null

function nowMs() {
    return Date.now()
}

function toMillis(iso) {
    const parsed = Date.parse(String(iso || ''))
    return Number.isFinite(parsed) ? parsed : NaN
}

function isReminderPending(reminder) {
    const state = String(reminder?.stato ?? 'DA_ESEGUIRE').toUpperCase()
    return state !== 'SOMMINISTRATO' && state !== 'SALTATO'
}

function isBrowserNotificationSupported() {
    return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

function normalizePermission(permission) {
    if (permission === 'granted' || permission === 'denied' || permission === 'default') return permission
    return 'default'
}

export function getNotificationStatusSnapshot() {
    const supported = isBrowserNotificationSupported()
    const permission = supported ? normalizePermission(Notification.permission) : 'unsupported'
    return {
        supported,
        permission,
        enabled: supported && permission === 'granted',
    }
}

export async function requestNotificationPermission() {
    if (!isBrowserNotificationSupported()) {
        return getNotificationStatusSnapshot()
    }

    const permission = normalizePermission(await Notification.requestPermission())
    await setSetting('notificationPermission', permission)
    return {
        supported: true,
        permission,
        enabled: permission === 'granted',
    }
}

export async function sendTestNotification() {
    const status = getNotificationStatusSnapshot()
    if (!status.enabled) throw new Error('Notifiche non abilitate')

    await showNotification('MediTrace', {
        body: 'Notifiche promemoria attive su questo dispositivo.',
        tag: 'meditrace:test',
    })
}

async function showNotification(title, options) {
    if (!isBrowserNotificationSupported()) return

    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.ready) {
        const registration = await navigator.serviceWorker.ready
        if (registration?.showNotification) {
            await registration.showNotification(title, options)
            return
        }
    }

    new Notification(title, options)
}

export function computeNotifiableReminders({ reminders, notifiedIds, now = nowMs(), lookAheadMinutes = NOTIFICATION_LOOKAHEAD_MINUTES }) {
    const lookAheadMs = Math.max(1, lookAheadMinutes) * 60 * 1000
    const cutoff = now + lookAheadMs
    const seenNotified = new Set(Array.isArray(notifiedIds) ? notifiedIds : [])

    return (Array.isArray(reminders) ? reminders : [])
        .filter(reminder => {
            if (!reminder?.id || !reminder?.scheduledAt) return false
            if (!isReminderPending(reminder)) return false
            if (seenNotified.has(reminder.id)) return false

            const ts = toMillis(reminder.scheduledAt)
            if (!Number.isFinite(ts)) return false
            return ts <= cutoff
        })
        .sort((a, b) => toMillis(a.scheduledAt) - toMillis(b.scheduledAt))
}

function appendNotifiedIds(previous, newIds, maxItems = 500) {
    const merged = [...(Array.isArray(previous) ? previous : []), ...newIds]
    if (merged.length <= maxItems) return merged
    return merged.slice(merged.length - maxItems)
}

async function pollAndNotifyDueReminders() {
    const status = getNotificationStatusSnapshot()
    if (!status.enabled) return

    const [reminders, notifiedIds] = await Promise.all([
        db.reminders.toArray(),
        getSetting(NOTIFIED_REMINDER_IDS_KEY, []),
    ])

    const due = computeNotifiableReminders({ reminders, notifiedIds })
    if (due.length === 0) return

    const notifiedThisRun = []
    for (const reminder of due) {
        await showNotification('Promemoria terapia', {
            body: `Somministrazione prevista alle ${new Date(reminder.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            tag: `meditrace:reminder:${reminder.id}`,
            data: {
                reminderId: reminder.id,
                therapyId: reminder.therapyId,
                hostId: reminder.hostId,
            },
        })
        notifiedThisRun.push(reminder.id)
    }

    await setSetting(NOTIFIED_REMINDER_IDS_KEY, appendNotifiedIds(notifiedIds, notifiedThisRun))
}

export function startReminderNotificationsLoop() {
    if (loopHandle || typeof window === 'undefined') return

    void pollAndNotifyDueReminders()
    loopHandle = window.setInterval(() => {
        void pollAndNotifyDueReminders()
    }, Math.max(15000, NOTIFICATION_POLL_INTERVAL_MS))
}

export function stopReminderNotificationsLoop() {
    if (!loopHandle || typeof window === 'undefined') return
    window.clearInterval(loopHandle)
    loopHandle = null
}

export const notificationsTestUtils = {
    toMillis,
    isReminderPending,
    normalizePermission,
    appendNotifiedIds,
}
