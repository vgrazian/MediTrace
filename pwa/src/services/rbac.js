const ROLE_ADMIN = 'admin'
const ROLE_OPERATOR = 'operator'

const PERMISSION_MATRIX = {
    [ROLE_ADMIN]: new Set([
        'sync:run',
        'users:read',
        'users:manage',
        'invites:send',
        'profiles:read',
        'testData:manage',
        'security:read',
        'movements:delete',
    ]),
    [ROLE_OPERATOR]: new Set([
        'sync:run',
        'security:read',
    ]),
}

export function normalizeRole(role) {
    return role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_OPERATOR
}

export function canRole(role, permission) {
    const normalizedRole = normalizeRole(role)
    return PERMISSION_MATRIX[normalizedRole]?.has(permission) ?? false
}

export function listRolePermissions(role) {
    const normalizedRole = normalizeRole(role)
    return Array.from(PERMISSION_MATRIX[normalizedRole] ?? []).sort((a, b) => a.localeCompare(b))
}

export const rbacTestUtils = {
    PERMISSION_MATRIX,
}
