/**
 * supabaseSync.js — Supabase-backed sync storage
 *
 * Drop-in replacement for gist.js with an identical public API surface
 * (listAppFiles, downloadFile, uploadFile, bootstrapDriveFiles, FILE_NAMES),
 * so sync.js only needs a single import-path change.
 *
 * Data lives in the public.sync_files Postgres table (see supabase/migrations/001_initial.sql).
 * Row-level security ensures only authenticated users can read/write.
 *
 * Token parameters are kept for API compatibility but are NOT used — the
 * Supabase JS client handles auth via the persisted session automatically.
 */
import { isSupabaseConfigured, supabase } from './supabaseClient'
import { getSetting, setSetting } from '../db'
import { NetworkError } from './errorHandling'

const TABLE = 'sync_files'

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

// ── Public API (compatible with gist.js) ─────────────────────────────────────

/**
 * Return [{id, name}] for each sync file that already exists.
 * Uses the file name as the "id" (the table primary key).
 */
export async function listAppFiles(_token) {
    assertConfigured()

    const { data, error } = await supabase
        .from(TABLE)
        .select('name')
        .in('name', [FILE_NAMES.MANIFEST, FILE_NAMES.DATA])

    if (error) {
        throw new NetworkError(`Errore lettura sync_files: ${error.message}`, 500)
    }

    return (data ?? []).map(row => ({ id: row.name, name: row.name }))
}

/**
 * Download and parse a specific sync file.
 * _gistId is ignored — name is the primary key in sync_files.
 */
export async function downloadFile(_token, _gistId, fileName) {
    assertConfigured()

    const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .eq('name', fileName)
        .single()

    if (error || !data) {
        throw new NetworkError(`File ${fileName} non trovato nel database di sincronizzazione`, 404, {
            suggestedActions: [
                'Esegui una prima sincronizzazione per inizializzare il dataset condiviso',
                'Verifica che la tabella sync_files esista nel progetto Supabase',
            ],
        })
    }

    // content is stored as JSONB → Supabase JS client returns it already parsed
    return data.content
}

/**
 * Upsert a JSON file in sync_files.
 * _existingId is ignored — we always upsert by name.
 */
export async function uploadFile(_token, name, content, _existingId = null) {
    assertConfigured()

    const now = new Date().toISOString()
    const { error } = await supabase
        .from(TABLE)
        .upsert({ name, content, updated_at: now }, { onConflict: 'name' })

    if (error) {
        throw new NetworkError(`Errore scrittura sync_files (${name}): ${error.message}`, 500)
    }

    await setSetting('syncBackend', 'supabase')
    return { id: name, name, updatedAt: now }
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

    const { data: existing, error: selectError } = await supabase
        .from(TABLE)
        .select('name')
        .in('name', [FILE_NAMES.MANIFEST, FILE_NAMES.DATA])

    if (selectError) {
        throw new NetworkError(`Errore bootstrap sync_files: ${selectError.message}`, 500)
    }

    const existingNames = new Set((existing ?? []).map(r => r.name))
    const now = new Date().toISOString()
    const toInsert = []

    if (!existingNames.has(FILE_NAMES.MANIFEST)) {
        toInsert.push({ name: FILE_NAMES.MANIFEST, content: emptyManifest, updated_at: now })
    }
    if (!existingNames.has(FILE_NAMES.DATA)) {
        toInsert.push({ name: FILE_NAMES.DATA, content: emptyDataset, updated_at: now })
    }

    if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from(TABLE).insert(toInsert)
        if (insertError) {
            throw new NetworkError(`Errore creazione file iniziali: ${insertError.message}`, 500)
        }
    }

    await setSetting('syncBackend', 'supabase')
    await setSetting('gistId', null)   // clear any legacy gistId

    return {
        manifest: emptyManifest,
        dataset: emptyDataset,
        gistId: 'supabase',  // placeholder for sync.js compat
    }
}
