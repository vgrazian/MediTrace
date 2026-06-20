const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined'
    ? String(__BUILD_TIMESTAMP__ || '').trim()
    : ''

const GIT_COMMIT = typeof __GIT_COMMIT__ !== 'undefined'
    ? String(__GIT_COMMIT__ || '').trim()
    : ''

const GIT_COMMIT_DATE = typeof __GIT_COMMIT_DATE__ !== 'undefined'
    ? String(__GIT_COMMIT_DATE__ || '').trim()
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

export function getGitCommit() {
    return GIT_COMMIT || 'n/d'
}

export function formatGitCommitDate(locale = 'it-IT') {
    if (!GIT_COMMIT_DATE) return ''
    const parsed = new Date(GIT_COMMIT_DATE)
    if (Number.isNaN(parsed.getTime())) return GIT_COMMIT_DATE
    return parsed.toLocaleString(locale, { hour12: false })
}

export function getDeployLabel() {
    const commit = getGitCommit()
    const date = formatGitCommitDate()
    if (commit && date) return `gh-pages ${commit} (${date})`
    if (commit) return `gh-pages ${commit}`
    if (date) return `gh-pages (${date})`
    return ''
}
