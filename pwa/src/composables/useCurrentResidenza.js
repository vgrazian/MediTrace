/**
 * useCurrentResidenza.js — Reactive shared state for the currently selected residence.
 *
 * All views read from this composable to scope their data to the active residence.
 * AppNav writes to it when the operator changes residence.
 * Persisted to settings via CURRENT_RESIDENZA_SETTING_KEY.
 */
import { ref } from 'vue'
import { getSetting, setSetting } from '../db'
import { CURRENT_RESIDENZA_SETTING_KEY } from '../services/promemoria'

const residenzaId = ref('')
const initialized = ref(false)

/**
 * Initialize the residence ID from persisted settings.
 * Call once on app mount (AppNav does this).
 */
export async function initCurrentResidenza() {
    if (initialized.value) return
    try {
        const saved = await getSetting(CURRENT_RESIDENZA_SETTING_KEY, '')
        residenzaId.value = String(saved || '')
    } catch {
        residenzaId.value = ''
    }
    initialized.value = true
}

/**
 * Set the current residence ID. Persists to settings and updates all reactive views.
 */
export async function setCurrentResidenza(id) {
    residenzaId.value = String(id || '')
    await setSetting(CURRENT_RESIDENZA_SETTING_KEY, residenzaId.value)
}

/**
 * Composable hook: returns reactive ref to the current residence ID.
 * All views use this to filter their data.
 */
export function useCurrentResidenza() {
    return { residenzaId }
}

export { CURRENT_RESIDENZA_SETTING_KEY }
