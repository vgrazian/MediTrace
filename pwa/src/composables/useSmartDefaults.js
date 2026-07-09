/**
 * useSmartDefaults.js — Memoria ultimi valori usati nei form
 *
 * Salva/ripristina gli ultimi valori inseriti nei form per
 * accelerare la compilazione ripetitiva. I valori sono in localStorage
 * con chiavi per tipo entità.
 *
 * Uso:
 *   const { remember, recall } = useSmartDefaults('ospiti')
 *   const lastRoomId = recall('roomId', '')
 *   remember('roomId', 'room_abc')
 */

const PREFIX = 'meditrace:smart:'

export function useSmartDefaults(entityType) {
    const key = (field) => `${PREFIX}${entityType}:${field}`

    /**
     * Ricorda un valore per un campo.
     * @param {string} field - nome del campo
     * @param {string} value - valore da ricordare
     */
    function remember(field, value) {
        try {
            if (value === null || value === undefined || value === '') {
                localStorage.removeItem(key(field))
                return
            }
            localStorage.setItem(key(field), String(value))
        } catch { /* localStorage pieno o non disponibile */ }
    }

    /**
     * Richiama l'ultimo valore ricordato per un campo.
     * @param {string} field - nome del campo
     * @param {string} fallback - valore di default se non ricordato
     * @returns {string}
     */
    function recall(field, fallback = '') {
        try {
            return localStorage.getItem(key(field)) ?? fallback
        } catch {
            return fallback
        }
    }

    /**
     * Pulisce tutti i valori ricordati per questa entità.
     */
    function forgetAll() {
        try {
            const prefix = `${PREFIX}${entityType}:`
            const keys = []
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i)
                if (k && k.startsWith(prefix)) keys.push(k)
            }
            keys.forEach(k => localStorage.removeItem(k))
        } catch { /* ignore */ }
    }

    return { remember, recall, forgetAll }
}
