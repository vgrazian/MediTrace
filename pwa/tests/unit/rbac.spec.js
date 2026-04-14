import { describe, expect, it } from 'vitest'
import { canRole, listRolePermissions, normalizeRole } from '../../src/services/rbac'

describe('rbac lightweight permissions', () => {
    it('normalizes unknown roles to operator', () => {
        expect(normalizeRole('admin')).toBe('admin')
        expect(normalizeRole('operator')).toBe('operator')
        expect(normalizeRole('unknown')).toBe('operator')
    })

    it('grants admin-only capabilities correctly', () => {
        expect(canRole('admin', 'users:read')).toBe(true)
        expect(canRole('admin', 'invites:send')).toBe(true)
        expect(canRole('admin', 'testData:manage')).toBe(true)
        expect(canRole('admin', 'movements:delete')).toBe(true)

        expect(canRole('operator', 'users:read')).toBe(false)
        expect(canRole('operator', 'invites:send')).toBe(false)
        expect(canRole('operator', 'testData:manage')).toBe(false)
        expect(canRole('operator', 'movements:delete')).toBe(false)
    })

    it('keeps sync/security actions available for operators', () => {
        expect(canRole('operator', 'sync:run')).toBe(true)
        expect(canRole('operator', 'security:read')).toBe(true)
    })

    it('returns stable sorted permission lists', () => {
        const adminPermissions = listRolePermissions('admin')
        const operatorPermissions = listRolePermissions('operator')

        expect(adminPermissions).toContain('users:manage')
        expect(operatorPermissions).toEqual(['security:read', 'sync:run'])
    })
})
