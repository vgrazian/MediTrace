/**
 * Supabase Keep-Alive Service
 *
 * Supabase free tier pauses projects after 7 days of inactivity.
 * This service checks if the local DB has been "touched" in the last 7 days
 * and, if not, performs a lightweight read to keep the project alive.
 * Also reads back the last ping timestamp from Supabase for visual feedback.
 */

import { db, getSetting, setSetting, getSyncState } from '../db'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const KEEP_ALIVE_SETTING = 'keepAliveEnabled'
const LAST_ALIVE_PING = 'lastKeepAlivePing'
const INACTIVITY_DAYS_THRESHOLD = 7
const PING_COOLDOWN_HOURS = 23 // ping at most once every 23 hours

/**
 * Check whether keep-alive is enabled.
 */
export async function isKeepAliveEnabled() {
    if (!isSupabaseConfigured) return false
    try {
        return await getSetting(KEEP_ALIVE_SETTING, true)
    } catch {
        return false
    }
}

/**
 * Enable or disable keep-alive.
 */
export async function setKeepAliveEnabled(enabled) {
    await setSetting(KEEP_ALIVE_SETTING, !!enabled)
}

/**
 * Get the timestamp of the last DB write activity.
 * Uses the most recent sync queue entry or the lastSyncAt setting.
 */
async function getLastDbActivity() {
    try {
        // Check the most recent sync queue entry
        const latestQueueEntry = await db.syncQueue.orderBy('timestamp').reverse().first()
        if (latestQueueEntry?.timestamp) {
            return new Date(latestQueueEntry.timestamp)
        }

        // Fallback: check lastSyncAt
        const lastSync = await getSyncState('lastSyncAt', null)
        if (lastSync) {
            return new Date(lastSync)
        }

        return null
    } catch {
        return null
    }
}

/**
 * Read the last keep-alive ping timestamp from Supabase.
 * This is a lightweight SELECT — purely for status display.
 */
async function getLastSupabasePing() {
    if (!isSupabaseConfigured || !supabase) return null
    try {
        const { data, error } = await supabase
            .from('sync_files')
            .select('updated_at')
            .eq('name', '_keep_alive')
            .maybeSingle()

        if (error || !data?.updated_at) return null
        return new Date(data.updated_at)
    } catch {
        return null
    }
}

/**
 * Get comprehensive keep-alive status for UI display.
 * Returns:
 *  - isOk: true if there was activity (local or ping) within threshold days
 *  - lastLocalActivity: Date | null (last IndexedDB write)
 *  - lastSupabasePing: Date | null (last ping read from Supabase)
 *  - daysSinceActivity: number | null (days since most recent activity of any kind)
 *  - enabled: boolean
 */
export async function getKeepAliveStatus() {
    const enabled = await isKeepAliveEnabled()
    if (!enabled) {
        return { isOk: null, lastLocalActivity: null, lastSupabasePing: null, daysSinceActivity: null, enabled: false }
    }

    const [lastActivity, lastPing] = await Promise.all([
        getLastDbActivity(),
        getLastSupabasePing(),
    ])

    const now = new Date()

    // The most recent timestamp of ANY activity (local DB or Supabase ping)
    const mostRecent = [lastActivity, lastPing]
        .filter(Boolean)
        .reduce((latest, d) => (d > latest ? d : latest), new Date(0))

    const hasAnyActivity = mostRecent.getTime() > 0
    const daysSinceActivity = hasAnyActivity
        ? (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
        : null

    const isOk = hasAnyActivity && daysSinceActivity < INACTIVITY_DAYS_THRESHOLD

    return {
        isOk,
        lastLocalActivity: lastActivity,
        lastSupabasePing: lastPing,
        daysSinceActivity,
        enabled: true,
    }
}

/**
 * Perform a lightweight READ on Supabase to keep the project alive.
 * A simple SELECT is sufficient to count as activity for Supabase free tier.
 * Retries up to 3 times with exponential backoff.
 */
async function pingSupabase() {
    if (!isSupabaseConfigured || !supabase) return false

    const maxRetries = 3
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Lightweight read: just check the _keep_alive row exists
            const { error } = await supabase
                .from('sync_files')
                .select('name')
                .eq('name', '_keep_alive')
                .limit(1)

            if (error) {
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
                    continue
                }
                console.warn('[keepAlive] Ping read error after retries:', error.message)
                return false
            }

            await setSetting(LAST_ALIVE_PING, new Date().toISOString())
            return true
        } catch (err) {
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
                continue
            }
            console.warn('[keepAlive] Ping failed after retries:', err.message)
            return false
        }
    }
    return false
}

/**
 * Run the keep-alive check.
 * - If keep-alive is disabled, do nothing.
 * - If the last DB activity was more than INACTIVITY_DAYS_THRESHOLD days ago,
 *   and we haven't pinged in the last PING_COOLDOWN_HOURS hours,
 *   perform a ping.
 */
export async function runKeepAliveCheck() {
    if (!isSupabaseConfigured) return

    const enabled = await isKeepAliveEnabled()
    if (!enabled) return

    const lastActivity = await getLastDbActivity()
    const now = new Date()

    // If we have recent activity (within threshold), no need to ping
    if (lastActivity) {
        const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceActivity < INACTIVITY_DAYS_THRESHOLD) {
            return // DB is active enough
        }
    }

    // Check cooldown: don't ping too frequently
    try {
        const lastPingStr = await getSetting(LAST_ALIVE_PING, null)
        if (lastPingStr) {
            const lastPing = new Date(lastPingStr)
            const hoursSincePing = (now.getTime() - lastPing.getTime()) / (1000 * 60 * 60)
            if (hoursSincePing < PING_COOLDOWN_HOURS) {
                return // Within cooldown period
            }
        }
    } catch { /* proceed with ping */ }

    await pingSupabase()
}

/**
 * Start periodic keep-alive checks.
 * Checks once on startup, then every 6 hours.
 */
let intervalId = null

export function startKeepAlive() {
    if (!isSupabaseConfigured) return

    // Run immediately on startup
    runKeepAliveCheck()

    // Then every 6 hours
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(runKeepAliveCheck, 6 * 60 * 60 * 1000)
}

export function stopKeepAlive() {
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
    }
}
