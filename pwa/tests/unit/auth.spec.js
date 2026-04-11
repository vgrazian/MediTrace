import { beforeEach, describe, expect, it, vi } from 'vitest'

const settings = new Map()
const authEvents = []
const supabaseAuth = {
    resetPasswordForEmail: vi.fn(),
    signInWithOtp: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
}

vi.mock('../../src/services/supabaseClient', () => ({
    isSupabaseConfigured: true,
    getSupabaseRedirectTo: vi.fn(() => 'http://localhost:5173/#/auth/reset-password'),
    supabase: {
        auth: supabaseAuth,
    },
}))

vi.mock('../../src/db', () => ({
    db: {
        activityLog: {
            async add(entry) {
                authEvents.push({ id: authEvents.length + 1, ...entry })
            },
            where() {
                return {
                    equals() {
                        const filtered = authEvents.filter(event => event.entityType === 'auth')
                        return {
                            reverse() {
                                return {
                                    limit(limit) {
                                        return {
                                            async toArray() {
                                                return [...filtered].reverse().slice(0, limit)
                                            },
                                        }
                                    },
                                }
                            },
                        }
                    },
                }
            },
        },
    },
    async getSetting(key, fallback = null) {
        return settings.has(key) ? settings.get(key) : fallback
    },
    async setSetting(key, value) {
        settings.set(key, value)
    },
}))

function setupGithubUserFetchMock() {
    global.fetch = vi.fn(async url => {
        if (String(url).includes('/user')) {
            return {
                ok: true,
                async json() {
                    return {
                        login: 'seed-gh-user',
                        name: 'Seed GH User',
                        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
                    }
                },
            }
        }

        return { ok: false, status: 404, async json() { return {} } }
    })
}

describe('auth service', () => {
    beforeEach(() => {
        settings.clear()
        authEvents.length = 0
        vi.unstubAllEnvs()
        setupGithubUserFetchMock()
        supabaseAuth.resetPasswordForEmail.mockReset()
        supabaseAuth.signInWithOtp.mockReset()
        supabaseAuth.getSession.mockReset()
        supabaseAuth.getUser.mockReset()
        supabaseAuth.updateUser.mockReset()
        supabaseAuth.signOut.mockReset()

        supabaseAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
        supabaseAuth.signInWithOtp.mockResolvedValue({ error: null })
        supabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null })
        supabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
        supabaseAuth.updateUser.mockResolvedValue({ error: null })
        supabaseAuth.signOut.mockResolvedValue({ error: null })
    })

    it('registers, signs in and changes password with local credentials', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()

        await auth.register({
            username: 'Operatore',
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario.rossi@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        expect(auth.currentUser.value?.username).toBe('operatore')

        await auth.signOut()
        expect(auth.currentUser.value).toBeNull()

        await auth.signIn({ username: 'operatore', password: 'Password123!' })
        expect(auth.currentUser.value?.username).toBe('operatore')

        await auth.changePassword({
            currentPassword: 'Password123!',
            newPassword: 'NuovaPassword123!',
            confirmPassword: 'NuovaPassword123!',
        })

        await auth.signOut()
        await expect(auth.signIn({ username: 'operatore', password: 'Password123!' })).rejects.toThrow()

        await auth.signIn({ username: 'operatore', password: 'NuovaPassword123!' })
        expect(auth.currentUser.value?.username).toBe('operatore')
    })

    it('rejects sign in with invalid password', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()

        await auth.register({
            username: 'tester',
            firstName: 'Luca',
            lastName: 'Bianchi',
            email: 'luca.bianchi@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        await auth.signOut()

        await expect(auth.signIn({ username: 'tester', password: 'wrong-password' })).rejects.toThrow('Password non valida')
    })

    it('invalidates session when expired before sensitive action', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.register({
            username: 'expireme',
            firstName: 'Anna',
            lastName: 'Verdi',
            email: 'anna.verdi@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        const session = settings.get('authSession')
        settings.set('authSession', {
            ...session,
            expiresAt: new Date(Date.now() - 60_000).toISOString(),
        })

        await expect(
            auth.changePassword({
                currentPassword: 'Password123!',
                newPassword: 'NuovaPassword123!',
                confirmPassword: 'NuovaPassword123!',
            }),
        ).rejects.toThrow('Sessione scaduta')

        expect(auth.currentUser.value).toBeNull()
    })

    it('allows user management only to admin users', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.register({
            username: 'operatore1',
            firstName: 'Primo',
            lastName: 'Operatore',
            email: 'operatore1@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        await auth.register({
            username: 'operatore2',
            firstName: 'Secondo',
            lastName: 'Operatore',
            email: 'operatore2@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        await auth.signOut()
        await auth.signIn({ username: 'operatore2', password: 'Password123!' })
        expect(auth.currentUser.value?.role).toBe('operator')
        await expect(auth.listUsers()).rejects.toThrow('Azione consentita solo a utenti admin')
    })

    it('exposes password policy helper and rejects weak passwords', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth, authTestUtils } = authModule
        const auth = useAuth()

        await initAuth()

        expect(authTestUtils.getPasswordPolicy('weak')).toEqual({
            minLength: false,
            hasUppercase: false,
            hasLowercase: true,
            hasDigit: false,
            hasSymbol: false,
        })

        await expect(auth.register({
            username: 'weakuser',
            firstName: 'Weak',
            lastName: 'User',
            email: 'weak.user@example.com',
            password: 'weakpass',
            confirmPassword: 'weakpass',
            githubToken: 'github_pat_any_value',
        })).rejects.toThrow('Password richiesta')
    })

    it('computes credential expiry warning and filters audit events', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth, authTestUtils } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.register({
            username: 'policyuser',
            firstName: 'Policy',
            lastName: 'User',
            email: 'policy.user@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        const expired = authTestUtils.computeCredentialPolicyStatus({
            updatedAt: new Date(Date.now() - (100 * 24 * 60 * 60 * 1000)).toISOString(),
        })
        expect(expired.status).toBe('expired')

        const filtered = await auth.listRecentAuthEvents(20, 'register')
        expect(filtered.some(event => event.action === 'auth_register')).toBe(true)
    })

    it('rejects register with invalid username format', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()

        await expect(auth.register({
            username: 'bad<script>',
            firstName: 'Bad',
            lastName: 'User',
            email: 'bad.user@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })).rejects.toThrow('Username non valido')
    })

    it('blocks sign in with invalid username format and records audit event', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()

        await expect(auth.signIn({ username: 'bad<script>', password: 'Password123!' })).rejects.toThrow('Username non valido')
        expect(authEvents.some(event => event.action === 'auth_signin_blocked_input')).toBe(true)
    })

    it('sanitizes username input to safe charset', async () => {
        const authModule = await import('../../src/services/auth')
        const { authTestUtils } = authModule

        expect(authTestUtils.sanitizeUsernameInput('  Operatore<script>!  ')).toBe('operatorescript')
    })

    it('requests password reset email via Supabase', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.requestPasswordResetByEmail('  User.Email@Example.com  ', {
            redirectTo: 'http://localhost:5173/#/auth/reset-password',
        })

        expect(supabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
            'user.email@example.com',
            { redirectTo: 'http://localhost:5173/#/auth/reset-password' },
        )
    })

    it('sends invite link via Supabase for admin user', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()

        await auth.register({
            username: 'inviter',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin.user@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        const users = settings.get('authUsers')
        const inviterIndex = users.findIndex(user => user.username === 'inviter')
        users[inviterIndex] = {
            ...users[inviterIndex],
            role: 'admin',
            updatedAt: new Date().toISOString(),
        }
        settings.set('authUsers', users)

        await auth.signOut()
        await auth.signIn({ username: 'inviter', password: 'Password123!' })

        await auth.sendInviteLink({
            email: 'new.operator@example.com',
            firstName: 'New',
            lastName: 'Operator',
            redirectTo: 'http://localhost:5173/#/auth/reset-password',
        })

        expect(supabaseAuth.signInWithOtp).toHaveBeenCalledWith({
            email: 'new.operator@example.com',
            options: {
                shouldCreateUser: true,
                emailRedirectTo: 'http://localhost:5173/#/auth/reset-password',
                data: {
                    firstName: 'New',
                    lastName: 'Operator',
                    invitedBy: 'inviter',
                    inviteFlow: 'meditrace-admin',
                },
            },
        })
    })

    it('completes password recovery and updates local password hash', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.register({
            username: 'recoverme',
            firstName: 'Recover',
            lastName: 'Me',
            email: 'recover.me@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        supabaseAuth.getUser.mockResolvedValue({
            data: {
                user: {
                    email: 'recover.me@example.com',
                },
            },
            error: null,
        })

        const result = await auth.completePasswordRecovery({
            newPassword: 'Recovery123!#',
            confirmPassword: 'Recovery123!#',
        })

        expect(result).toEqual({
            username: 'recoverme',
            email: 'recover.me@example.com',
        })

        expect(supabaseAuth.updateUser).toHaveBeenCalledWith({
            password: 'Recovery123!#',
        })
        expect(supabaseAuth.signOut).toHaveBeenCalled()

        await expect(auth.signIn({ username: 'recoverme', password: 'Password123!' })).rejects.toThrow('Password non valida')
        await auth.signIn({ username: 'recoverme', password: 'Recovery123!#' })
        expect(auth.currentUser.value?.username).toBe('recoverme')
    })

    it('records core auth audit events for checklist coverage', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.register({
            username: 'auditadmin',
            firstName: 'Audit',
            lastName: 'Admin',
            email: 'audit.admin@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        const users = settings.get('authUsers')
        const adminIndex = users.findIndex(user => user.username === 'auditadmin')
        users[adminIndex] = {
            ...users[adminIndex],
            role: 'admin',
            updatedAt: new Date().toISOString(),
        }
        settings.set('authUsers', users)

        await auth.signOut()
        await auth.signIn({ username: 'auditadmin', password: 'Password123!' })

        await expect(auth.signIn({ username: 'auditadmin', password: 'wrong-password' })).rejects.toThrow('Password non valida')

        await auth.requestPasswordResetByEmail('audit.admin@example.com', {
            redirectTo: 'http://localhost:5173/#/auth/reset-password',
        })

        await auth.sendInviteLink({
            email: 'invite.target@example.com',
            firstName: 'Invite',
            lastName: 'Target',
            redirectTo: 'http://localhost:5173/#/auth/reset-password',
        })

        await expect(auth.changePassword({
            currentPassword: 'Password123!',
            newPassword: 'NuovaPassword123!',
            confirmPassword: 'NuovaPassword123!',
        })).resolves.toBeUndefined()

        const actions = authEvents.map(event => event.action)
        expect(actions).toContain('auth_signout')
        expect(actions).toContain('auth_signin_failed')
        expect(actions).toContain('auth_signin_success')
        expect(actions).toContain('auth_password_reset_email_requested')
        expect(actions).toContain('auth_invite_email_sent')
        expect(actions).toContain('auth_password_changed')
    })

    it('bootstraps emergency admin account when enabled via env', async () => {
        vi.resetModules()
        vi.stubEnv('VITE_EMERGENCY_ADMIN_ENABLED', '1')
        vi.stubEnv('VITE_EMERGENCY_ADMIN_USERNAME', 'admin_emergenza')
        vi.stubEnv('VITE_EMERGENCY_ADMIN_PASSWORD', 'MediTraceAdmin!2026')
        vi.stubEnv('VITE_EMERGENCY_ADMIN_EMAIL', 'meditace0@gmail.com')
        vi.stubEnv('VITE_EMERGENCY_ADMIN_FIRST_NAME', 'Admin')
        vi.stubEnv('VITE_EMERGENCY_ADMIN_LAST_NAME', 'Emergenza')
        vi.stubEnv('VITE_EMERGENCY_ADMIN_GITHUB_TOKEN', '')

        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()

        expect(auth.hasUsers.value).toBe(true)

        await auth.signIn({ username: 'admin_emergenza', password: 'MediTraceAdmin!2026' })
        expect(auth.currentUser.value?.username).toBe('admin_emergenza')
        expect(auth.currentUser.value?.role).toBe('admin')
        expect(auth.currentUser.value?.email).toBe('meditace0@gmail.com')
    })

    it('updates current user profile data (name, phone, email)', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.register({
            username: 'profileuser',
            firstName: 'Nome',
            lastName: 'Vecchio',
            email: 'profile.user@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        const updated = await auth.updateCurrentProfile({
            firstName: 'Mario',
            lastName: 'Rossi',
            phone: '+39 333 1234567',
            email: 'mario.rossi@example.com',
        })

        expect(updated.firstName).toBe('Mario')
        expect(updated.lastName).toBe('Rossi')
        expect(updated.phone).toBe('+39 333 1234567')
        expect(updated.email).toBe('mario.rossi@example.com')
        expect(auth.currentUser.value?.email).toBe('mario.rossi@example.com')
        expect(authEvents.some(event => event.action === 'auth_profile_updated')).toBe(true)
    })

    it('rejects profile update when email already belongs to another active user', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()
        await auth.register({
            username: 'firstuser',
            firstName: 'First',
            lastName: 'User',
            email: 'first.user@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })
        await auth.signOut()
        await auth.register({
            username: 'seconduser',
            firstName: 'Second',
            lastName: 'User',
            email: 'second.user@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
            githubToken: 'github_pat_any_value',
        })

        await expect(auth.updateCurrentProfile({
            firstName: 'Second',
            lastName: 'User',
            phone: '',
            email: 'first.user@example.com',
        })).rejects.toThrow('Email gia esistente')
    })
})
