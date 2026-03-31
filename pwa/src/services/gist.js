/**
 * gist.js — GitHub Gist API storage client (replaces drive.js)
 *
 * All MediTrace data lives in a single private Gist owned by the user.
 * Files inside the gist map 1:1 to the previous Drive appDataFolder files:
 *   meditrace-manifest.json  — metadata, datasetVersion, device registry
 *   meditrace-data.json      — canonical dataset snapshot
 *
 * The gist ID is stored in IndexedDB settings key 'gistId'.
 * Backups are exported locally as JSON (no separate gist needed).
 *
 * API surface is intentionally compatible with the previous drive.js so
 * sync.js change is minimal — only downloadFile gains a required fileName arg.
 */
import { getSetting, setSetting } from '../db'

const GITHUB_API = 'https://api.github.com'
const GIST_DESCRIPTION = 'MediTrace — dati personali (non modificare manualmente)'

export const FILE_NAMES = {
    MANIFEST: 'meditrace-manifest.json',
    DATA: 'meditrace-data.json',
}

function ghHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
    }
}

// ── Low-level Gist API ────────────────────────────────────────────────────────

async function createGist(token, files) {
    const res = await fetch(`${GITHUB_API}/gists`, {
        method: 'POST',
        headers: ghHeaders(token),
        body: JSON.stringify({ description: GIST_DESCRIPTION, public: false, files }),
    })
    if (!res.ok) throw new Error(`Gist create failed: ${res.status}`)
    return res.json()
}

async function getGist(token, gistId) {
    const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
        headers: ghHeaders(token),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Gist get failed: ${res.status}`)
    return res.json()
}

async function patchGist(token, gistId, files) {
    const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
        method: 'PATCH',
        headers: ghHeaders(token),
        body: JSON.stringify({ files }),
    })
    if (!res.ok) throw new Error(`Gist patch failed: ${res.status}`)
    return res.json()
}

async function findExistingGist(token) {
    // Check IndexedDB first (fast path)
    const stored = await getSetting('gistId')
    if (stored) {
        const gist = await getGist(token, stored)
        if (gist) return gist
        await setSetting('gistId', null) // was deleted — clear cache
    }
    // Scan user's gists for ours by description
    let page = 1
    while (true) {
        const res = await fetch(`${GITHUB_API}/gists?per_page=100&page=${page}`, {
            headers: ghHeaders(token),
        })
        if (!res.ok) throw new Error(`Gist list failed: ${res.status}`)
        const gists = await res.json()
        if (gists.length === 0) return null
        const found = gists.find(g => g.description === GIST_DESCRIPTION)
        if (found) return getGist(token, found.id) // fetch with file content
        if (gists.length < 100) return null
        page++
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns [{ id: gistId, name }] for each file found in the app gist.
 * Both entries share the same gistId — this is intentional and matches
 * how sync.js iterates by FILE_NAMES.
 */
export async function listAppFiles(token) {
    const gist = await findExistingGist(token)
    if (!gist) return []
    await setSetting('gistId', gist.id)
    return Object.keys(gist.files).map(name => ({ id: gist.id, name }))
}

/**
 * Download and parse a specific file from the gist.
 * gistId and fileName are both required (unlike drive.js where fileId was unique per file).
 */
export async function downloadFile(token, gistId, fileName) {
    const gist = await getGist(token, gistId)
    if (!gist) throw new Error(`Gist ${gistId} not found`)
    const file = gist.files[fileName]
    if (!file) throw new Error(`File ${fileName} not found in gist ${gistId}`)
    // GitHub truncates large files — fall back to raw_url
    if (file.truncated) {
        const res = await fetch(file.raw_url)
        if (!res.ok) throw new Error(`Gist raw download failed: ${res.status}`)
        return res.json()
    }
    return JSON.parse(file.content)
}

/**
 * Create or update a single JSON file inside the gist.
 * existingGistId: pass the gistId to update; null to create a new gist.
 * Returns { id: gistId, name, updatedAt }.
 */
export async function uploadFile(token, name, content, existingGistId = null) {
    const filePayload = { [name]: { content: JSON.stringify(content) } }
    if (existingGistId) {
        const updated = await patchGist(token, existingGistId, filePayload)
        await setSetting('gistId', updated.id)
        return { id: updated.id, name, updatedAt: updated.updated_at }
    }
    const gist = await createGist(token, filePayload)
    await setSetting('gistId', gist.id)
    return { id: gist.id, name, updatedAt: gist.updated_at }
}

/**
 * Ensure both meditrace-manifest.json and meditrace-data.json exist in the gist.
 * Creates the gist (with both files atomically) on first run.
 * Returns { manifest, dataset, gistId }.
 */
export async function bootstrapDriveFiles(token) {
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

    let gist = await findExistingGist(token)

    if (!gist) {
        // First run — create gist with both files in a single API call
        gist = await createGist(token, {
            [FILE_NAMES.MANIFEST]: { content: JSON.stringify(emptyManifest) },
            [FILE_NAMES.DATA]: { content: JSON.stringify(emptyDataset) },
        })
        await setSetting('gistId', gist.id)
        return { manifest: emptyManifest, dataset: emptyDataset, gistId: gist.id }
    }

    await setSetting('gistId', gist.id)

    // Recover from partially-created gist (missing one file)
    const missingFiles = {}
    if (!gist.files[FILE_NAMES.MANIFEST]) missingFiles[FILE_NAMES.MANIFEST] = { content: JSON.stringify(emptyManifest) }
    if (!gist.files[FILE_NAMES.DATA]) missingFiles[FILE_NAMES.DATA] = { content: JSON.stringify(emptyDataset) }
    if (Object.keys(missingFiles).length > 0) {
        gist = await patchGist(token, gist.id, missingFiles)
    }

    const manifest = gist.files[FILE_NAMES.MANIFEST]
        ? JSON.parse(gist.files[FILE_NAMES.MANIFEST].content)
        : emptyManifest
    const dataset = gist.files[FILE_NAMES.DATA]
        ? JSON.parse(gist.files[FILE_NAMES.DATA].content)
        : emptyDataset

    return { manifest, dataset, gistId: gist.id }
}
