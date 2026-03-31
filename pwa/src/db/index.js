import Dexie from 'dexie'

/**
 * MediTrace IndexedDB schema — v1
 *
 * Naming: primary key listed first, then indexed fields.
 * All sync-able entities carry: id (UUID), updatedAt (ISO string),
 * deletedAt (ISO string | null), syncStatus ('pending' | 'synced' | 'conflict').
 */
export const db = new Dexie('meditrace')

db.version(1).stores({
    // Key-value store for app-level settings (datasetVersion, deviceId, lastUser…)
    settings: '&key',

    // Ospiti delle case alloggio — identificati con iniziali o codice interno
    hosts: 'id, codiceInterno, casaAlloggio, attivo, updatedAt, syncStatus',

    // Principi attivi
    drugs: 'id, principioAttivo, classeTerapeutica, updatedAt, syncStatus',

    // Confezioni commerciali (1 principio attivo → N confezioni)
    stockBatches: 'id, drugId, nomeCommerciale, scadenza, updatedAt, syncStatus',

    // Terapie attive per ospite
    therapies: 'id, hostId, drugId, stockBatchId, dataInizio, dataFine, updatedAt, syncStatus',

    // Movimenti di carico/scarico scorte (append-only)
    movements: 'id, stockBatchId, hostId, therapyId, type, updatedAt, syncStatus',

    // Promemoria somministrazione generati dalle terapie (append-only)
    reminders: 'id, hostId, therapyId, scheduledAt, stato, updatedAt, syncStatus',

    // Coda operazioni da sincronizzare con Drive
    syncQueue: '++id, entityType, entityId, operation, createdAt',

    // Stato sincronizzazione corrente (fileId manifest, fileId data, last sync…)
    syncState: '&key',

    // Log immutabile delle azioni per audit
    activityLog: '++id, entityType, entityId, action, deviceId, operatorId, ts',
})

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getSetting(key, fallback = null) {
    const row = await db.settings.get(key)
    return row !== undefined ? row.value : fallback
}

export async function setSetting(key, value) {
    await db.settings.put({ key, value })
}

export async function getSyncState(key, fallback = null) {
    const row = await db.syncState.get(key)
    return row !== undefined ? row.value : fallback
}

export async function setSyncState(key, value) {
    await db.syncState.put({ key, value })
}

/**
 * Enqueue a sync operation. Called automatically by data-write helpers.
 */
export async function enqueue(entityType, entityId, operation = 'upsert') {
    await db.syncQueue.add({
        entityType,
        entityId,
        operation,
        createdAt: new Date().toISOString(),
    })
}
