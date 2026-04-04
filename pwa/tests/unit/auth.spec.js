import { beforeEach, describe, expect, it, vi } from 'vitest'

const settings = new Map()
const authEvents = []

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
        setupGithubUserFetchMock()
    })

    it('registers, signs in and changes password with local credentials', async () => {
        const authModule = await import('../../src/services/auth')
        const { initAuth, useAuth } = authModule
        const auth = useAuth()

        await initAuth()

        await auth.register({
            username: 'Operatore',
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
})
