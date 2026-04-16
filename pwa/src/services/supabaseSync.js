/**
 * supabaseSync.js — Supabase-backed sync storage
 *
 * Drop-in replacement for gist.js with an identical public API surface
 * (listAppFiles, downloadFile, uploadFile, bootstrapDriveFiles, FILE_NAMES),
 * so sync.js only needs a single import-path change.
 *
 * Data lives in the public.sync_files Postgres table (see supabase/migrations/001_initial.sql).
 * All access goes through SECURITY DEFINER RPCs (app_list_sync_files,
 * app_download_sync_file, app_upload_sync_file) that validate the table-auth
 * session token, so the anon Supabase client key is sufficient.
 *
 * Token parameters are kept for API compatibility but are NOT used — the
 * table-auth session token is read from IndexedDB automatically.
 */
import { isSupabaseConfigured, supabase } from './supabaseClient'
import { getSetting, setSetting } from '../db'
import { readStoredSession } from './supabaseTableAuth'
import { NetworkError } from './errorHandling'

export const FILE_NAMES = {
    MANIFEST: 'meditrace-manifest.json',
    DATA: 'meditrace-data.json',
}

function assertConfigured() {
    if (!isSupabaseConfigured || !supabase) {
        throw new NetworkError('Supabase non configurato', 503, {
            suggestedActions: [
                'Configura VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nelle GitHub Variables del repository',
                'Aggiungi le stesse variabili in pwa/.env.local per lo sviluppo locale',
            ],
        })
    }
}

async function requireSessionToken() {
    const session = await readStoredSession()
    if (!session?.token) throw new NetworkError('Sessione non attiva — accedi prima di sincronizzare', 401)
    return session.token
}

// ── Public API (compatible with gist.js) ─────────────────────────────────────

/**
 * Return [{id, name}] for each sync file that already exists.
 * Uses the file name as the "id" (the table primary key).
 */
export async function listAppFiles(_token) {
    assertConfigured()

    const token = await requireSessionToken()
    const { data, error } = await supabase.rpc('app_list_sync_files', { p_token: token })
    if (error) throw new NetworkError(`Errore lettura sync_files: ${error.message}`, 500)
    return (data ?? []).map(row => ({ id: row.name, name: row.name }))
}

/**
 * Download and parse a specific sync file.
 * _gistId is ignored — name is the primary key in sync_files.
 */
export async function downloadFile(_token, _gistId, fileName) {
    assertConfigured()

    const token = await requireSessionToken()
    const { data, error } = await supabase.rpc('app_download_sync_file', { p_token: token, p_name: fileName })
    if (error) throw new NetworkError(`File ${fileName} non trovato nel database di sincronizzazione`, 404, {
        suggestedActions: [
            'Esegui una prima sincronizzazione per inizializzare il dataset condiviso',
            'Verifica che la tabella sync_files esista nel progetto Supabase',
        ],
    })
    if (data == null) throw new NetworkError(`File ${fileName} non trovato nel database di sincronizzazione`, 404)
    // The RPC returns JSONB cast to TEXT; parse it back to an object
    return typeof data === 'string' ? JSON.parse(data) : data
}

/**
 * Upsert a JSON file in sync_files.
 * _existingId is ignored — we always upsert by name.
 */
export async function uploadFile(_token, name, content, _existingId = null) {
    assertConfigured()

    const token = await requireSessionToken()
    const { data, error } = await supabase.rpc('app_upload_sync_file', {
        p_token: token,
        p_name: name,
        p_content: typeof content === 'string' ? JSON.parse(content) : content,
    })
    if (error) throw new NetworkError(`Errore scrittura sync_files (${name}): ${error.message}`, 500)
    const updatedAt = data ?? new Date().toISOString()
    await setSetting('syncBackend', 'supabase')
    return { id: name, name, updatedAt }
}

/**
 * Atomically commit a full dataset snapshot with optimistic concurrency.
 * The server increments datasetVersion only if expectedVersion matches.
 */
export async function commitSnapshot(_token, { expectedVersion, dataset, updatedByDevice = null }) {
    assertConfigured()

    const token = await requireSessionToken()
    const { data, error } = await supabase.rpc('app_commit_sync_snapshot', {
        p_token: token,
        p_expected_version: Number(expectedVersion ?? 0),
        p_dataset: typeof dataset === 'string' ? JSON.parse(dataset) : dataset,
        p_updated_by_device: updatedByDevice,
    })
    if (error) throw new NetworkError(`Errore commit sync atomico: ${error.message}`, 500)

    const datasetVersion = Number(data?.datasetVersion)
    if (!Number.isFinite(datasetVersion)) {
        throw new NetworkError('Commit sync atomico non valido: datasetVersion mancante', 500)
    }

    await setSetting('syncBackend', 'supabase')
    return {
        datasetVersion,
        exportedAt: data?.exportedAt ?? null,
    }
}

/**
 * Ensure both manifest and data files exist.
 * Creates them (empty) if absent — first-run bootstrap.
 * Returns { manifest, dataset, gistId } for compatibility with sync.js callers.
 */
export async function bootstrapDriveFiles(_token) {
    assertConfigured()

    const emptyManifest = {
        schemaVersion: 1,
        datasetVersion: 0,
        exportedAt: new Date().toISOString(),
        updatedByDevice: null,
        checksum: null,
    }
    const emptyDataset = {
        schemaVersion: 1,
        datasetVersion: 0,
        exportedAt: new Date().toISOString(),
        hosts: [], drugs: [], stockBatches: [],
        therapies: [], movements: [], reminders: [],
    }

    const existingFiles = await listAppFiles(null)
    const existingNames = new Set(existingFiles.map(f => f.name))

    if (!existingNames.has(FILE_NAMES.MANIFEST)) {
        await uploadFile(null, FILE_NAMES.MANIFEST, emptyManifest)
    }
    if (!existingNames.has(FILE_NAMES.DATA)) {
        await uploadFile(null, FILE_NAMES.DATA, emptyDataset)
    }

    await setSetting('syncBackend', 'supabase')
    await setSetting('gistId', null)   // clear any legacy gistId

    return {
        manifest: emptyManifest,
        dataset: emptyDataset,
        gistId: 'supabase',  // placeholder for sync.js compat
    }
}
