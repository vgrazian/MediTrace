/**
 * sync.js — Snapshot-based sync between IndexedDB and GitHub Gist
 *
 * Strategy (see docs/architecture.md):
 *  1. Read remote manifest — compare datasetVersion with local
 *  2. If remote is newer → download + merge (last-write-wins on updatedAt)
 *  3. If local has pending changes → export snapshot, upload, update manifest
 *  4. Movements and reminders are append-only (never overwrite existing IDs)
 *
 * Storage backend: GitHub Gist (gist.js) — replaces Google Drive appDataFolder.
 * All other sync logic is unchanged.
 */
import { db, getSetting, setSetting, getSyncState, setSyncState } from '../db'
import { listAppFiles, downloadFile, uploadFile, bootstrapDriveFiles, FILE_NAMES } from './gist'

const LAST_WRITE_WINS_TABLES = ['hosts', 'drugs', 'stockBatches', 'therapies']
const APPEND_ONLY_TABLES = ['movements', 'reminders']
const ALL_DATA_TABLES = [...LAST_WRITE_WINS_TABLES, ...APPEND_ONLY_TABLES]

// Critical fields that require explicit conflict resolution when they diverge
const CONFLICT_FIELDS = {
    therapies: [
        // Current v1 dataset fields used by therapies/import flow
        'dosePerSomministrazione',
        'somministrazioniGiornaliere',
        'consumoMedioSettimanale',
        'stockBatchIdPreferito',
        'dataInizio',
        'dataFine',
        // Legacy aliases kept for compatibility with older snapshots
        'posologia',
        'frequenza',
        'quantitaResiduaManuale',
        'scadenzaConfezione',
    ],
}
const PENDING_CONFLICTS_KEY = 'pendingConflicts'

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Run a full sync cycle. Safe to call on every app resume/focus.
 * Returns a result object describing what happened.
 */
export async function fullSync(token) {
    if (!token) return { skipped: true, reason: 'no-token' }

    const files = await listAppFiles(token)
    const manifestFile = files.find(f => f.name === FILE_NAMES.MANIFEST)
    const dataFile = files.find(f => f.name === FILE_NAMES.DATA)

    // First run: create remote gist + files
    if (!manifestFile || !dataFile) {
        const { manifest, gistId } = await bootstrapDriveFiles(token)
        await setSyncState('gistId', gistId)
        await setSetting('datasetVersion', manifest.datasetVersion)
        return { bootstrapped: true }
    }

    // manifestFile.id === dataFile.id === gistId (all files share one gist)
    const gistId = manifestFile.id
    const remoteManifest = await downloadFile(token, gistId, FILE_NAMES.MANIFEST)
    const localVersion = (await getSetting('datasetVersion')) ?? -1

    if (remoteManifest.datasetVersion > localVersion) {
        // Remote is ahead — download and merge
        const remoteDataset = await downloadFile(token, gistId, FILE_NAMES.DATA)
        const conflicts = await mergeRemoteDataset(remoteDataset)
        await setSetting('datasetVersion', remoteManifest.datasetVersion)
        await setSyncState('gistId', gistId)
        return {
            downloaded: true,
            datasetVersion: remoteManifest.datasetVersion,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
        }
    }

    // Local is current — push any pending changes
    const unresolvedConflicts = await listPendingConflicts()
    if (unresolvedConflicts.length > 0) {
        return {
            blocked: true,
            reason: 'pending-conflicts',
            conflicts: unresolvedConflicts.length,
        }
    }

    const pendingCount = await db.syncQueue.count()
    if (pendingCount === 0) return { upToDate: true }

    const newVersion = (remoteManifest.datasetVersion ?? 0) + 1
    const deviceId = (await getSetting('deviceId')) ?? 'unknown'
    const dataset = await exportLocalDataset(newVersion)

    await uploadFile(token, FILE_NAMES.DATA, dataset, gistId)

    const updatedManifest = {
        ...remoteManifest,
        datasetVersion: newVersion,
        exportedAt: new Date().toISOString(),
        updatedByDevice: deviceId,
    }
    await uploadFile(token, FILE_NAMES.MANIFEST, updatedManifest, gistId)

    await db.syncQueue.clear()
    await setSetting('datasetVersion', newVersion)

    return { uploaded: true, datasetVersion: newVersion }
}

// ── Export ────────────────────────────────────────────────────────────────────

async function exportLocalDataset(datasetVersion) {
    const tables = await Promise.all(ALL_DATA_TABLES.map(t => db[t].filter(r => !r.deletedAt).toArray()))
    const result = { schemaVersion: 1, datasetVersion, exportedAt: new Date().toISOString() }
    ALL_DATA_TABLES.forEach((name, i) => { result[name] = tables[i] })
    return result
}

/**
 * Local export for manual backup — returns raw JSON string.
 */
export async function exportBackupJson() {
    const version = (await getSetting('datasetVersion')) ?? 0
    const dataset = await exportLocalDataset(version)
    return JSON.stringify(dataset, null, 2)
}

export async function listPendingConflicts() {
    const conflicts = await getSetting(PENDING_CONFLICTS_KEY, [])
    return Array.isArray(conflicts) ? conflicts : []
}

export async function resolveConflict({ conflictId, choice, operatorId = null }) {
    if (!conflictId) throw new Error('conflictId obbligatorio')
    if (choice !== 'local' && choice !== 'remote') throw new Error('choice non valido')

    const conflicts = await listPendingConflicts()
    const conflict = conflicts.find(item => item.conflictId === conflictId)
    if (!conflict) {
        throw new Error('Conflitto non trovato o gia risolto')
    }

    const { table, entityId, localRecord, remoteRecord } = conflict
    const deviceId = (await getSetting('deviceId')) ?? 'unknown'

    await db.transaction('rw', db[table], db.syncQueue, db.activityLog, async () => {
        if (choice === 'remote') {
            await db[table].put({ ...remoteRecord, syncStatus: 'synced' })
            await db.syncQueue
                .where('entityType')
                .equals(table)
                .and(item => item.entityId === entityId)
                .delete()
        } else {
            await db[table].put({ ...localRecord, syncStatus: 'pending', updatedAt: new Date().toISOString() })
            await db.syncQueue.add({
                entityType: table,
                entityId,
                operation: 'upsert',
                createdAt: new Date().toISOString(),
            })
        }

        await db.activityLog.add({
            entityType: table,
            entityId,
            action: choice === 'remote' ? 'conflict_resolved_accept_remote' : 'conflict_resolved_keep_local',
            deviceId,
            operatorId,
            ts: new Date().toISOString(),
            details: {
                conflictId,
                fields: conflict.fields,
            },
        })
    })

    const unresolved = conflicts.filter(item => item.conflictId !== conflictId)
    await setSetting(PENDING_CONFLICTS_KEY, unresolved)

    return {
        resolved: true,
        remaining: unresolved.length,
        choice,
        table,
        entityId,
    }
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/**
 * Merges a remote dataset snapshot into IndexedDB.
 * Returns an array of conflict descriptors for fields requiring user review.
 */
async function mergeRemoteDataset(remote) {
    const detectedConflicts = []

    await db.transaction('rw', ALL_DATA_TABLES.map(t => db[t]), async () => {
        // Last-write-wins for master data
        for (const table of LAST_WRITE_WINS_TABLES) {
            const rows = remote[table] ?? []
            for (const row of rows) {
                const local = await db[table].get(row.id)
                if (!local) {
                    await db[table].put({ ...row, syncStatus: 'synced' })
                    continue
                }
                const remoteIsNewer = new Date(row.updatedAt) > new Date(local.updatedAt)
                if (remoteIsNewer) {
                    // Check critical fields before overwriting
                    const criticals = CONFLICT_FIELDS[table] ?? []
                    const fieldDiffs = []
                    for (const field of criticals) {
                        if (local[field] !== undefined && row[field] !== local[field]) {
                            fieldDiffs.push({ field, local: local[field], remote: row[field] })
                        }
                    }
                    if (fieldDiffs.length > 0) {
                        const conflictId = `${table}:${row.id}:${row.updatedAt}`
                        detectedConflicts.push({
                            conflictId,
                            table,
                            entityId: row.id,
                            fields: fieldDiffs,
                            localRecord: local,
                            remoteRecord: row,
                            detectedAt: new Date().toISOString(),
                        })
                        await db[table].put({ ...local, syncStatus: 'conflict' })
                        continue
                    }
                    await db[table].put({ ...row, syncStatus: 'synced' })
                }
            }
            // Soft-delete: apply remote deletions
            for (const row of rows) {
                if (row.deletedAt) {
                    const local = await db[table].get(row.id)
                    if (local && !local.deletedAt) {
                        await db[table].put({ ...local, deletedAt: row.deletedAt, syncStatus: 'synced' })
                    }
                }
            }
        }

        // Append-only: only add records with new IDs
        for (const table of APPEND_ONLY_TABLES) {
            const rows = remote[table] ?? []
            for (const row of rows) {
                const exists = await db[table].get(row.id)
                if (!exists) {
                    await db[table].put({ ...row, syncStatus: 'synced' })
                }
            }
        }
    })

    if (detectedConflicts.length > 0) {
        const existing = await listPendingConflicts()
        const byId = new Map(existing.map(item => [item.conflictId, item]))
        for (const conflict of detectedConflicts) {
            byId.set(conflict.conflictId, conflict)
        }
        await setSetting(PENDING_CONFLICTS_KEY, Array.from(byId.values()))
    }

    return detectedConflicts
}
