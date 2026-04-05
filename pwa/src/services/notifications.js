import { db, getSetting, setSetting } from '../db'

const NOTIFIED_REMINDERS_KEY = 'notifiedReminders'
const PUSH_SUBSCRIPTION_KEY = 'pushSubscription'
const NOTIFICATION_LOOKAHEAD_MINUTES = Number.parseInt(import.meta.env.VITE_REMINDER_LOOKAHEAD_MINUTES || '10', 10)
const NOTIFICATION_POLL_INTERVAL_MS = Number.parseInt(import.meta.env.VITE_REMINDER_POLL_INTERVAL_MS || '60000', 10)
const NOTIFICATION_REPEAT_COOLDOWN_MINUTES = Number.parseInt(import.meta.env.VITE_REMINDER_REPEAT_COOLDOWN_MINUTES || '120', 10)
const NOTIFICATION_RETENTION_HOURS = Number.parseInt(import.meta.env.VITE_REMINDER_RETENTION_HOURS || '24', 10)
const UPCOMING_WINDOW_HOURS = 24

let loopHandle = null
let clickListenerInstalled = false

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

function isPushApiSupported() {
    return typeof window !== 'undefined'
        && typeof navigator !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
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
        reason: supported
            ? permission === 'granted'
                ? 'ready'
                : permission === 'denied'
                    ? 'blocked-by-browser'
                    : 'permission-required'
            : 'api-unsupported',
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
        data: {
            route: '/impostazioni',
        },
    })
}

export function hasConfiguredVapidPublicKey() {
    return Boolean(String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim())
}

function serializePushSubscription(subscription) {
    if (!subscription) return null
    if (typeof subscription.toJSON === 'function') return subscription.toJSON()
    return {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: subscription.keys ?? null,
    }
}

function urlBase64ToUint8Array(base64String) {
    const normalized = String(base64String || '').replace(/-/g, '+').replace(/_/g, '/')
    const pad = '='.repeat((4 - (normalized.length % 4)) % 4)
    const encoded = normalized + pad
    const raw = atob(encoded)
    const output = new Uint8Array(raw.length)

    for (let i = 0; i < raw.length; i += 1) {
        output[i] = raw.charCodeAt(i)
    }

    return output
}

async function getServiceWorkerReadyRegistration() {
    if (!isPushApiSupported()) return null
    return navigator.serviceWorker.ready
}

function pushReasonFromStatus({ supported, subscription, hasVapidKey }) {
    if (!supported) return 'api-unsupported'
    if (!hasVapidKey) return 'missing-vapid-public-key'
    if (subscription) return 'subscribed'
    return 'subscription-required'
}

export async function getPushSubscriptionStatusSnapshot() {
    const supported = isPushApiSupported()
    const hasVapidKey = hasConfiguredVapidPublicKey()

    if (!supported) {
        return {
            supported,
            hasVapidKey,
            subscribed: false,
            endpoint: null,
            reason: pushReasonFromStatus({ supported, hasVapidKey, subscription: null }),
        }
    }

    const registration = await getServiceWorkerReadyRegistration()
    const subscription = registration ? await registration.pushManager.getSubscription() : null

    return {
        supported,
        hasVapidKey,
        subscribed: Boolean(subscription),
        endpoint: subscription?.endpoint ?? null,
        reason: pushReasonFromStatus({ supported, hasVapidKey, subscription }),
    }
}

export async function subscribeToPushNotifications() {
    if (!isPushApiSupported()) {
        return getPushSubscriptionStatusSnapshot()
    }

    const permissionSnapshot = await requestNotificationPermission()
    if (!permissionSnapshot.enabled) {
        throw new Error('Permesso notifiche non concesso')
    }

    const vapidPublicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim()
    if (!vapidPublicKey) {
        throw new Error('Configura VITE_VAPID_PUBLIC_KEY per abilitare la sottoscrizione push')
    }

    const registration = await getServiceWorkerReadyRegistration()
    if (!registration) {
        throw new Error('Service Worker non disponibile per Push API')
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
    }

    await setSetting(PUSH_SUBSCRIPTION_KEY, serializePushSubscription(subscription))
    return getPushSubscriptionStatusSnapshot()
}

export async function unsubscribeFromPushNotifications() {
    if (!isPushApiSupported()) {
        return getPushSubscriptionStatusSnapshot()
    }

    const registration = await getServiceWorkerReadyRegistration()
    const subscription = registration ? await registration.pushManager.getSubscription() : null
    if (subscription) {
        await subscription.unsubscribe()
    }

    await setSetting(PUSH_SUBSCRIPTION_KEY, null)
    return getPushSubscriptionStatusSnapshot()
}

export function computeUpcomingReminders24h({ reminders, hosts, drugs, therapies, now = nowMs() }) {
    const start = Number(now)
    const end = start + (UPCOMING_WINDOW_HOURS * 60 * 60 * 1000)
    const hostsById = new Map((Array.isArray(hosts) ? hosts : []).map(host => [host.id, host]))
    const therapiesById = new Map((Array.isArray(therapies) ? therapies : []).map(therapy => [therapy.id, therapy]))
    const drugsById = new Map((Array.isArray(drugs) ? drugs : []).map(drug => [drug.id, drug]))

    return (Array.isArray(reminders) ? reminders : [])
        .filter(reminder => !reminder?.deletedAt)
        .filter(isReminderPending)
        .filter(reminder => {
            const ts = toMillis(reminder.scheduledAt)
            return Number.isFinite(ts) && ts >= start && ts <= end
        })
        .map(reminder => {
            const host = hostsById.get(reminder.hostId)
            const therapy = therapiesById.get(reminder.therapyId)
            const drug = drugsById.get(reminder.drugId ?? therapy?.drugId)
            const hostName = host
                ? [host.cognome, host.nome].filter(Boolean).join(' ').trim() || host.codiceInterno || host.iniziali || host.id
                : reminder.hostId

            return {
                id: reminder.id,
                scheduledAt: reminder.scheduledAt,
                hostLabel: hostName || '—',
                drugLabel: drug?.principioAttivo ?? reminder.drugId ?? '—',
                stato: reminder.stato ?? 'DA_ESEGUIRE',
            }
        })
        .sort((a, b) => toMillis(a.scheduledAt) - toMillis(b.scheduledAt))
}

export async function listUpcomingReminderNotifications24h() {
    const [reminders, hosts, drugs, therapies] = await Promise.all([
        db.reminders.toArray(),
        db.hosts.toArray(),
        db.drugs.toArray(),
        db.therapies.toArray(),
    ])

    return computeUpcomingReminders24h({ reminders, hosts, drugs, therapies, now: nowMs() })
}

async function showNotification(title, options) {
    if (!isBrowserNotificationSupported()) return

    const notification = new Notification(title, options)
    notification.onclick = () => {
        navigateFromNotification(options?.data)
        notification.close?.()
    }
}

function normalizeReminderNotificationsState(value) {
    if (Array.isArray(value)) {
        return Object.fromEntries(value.map(id => [id, 0]))
    }

    if (!value || typeof value !== 'object') return {}
    return value
}

function pruneReminderNotificationsMap(map, now = nowMs(), retentionHours = NOTIFICATION_RETENTION_HOURS) {
    const retentionMs = Math.max(1, retentionHours) * 60 * 60 * 1000
    return Object.fromEntries(
        Object.entries(normalizeReminderNotificationsState(map)).filter(([, ts]) => now - Number(ts || 0) <= retentionMs),
    )
}

export function computeNotifiableReminders({ reminders, notifiedIds, now = nowMs(), lookAheadMinutes = NOTIFICATION_LOOKAHEAD_MINUTES, repeatCooldownMinutes = NOTIFICATION_REPEAT_COOLDOWN_MINUTES }) {
    const lookAheadMs = Math.max(1, lookAheadMinutes) * 60 * 1000
    const cutoff = now + lookAheadMs
    const cooldownMs = Math.max(1, repeatCooldownMinutes) * 60 * 1000
    const notifiedMap = normalizeReminderNotificationsState(notifiedIds)

    return (Array.isArray(reminders) ? reminders : [])
        .filter(reminder => {
            if (!reminder?.id || !reminder?.scheduledAt) return false
            if (!isReminderPending(reminder)) return false

            const ts = toMillis(reminder.scheduledAt)
            if (!Number.isFinite(ts)) return false
            const lastNotifiedAt = Number(notifiedMap[reminder.id] ?? 0)
            const isCoolingDown = lastNotifiedAt > 0 && now - lastNotifiedAt < cooldownMs
            return ts <= cutoff && !isCoolingDown
        })
        .sort((a, b) => toMillis(a.scheduledAt) - toMillis(b.scheduledAt))
}

function mergeReminderNotificationState(previous, reminderIds, now = nowMs()) {
    const next = {
        ...pruneReminderNotificationsMap(previous, now),
    }

    for (const reminderId of reminderIds) {
        next[reminderId] = now
    }

    return next
}

function buildReminderRoute(reminderId) {
    if (!reminderId) return '/promemoria'
    return `/promemoria?highlight=${encodeURIComponent(reminderId)}`
}

function navigateFromNotification(data) {
    if (typeof window === 'undefined') return
    const route = data?.route || buildReminderRoute(data?.reminderId)
    window.location.hash = `#${route}`
    window.focus?.()
}

async function pollAndNotifyDueReminders() {
    const status = getNotificationStatusSnapshot()
    if (!status.enabled) return

    const [reminders, notifiedState] = await Promise.all([
        db.reminders.toArray(),
        getSetting(NOTIFIED_REMINDERS_KEY, {}),
    ])

    const now = nowMs()
    const due = computeNotifiableReminders({ reminders, notifiedIds: notifiedState, now })
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
                route: buildReminderRoute(reminder.id),
            },
        })
        notifiedThisRun.push(reminder.id)
    }

    await setSetting(NOTIFIED_REMINDERS_KEY, mergeReminderNotificationState(notifiedState, notifiedThisRun, now))
}

export async function triggerReminderNotificationsCheck() {
    await pollAndNotifyDueReminders()
}

async function ensureNotificationClickBridge() {
    if (clickListenerInstalled || typeof navigator === 'undefined' || !navigator.serviceWorker) return

    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'meditrace-notification-click') {
            navigateFromNotification(event.data)
        }
    })
    clickListenerInstalled = true
}

export function startReminderNotificationsLoop() {
    if (loopHandle || typeof window === 'undefined') return

    void ensureNotificationClickBridge()
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
    isPushApiSupported,
    normalizePermission,
    normalizeReminderNotificationsState,
    pruneReminderNotificationsMap,
    mergeReminderNotificationState,
    buildReminderRoute,
    hasConfiguredVapidPublicKey,
    urlBase64ToUint8Array,
}
