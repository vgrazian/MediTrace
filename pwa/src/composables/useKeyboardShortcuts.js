/**
 * useKeyboardShortcuts.js — Scorciatoie da tastiera condivise per tutte le viste CRUD
 *
 * Shortcuts:
 *   /  → focus sul campo di ricerca/filtro
 *   n  → nuova entità (apri form aggiunta)
 *   Ctrl+S / Cmd+S  → salva form corrente (quando aperto)
 *   d  → elimina elemento selezionato
 *
 * Uso:
 *   useKeyboardShortcuts({
 *     onNew: () => openForm(),
 *     onSave: () => saveForm(),
 *     onDelete: () => deleteSelected(),
 *     searchPlaceholder: 'Cerca per nome...',
 *     isFormOpen: computed(() => formOpen.value),
 *   })
 */
import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts({
    onNew,
    onSave,
    onDelete,
    searchPlaceholder = '',
    isFormOpen = null,
} = {}) {
    function handler(event) {
        const tag = (event.target?.tagName || '').toLowerCase()
        const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable

        // / — Focus ricerca (sempre, tranne se già in input)
        if (event.key === '/') {
            if (isInput) return
            event.preventDefault()
            if (searchPlaceholder) {
                const el = document.querySelector(`input[placeholder*="${searchPlaceholder.substring(0, 20)}"]`)
                if (el) el.focus()
            }
        }

        // Tutti gli altri shortcut — solo se NON in input
        if (isInput) return

        // n — Nuovo
        if (event.key === 'n' && !event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            if (onNew) onNew()
        }

        // Ctrl+S / Cmd+S — Salva
        if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            if (isFormOpen && (typeof isFormOpen === 'function' ? !isFormOpen() : !isFormOpen?.value)) return
            event.preventDefault()
            if (onSave) onSave()
        }

        // d — Elimina
        if (event.key === 'd' && !event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            if (onDelete) onDelete()
        }
    }

    onMounted(() => {
        window.addEventListener('keydown', handler)
    })

    onUnmounted(() => {
        window.removeEventListener('keydown', handler)
    })
}

/**
 * Ritorna il suffisso tooltip per i pulsanti con shortcut.
 * Es: shortcutHint('n') → ' (N)'
 *
 * @param {string} key - tasto shortcut
 * @returns {string}
 */
export function shortcutHint(key) {
    return ` (${key.toUpperCase()})`
}
