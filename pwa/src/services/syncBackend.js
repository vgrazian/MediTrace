/**
 * syncBackend.js — Runtime sync backend selector
 *
 * When VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY are set the app
 * uses the Supabase table backend (supabaseSync.js).
 * Otherwise it falls back to the legacy GitHub Gist backend (gist.js).
 *
 * The public API is identical to gist.js so sync.js only needs to import
 * from this module instead of directly from gist.js.
 */
import { isSupabaseConfigured, supabase } from './supabaseClient'
import * as supabaseBackend from './supabaseSync'
import * as gistBackend from './gist'

export const FILE_NAMES = supabaseBackend.FILE_NAMES   // same in both backends

function backend() {
    return (isSupabaseConfigured && supabase) ? supabaseBackend : gistBackend
}

export function listAppFiles(token) {
    return backend().listAppFiles(token)
}

export function downloadFile(token, id, name) {
    return backend().downloadFile(token, id, name)
}

export function uploadFile(token, name, content, existingId) {
    return backend().uploadFile(token, name, content, existingId)
}

export function bootstrapDriveFiles(token) {
    return backend().bootstrapDriveFiles(token)
}
