import { ref, onMounted, onUnmounted } from 'vue'
import { db, getSetting } from '../db'
import { isSupabaseConfigured } from '../services/supabaseClient'

// Possible sync states
const SYNC_STATES = {
    SYNCED: 'sincronizzato',
    PENDING: 'in attesa',
    CONFLICT: 'conflitto',
    ERROR: 'errore',
    OFFLINE: 'offline',
}

export function useSyncState() {
    const statoSync = ref(SYNC_STATES.SYNCED)
    const dettagli = ref('')

    let intervalId

    async function updateSyncState() {
        try {
            // If Supabase is not configured, there's nothing to sync — always show green
            if (!isSupabaseConfigured) {
                statoSync.value = SYNC_STATES.SYNCED
                dettagli.value = 'Sync remoto non configurato.'
                return
            }

            // Check for offline (simple navigator check)
            const offline = typeof navigator !== 'undefined' && !navigator.onLine
            if (offline) {
                statoSync.value = SYNC_STATES.OFFLINE
                dettagli.value = 'Sei offline. Le modifiche verranno sincronizzate appena possibile.'
                return
            }

            // Check for pending sync operations
            const pending = await db.syncQueue.count()
            // Check for unresolved conflicts
            const conflicts = await getSetting('pendingConflicts', [])

            if (conflicts && conflicts.length > 0) {
                statoSync.value = SYNC_STATES.CONFLICT
                dettagli.value = `Sono presenti ${conflicts.length} conflitti da risolvere.`
            } else if (pending > 0) {
                statoSync.value = SYNC_STATES.PENDING
                dettagli.value = `${pending} modifiche in attesa di sincronizzazione.`
            } else {
                statoSync.value = SYNC_STATES.SYNCED
                dettagli.value = 'Tutti i dati sono sincronizzati.'
            }
        } catch (e) {
            statoSync.value = SYNC_STATES.ERROR
            dettagli.value = 'Errore nel rilevamento dello stato di sincronizzazione.'
        }
    }

    /**
     * Flush local sync queue — clears all pending sync entries.
     * Useful when Supabase is not configured and we just want a clean state.
     */
    async function flushLocalSyncQueue() {
        try {
            await db.syncQueue.clear()
            await updateSyncState()
        } catch { /* ignore */ }
    }

    onMounted(() => {
        updateSyncState()
        intervalId = setInterval(updateSyncState, 2000) // Aggiorna ogni 2s
        window.addEventListener('online', updateSyncState)
        window.addEventListener('offline', updateSyncState)
    })

    onUnmounted(() => {
        clearInterval(intervalId)
        window.removeEventListener('online', updateSyncState)
        window.removeEventListener('offline', updateSyncState)
    })

    return { statoSync, dettagli, updateSyncState, flushLocalSyncQueue }
}

export { SYNC_STATES }
