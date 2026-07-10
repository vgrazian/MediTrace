import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '../db'
import { isDataServiceAvailable } from '../services/dataService'

const SYNC_STATES = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    PENDING: 'pending',
    ERROR: 'error',
}

export function useSyncState() {
    const statoSync = ref(SYNC_STATES.ONLINE)
    const dettagli = ref('')
    const pendingCount = ref(0)
    const lastRefresh = ref('')

    let intervalId

    async function updateSyncState() {
        try {
            const online = typeof navigator !== 'undefined' && navigator.onLine
            const supabaseAvailable = isDataServiceAvailable()

            if (!online) {
                statoSync.value = SYNC_STATES.OFFLINE
                const queueCount = await db.syncQueue.count()
                pendingCount.value = queueCount
                dettagli.value = queueCount > 0
                    ? `Offline · ${queueCount} modifiche in coda`
                    : 'Offline'
                return
            }

            if (!supabaseAvailable) {
                statoSync.value = SYNC_STATES.ERROR
                dettagli.value = 'Supabase non configurato'
                return
            }

            const queueCount = await db.syncQueue.count()
            pendingCount.value = queueCount

            if (queueCount > 0) {
                statoSync.value = SYNC_STATES.PENDING
                dettagli.value = `${queueCount} modifiche in coda`
            } else {
                statoSync.value = SYNC_STATES.ONLINE
                dettagli.value = lastRefresh.value
                    ? `Sincronizzato · ultimo refresh ${lastRefresh.value}`
                    : 'Online · dati aggiornati'
            }
        } catch {
            statoSync.value = SYNC_STATES.ERROR
            dettagli.value = 'Errore verifica stato'
        }
    }

    function setRefreshed() {
        const now = new Date()
        lastRefresh.value = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        updateSyncState()
    }

    onMounted(() => {
        updateSyncState()
        intervalId = setInterval(updateSyncState, 5000)
        window.addEventListener('online', updateSyncState)
        window.addEventListener('offline', updateSyncState)
        window.addEventListener('medi-trace:data-changed', updateSyncState)
    })

    onUnmounted(() => {
        clearInterval(intervalId)
        window.removeEventListener('online', updateSyncState)
        window.removeEventListener('offline', updateSyncState)
        window.removeEventListener('medi-trace:data-changed', updateSyncState)
    })

    return { statoSync, dettagli, pendingCount, updateSyncState, setRefreshed }
}

export { SYNC_STATES }
