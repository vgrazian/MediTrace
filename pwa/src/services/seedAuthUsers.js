import { getSetting, setSetting } from '../db'

const AUTH_USERS_KEY = 'authUsers'

const DEMO_OPERATORS = [
    {
        id: '__seed__auth-rosa',
        username: 'rosa',
        firstName: 'Rosa',
        lastName: 'Operatore',
        email: 'rosa.operatore@meditrace.local',
        passwordSalt: 'c65c257dde32865d72f47c5d4b9d2539',
        passwordHash: 'ead518bb3015a9f46e7d9337f84640d64049eaee1f95aa2222f289ebc7e3bc80',
    },
    {
        id: '__seed__auth-margherita',
        username: 'margherita',
        firstName: 'Margherita',
        lastName: 'Operatore',
        email: 'margherita.operatore@meditrace.local',
        passwordSalt: 'e359da422e804b5dd7098247f30aaf19',
        passwordHash: '9045b6a0e7094f08699180271a535cdc05fac7c64f20b498a1cdfc9e43833df3',
    },
    {
        id: '__seed__auth-giglio',
        username: 'giglio',
        firstName: 'Giglio',
        lastName: 'Operatore',
        email: 'giglio.operatore@meditrace.local',
        passwordSalt: '534bb705848828cbfdb3698fa0358748',
        passwordHash: 'b4418e1e8235275a07e54396e3c2f04941429136e2748d9e83872697178eef70',
    },
]

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

        return !DEMO_OPERATOR_USERNAMES.has(username)
    })

    const removed = users.length - keptUsers.length
    if (removed > 0) {
        await setSetting(AUTH_USERS_KEY, keptUsers)
    }

    return {
        removed,
        remaining: keptUsers.length,
        usernames: [...DEMO_OPERATOR_USERNAMES],
    }
}

export const seedAuthUsersTestUtils = {
    AUTH_USERS_KEY,
    DEMO_OPERATORS,
    DEMO_OPERATOR_USERNAMES,
}
