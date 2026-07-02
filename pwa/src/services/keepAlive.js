/**
 * Supabase Keep-Alive Service
 *
 * Supabase free tier pauses projects after 7 days of inactivity.
 * This service checks if the local DB has been "touched" in the last 6 days
 * and, if not, performs a lightweight read to keep the project alive.
 */

import { db, getSetting, setSetting, getSyncState } from '../db'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const KEEP_ALIVE_SETTING = 'keepAliveEnabled'
const LAST_ALIVE_PING = 'lastKeepAlivePing'
const INACTIVITY_DAYS_THRESHOLD = 6
const PING_COOLDOWN_HOURS = 23 // ping at most once every 23 hours

/**
 * Check whether keep-alive is enabled.
 */
export async function isKeepAliveEnabled() {
    if (!isSupabaseConfigured) return false
    try {
        return await getSetting(KEEP_ALIVE_SETTING, false)
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

        // Fallback: check datasetVersion timestamp (when it was set)
        return null
    } catch {
        return null
    }
}

/**
 * Perform a lightweight ping to Supabase to keep the project alive.
 */
async function pingSupabase() {
    if (!isSupabaseConfigured) return false
    try {
        // Simple lightweight query
        const { error } = await supabase
            .from('sync_files')
            .select('id', { count: 'exact', head: true })
            .limit(1)

        if (error) {
            console.warn('[keepAlive] Ping error:', error.message)
            return false
        }

        await setSetting(LAST_ALIVE_PING, new Date().toISOString())
        console.log('[keepAlive] Ping successful')
        return true
    } catch (err) {
        console.warn('[keepAlive] Ping failed:', err.message)
        return false
    }
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
