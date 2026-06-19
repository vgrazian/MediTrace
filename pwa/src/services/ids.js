function fallbackId(prefix) {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).slice(2, 10)
    return `${prefix}_${ts}${rand}`
}

export function generateEntityId(prefix) {
    const safePrefix = String(prefix || 'id').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'id'
    if (globalThis.crypto?.randomUUID) {
        return `${safePrefix}_${globalThis.crypto.randomUUID()}`
    }
    return fallbackId(safePrefix)
}
