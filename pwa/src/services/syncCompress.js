/**
 * syncCompress.js — Client-side gzip compression for sync payloads
 *
 * Wraps JSON payloads in a {"_gz":"<base64>"} envelope that is valid JSONB.
 * The existing Supabase RPCs accept JSONB transparently — no server changes
 * are needed for basic upload/download.
 *
 * Bandwidth reduction: ~80% (JSON text compresses 5-10x with gzip).
 */
import pako from 'pako'

const GZ_ENVELOPE_KEY = '_gz'
const GZ_ENVELOPE_VERSION = '_v'

/**
 * Compress a JSON-serializable value into a JSONB-compatible gzip envelope.
 * Returns a plain object like {"_gz":"<base64>", "_v":1} that can be
 * passed directly to Supabase RPCs expecting JSONB.
 */
export function compressSyncPayload(data) {
    const json = JSON.stringify(data)
    const compressed = pako.gzip(json)
    const base64 = uint8ArrayToBase64(compressed)
    return { [GZ_ENVELOPE_KEY]: base64, [GZ_ENVELOPE_VERSION]: 1 }
}

/**
 * Decompress a gzip envelope back to the original value.
 * If the payload is not compressed (no "_gz" key), returns it as-is.
 */
export function decompressSyncPayload(payload) {
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload) } catch { return payload }
    }

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const b64 = payload[GZ_ENVELOPE_KEY]
        if (typeof b64 === 'string' && b64.length > 0) {
            try {
                const bytes = base64ToUint8Array(b64)
                const decompressed = pako.ungzip(bytes, { to: 'string' })
                return JSON.parse(decompressed)
            } catch (err) {
                console.warn('[syncCompress] Decompression failed, returning raw payload:', err.message)
                return payload
            }
        }
    }

    return payload
}

export function isCompressedEnvelope(payload) {
    if (!payload || typeof payload !== 'object') return false
    return typeof payload[GZ_ENVELOPE_KEY] === 'string' && payload[GZ_ENVELOPE_KEY].length > 0
}

function uint8ArrayToBase64(bytes) {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
}

function base64ToUint8Array(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}
