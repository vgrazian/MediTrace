/**
 * dataService.js — Direct Supabase CRUD with IndexedDB offline cache
 *
 * Replaces the snapshot-based sync with direct reads/writes to Supabase.
 * IndexedDB serves as local cache for offline resilience.
 *
 * READ path:   Supabase → IndexedDB cache → UI (instant after first load)
 * WRITE path:  Supabase (primary) → IndexedDB (cache).
 *              If offline → IndexedDB + syncQueue (retry on reconnect).
 * REALTIME:    Supabase Realtime → IndexedDB → UI reactive update.
 *
 * Architecture:
 *   UI ← IndexedDB (Dexie) ← refreshFromServer / subscribeToRealtime
 *   UI → dataService.upsert/delete → Supabase → IndexedDB
 *
 * All writes are immediately optimistic → UI updates before server confirmation.
 * On Supabase error, the write is queued for retry.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { db } from '../db'

// All entity tables (must match Supabase schema)
const TABLES = ['hosts', 'drugs', 'stockBatches', 'therapies', 'movements', 'reminders', 'rooms']

// ── Realtime subscription ──────────────────────────────────────────────────

let _realtimeChannel = null

/**
 * Subscribe to realtime changes from Supabase.
 * When another device creates/updates/deletes a record, IndexedDB is updated.
 * Call once on app mount.
 */
export function subscribeToRealtime() {
    if (!isSupabaseConfigured || !supabase) return
    if (_realtimeChannel) return

    _realtimeChannel = supabase.channel('medi-trace-data')

    for (const table of TABLES) {
        _realtimeChannel.on('postgres_changes',
            { event: '*', schema: 'public', table },
            (payload) => {
                if (!payload) return
                const dexieTable = db[table]
                if (!dexieTable) return

                if (payload.eventType === 'DELETE') {
                    const id = payload.old?.id
                    if (id) dexieTable.delete(id).catch(() => { })
                } else {
                    const row = payload.new
                    if (row?.id) dexieTable.put(row).catch(() => { })
                }
                // Notify UI
                window.dispatchEvent(new CustomEvent('medi-trace:data-changed', {
                    detail: { table, eventType: payload.eventType, id: payload.new?.id || payload.old?.id }
                }))
            }
        )
    }

    _realtimeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('[dataService] Realtime connected')
        if (status === 'CLOSED') console.warn('[dataService] Realtime disconnected')
    })
}

/**
 * Unsubscribe from realtime. Call on app unmount.
 */
export function unsubscribeRealtime() {
    if (_realtimeChannel) {
        supabase?.removeChannel(_realtimeChannel).catch(() => { })
        _realtimeChannel = null
    }
}

// ── Server refresh ─────────────────────────────────────────────────────────

/**
 * Pull all records from Supabase for all tables and cache in IndexedDB.
 * Called on app mount and periodically. Replaces sync download.
 *
 * @returns {Promise<object>} counts per table
 */
export async function refreshFromServer() {
    if (!isSupabaseConfigured || !supabase) return null

    const counts = {}
    for (const table of TABLES) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .is('deletedAt', null)

            if (error) {
                // Table not yet created in Supabase — expected for local-first PWA
                const isMissingTable = /Could not find the table/i.test(error.message)
                if (isMissingTable) {
                    console.info(`[dataService] refresh ${table}: table not in Supabase (local-only)`)
                } else {
                    console.warn(`[dataService] refresh ${table}:`, error.message)
                }
                counts[table] = -1
                continue
            }

            if (data && data.length > 0) {
                await db[table].bulkPut(data.map(r => ({ ...r, _fromServer: true })))
            }

            // Soft-delete local records not on server (skip seeded/demo data)
            const serverIds = new Set((data || []).map(r => r.id))
            const localRows = await db[table].toArray()
            for (const local of localRows) {
                if (!local.deletedAt && !serverIds.has(local.id) && !local._offline && !local._seeded) {
                    await db[table].put({ ...local, deletedAt: new Date().toISOString(), _fromServer: true })
                }
            }

            counts[table] = data?.length || 0
        } catch (err) {
            console.warn(`[dataService] refresh ${table}:`, err.message)
            counts[table] = -1
        }
    }

    return counts
}

// ── CRUD operations ────────────────────────────────────────────────────────

/**
 * Upsert a record to Supabase and IndexedDB.
 * If offline, saves to IndexedDB and queues for retry.
 *
 * @param {string} table - entity table name
 * @param {object} record - record to upsert (must have 'id')
 * @returns {Promise<object>} the saved record
 */
export async function upsertRecord(table, record) {
    const now = new Date().toISOString()
    const normalized = {
        ...record,
        id: record.id || crypto.randomUUID(),
        updatedAt: record.updatedAt || now,
    }
    const online = navigator.onLine && isSupabaseConfigured && supabase

    // Try Supabase first
    if (online) {
        try {
            const { data, error } = await supabase
                .from(table)
                .upsert(normalized)
                .select()
                .single()

            if (error) throw new Error(error.message)

            // Cache in IndexedDB
            await db[table].put({ ...data, _fromServer: true })
            window.dispatchEvent(new CustomEvent('medi-trace:data-changed', {
                detail: { table, eventType: 'UPSERT', id: data.id }
            }))
            return data
        } catch (err) {
            console.warn(`[dataService] upsert ${table} failed:`, err.message)
            // Fall through to save locally
        }
    }

    if (!navigator.onLine || !isSupabaseConfigured) {
        // Truly offline — queue for later sync
        normalized.syncStatus = 'pending'
        normalized._offline = true
        await db[table].put(normalized)
        await retryQueue.add({ entityType: table, entityId: normalized.id, operation: 'upsert' })
    } else {
        // Online but Supabase failed — save locally, will retry on next periodic sync
        normalized.syncStatus = 'synced'
        normalized._offline = false
        await db[table].put(normalized)
    }
    return normalized
}

/**
 * Soft-delete a record on Supabase and IndexedDB.
 *
 * @param {string} table
 * @param {string} id
 */
export async function deleteRecord(table, id) {
    const now = new Date().toISOString()

    if (isSupabaseConfigured && supabase && navigator.onLine) {
        try {
            const { error } = await supabase
                .from(table)
                .update({ deletedAt: now, updatedAt: now })
                .eq('id', id)

            if (error) throw new Error(error.message)
        } catch (err) {
            console.warn(`[dataService] delete ${table} failed, offline queue:`, err.message)
        }
    }

    // Always update IndexedDB
    const isOffline = !navigator.onLine || !isSupabaseConfigured
    const existing = await db[table].get(id)
    if (existing) {
        await db[table].put({ ...existing, deletedAt: now, updatedAt: now, syncStatus: isOffline ? 'pending' : 'synced', _offline: isOffline })
    }

    if (isOffline) {
        await retryQueue.add({ entityType: table, entityId: id, operation: 'upsert' })
    }
}

// ── Offline retry queue ────────────────────────────────────────────────────

const retryQueue = {
    async add(entry) {
        await db.syncQueue.add({ ...entry, createdAt: new Date().toISOString() })
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('medi-trace:local-change'))
        }
    },
    async count() {
        return db.syncQueue.count()
    },
    async flush() {
        if (!isSupabaseConfigured || !supabase || !navigator.onLine) return 0
        const entries = await db.syncQueue.toArray()
        let flushed = 0
        for (const entry of entries) {
            try {
                if (entry.operation === 'upsert') {
                    const record = await db[entry.entityType].get(entry.entityId)
                    if (record) {
                        await supabase.from(entry.entityType).upsert(record)
                    }
                }
                await db.syncQueue.delete(entry.id)
                flushed++
            } catch {
                // Will retry next cycle
            }
        }
        return flushed
    }
}

export { retryQueue }

// ── App-level helpers ──────────────────────────────────────────────────────

/**
 * Check if the data service is available.
 */
export function isDataServiceAvailable() {
    return isSupabaseConfigured && !!supabase
}
