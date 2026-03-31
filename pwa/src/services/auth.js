/**
 * auth.js — GitHub Personal Access Token (PAT) authentication
 *
 * GitHub OAuth Apps cannot exchange the authorization code in a pure browser
 * SPA (the token exchange requires a client_secret that must stay private).
 * For a personal 1-2 user app a PAT with only the `gist` scope is the
 * correct, zero-infrastructure alternative — no Google Cloud project, no
 * credit card, no server needed.
 *
 * ONE-TIME SETUP (per user, ~2 minutes):
 *   1. github.com → Settings → Developer settings
 *      → Personal access tokens → Fine-grained tokens → Generate new token
 *   2. Resource owner: yourself
 *      Repository access: Public repositories (or No access)
 *      Account permissions: Gists → Read and write
 *   3. Copy the generated token and paste it into the MediTrace login screen.
 *
 * Security note:
 *   The PAT is stored in IndexedDB (not localStorage) and is only ever sent
 *   to api.github.com over HTTPS. Use a dedicated token — revoke it any time
 *   from github.com/settings/tokens.
 */
import { reactive, readonly, toRefs } from 'vue'
import { getSetting, setSetting } from '../db'

// Module-level singleton state
const state = reactive({
    currentUser: null,   // { login, name, avatarUrl }
    accessToken: null,   // PAT — kept in memory; persisted encrypted-at-rest in IndexedDB
    isInitialized: false,
})

async function validateAndSetToken(pat) {
    const res = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${pat}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })
    if (!res.ok) throw new Error(`GitHub /user: ${res.status} — token non valido o scaduto`)
    const { login, name, avatar_url } = await res.json()
    state.accessToken = pat
    state.currentUser = { login, name: name ?? login, avatarUrl: avatar_url }
    await setSetting('ghPat', pat)
    await setSetting('lastUser', { login, name: name ?? login })
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initAuth() {
    try {
        const stored = await getSetting('ghPat')
        if (stored) await validateAndSetToken(stored)
    } catch (err) {
        await setSetting('ghPat', null)
        console.warn('[auth] PAT stored non valido, rimosso:', err.message)
    } finally {
        state.isInitialized = true
    }
}

export function useAuth() {
    return {
        ...toRefs(readonly(state)),
        async signIn(pat) {
            await validateAndSetToken(pat)
        },
        async signOut() {
            await setSetting('ghPat', null)
            state.accessToken = null
            state.currentUser = null
        },
    }
}
