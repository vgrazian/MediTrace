import { getSetting, setSetting } from '../db'

const AUTH_USERS_KEY = 'authUsers'

const DEMO_OPERATORS = []

// Legacy seeded demo operators kept only for cleanup/backward compatibility.
const LEGACY_DEMO_OPERATOR_USERNAMES = new Set(['rosa', 'margherita', 'giglio'])

const DEMO_OPERATOR_USERNAMES = new Set(DEMO_OPERATORS.map(user => user.username))

function asArray(value) {
    return Array.isArray(value) ? value : []
}

function buildDemoAuthRecord(template, existing, now) {
    const firstName = String(template.firstName || '').trim()
    const lastName = String(template.lastName || '').trim()
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || template.username

    return {
        id: existing?.id || template.id,
        username: template.username,
        passwordSalt: template.passwordSalt,
        passwordHash: template.passwordHash,
        githubToken: '',
        githubLogin: template.username,
        displayName,
        firstName,
        lastName,
        email: String(template.email || '').trim().toLowerCase(),
        phone: '',
        avatarUrl: '',
        role: 'operator',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        disabled: false,
        isSeeded: true,
        seedScope: 'demo',
    }
}

export async function upsertDemoAuthUsers() {
    const now = new Date().toISOString()
    const users = asArray(await getSetting(AUTH_USERS_KEY, []))
    const nextUsers = [...users]

    let created = 0
    let updated = 0
    for (const operator of DEMO_OPERATORS) {
        const idx = nextUsers.findIndex(user => String(user?.username || '').toLowerCase() === operator.username)
        const existing = idx >= 0 ? nextUsers[idx] : null
        const record = buildDemoAuthRecord(operator, existing, now)
        if (idx >= 0) {
            nextUsers[idx] = record
            updated += 1
        } else {
            nextUsers.push(record)
            created += 1
        }
    }

    await setSetting(AUTH_USERS_KEY, nextUsers)

    return {
        total: DEMO_OPERATORS.length,
        created,
        updated,
        usernames: [...DEMO_OPERATOR_USERNAMES],
    }
}

export async function clearDemoAuthUsers({ preserveAdminUsername = 'admin' } = {}) {
    const users = asArray(await getSetting(AUTH_USERS_KEY, []))
    const keepUsername = String(preserveAdminUsername || '').trim().toLowerCase()

    const keptUsers = users.filter((user) => {
        const username = String(user?.username || '').toLowerCase()
        if (username && username === keepUsername) return true

        const isScopedDemoUser = String(user?.seedScope || '').toLowerCase() === 'demo'
        if (isScopedDemoUser) return false

        if (LEGACY_DEMO_OPERATOR_USERNAMES.has(username)) return false
        return !DEMO_OPERATOR_USERNAMES.has(username)
    })

    const removed = users.length - keptUsers.length
    if (removed > 0) {
        await setSetting(AUTH_USERS_KEY, keptUsers)
    }

    return {
        removed,
        remaining: keptUsers.length,
        usernames: [...LEGACY_DEMO_OPERATOR_USERNAMES, ...DEMO_OPERATOR_USERNAMES],
    }
}

export const seedAuthUsersTestUtils = {
    AUTH_USERS_KEY,
    DEMO_OPERATORS,
    DEMO_OPERATOR_USERNAMES,
    LEGACY_DEMO_OPERATOR_USERNAMES,
}
