const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined'
    ? String(__BUILD_TIMESTAMP__ || '').trim()
    : ''

export function formatBuildTimestamp(locale = 'it-IT') {
    if (!BUILD_TIMESTAMP) return 'n/d'
    const parsed = new Date(BUILD_TIMESTAMP)
    if (Number.isNaN(parsed.getTime())) return BUILD_TIMESTAMP
    return parsed.toLocaleString(locale, { hour12: false })
}

export function getBuildTimestampIso() {
    return BUILD_TIMESTAMP || 'n/d'
}
