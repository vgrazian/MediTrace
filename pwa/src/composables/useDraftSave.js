/**
 * useDraftSave.js — Salvataggio automatico bozze form
 *
 * Auto-salva lo stato del form in localStorage mentre l'utente compila.
 * All'apertura del form, offre di ripristinare una bozza esistente.
 *
 * Uso:
 *   const { startDraft, clearDraft, hasDraft } = useDraftSave('ospiti')
 *   watch(form, () => startDraft(form), { deep: true })
 *   onMounted(() => { if (hasDraft()) askToRestore() })
 */

import { ref, watch, onBeforeUnmount } from 'vue'

const PREFIX = 'meditrace:draft:'
const DEBOUNCE_MS = 3000 // Salva ogni 3 secondi dopo l'ultima modifica

export function useDraftSave(entityType) {
    const draftKey = `${PREFIX}${entityType}`
    const hasDraftAvailable = ref(false)
    let debounceTimer = null

    /**
     * Verifica se esiste una bozza salvata per questa entità.
     */
    function hasDraft() {
        try {
            const raw = localStorage.getItem(draftKey)
            hasDraftAvailable.value = raw !== null
            return raw !== null
        } catch {
            return false
        }
    }

    /**
     * Recupera la bozza salvata.
     * @returns {object|null}
     */
    function loadDraft() {
        try {
            const raw = localStorage.getItem(draftKey)
            if (!raw) return null
            return JSON.parse(raw)
        } catch {
            return null
        }
    }

    /**
     * Salva lo stato corrente del form come bozza (debounced).
     * @param {object} formState - stato attuale del form
     */
    function startDraft(formState) {
        // Debounce: salva solo dopo 3s di inattività
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            try {
                const state = JSON.parse(JSON.stringify(formState))
                state._savedAt = new Date().toISOString()
                localStorage.setItem(draftKey, JSON.stringify(state))
                hasDraftAvailable.value = true
            } catch { /* localStorage pieno */ }
        }, DEBOUNCE_MS)
    }

    /**
     * Rimuove la bozza (dopo save riuscito o discard esplicito).
     */
    function clearDraft() {
        if (debounceTimer) {
            clearTimeout(debounceTimer)
            debounceTimer = null
        }
        try {
            localStorage.removeItem(draftKey)
            hasDraftAvailable.value = false
        } catch { /* ignore */ }
    }

    /**
     * Recupera data/ora dell'ultimo salvataggio bozza.
     * @returns {string|null}
     */
    function draftSavedAt() {
        const draft = loadDraft()
        return draft?._savedAt || null
    }

    onBeforeUnmount(() => {
        if (debounceTimer) clearTimeout(debounceTimer)
    })

    // Check on init
    hasDraft()

    return {
        hasDraft,
        hasDraftAvailable,
        loadDraft,
        startDraft,
        clearDraft,
        draftSavedAt,
    }
}
