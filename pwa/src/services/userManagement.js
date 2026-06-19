import { setUserRoleWithTable } from './supabaseTableAuth'

/**
 * Cambia il ruolo di un utente (solo admin).
 * @param {string} username
 * @param {string} role ('admin'|'operator')
 * @returns {Promise<object>} user aggiornato
 */
export async function setUserRole({ username, role }) {
    if (!['admin', 'operator'].includes(role)) throw new Error('Ruolo non valido')
    return setUserRoleWithTable({ username, role })
}
