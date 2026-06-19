import { openConfirmDialog } from './confirmDialog'

/**
 * Confirmation Dialog Service
 * 
 * Provides consistent, user-friendly confirmation dialogs for destructive actions.
 * Replaces generic window.confirm() with more informative dialogs that explain
 * consequences and provide clear action buttons.
 */

/**
 * Show a confirmation dialog for a destructive action
 * 
 * @param {Object} options - Confirmation options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Main message explaining what will happen
 * @param {string[]} [options.consequences] - List of consequences (optional)
 * @param {string} [options.confirmText='Conferma'] - Text for confirm button
 * @param {string} [options.cancelText='Annulla'] - Text for cancel button
 * @param {string} [options.itemName] - Name of item being deleted (for context)
 * @param {string} [options.itemType] - Type of item (e.g., 'farmaco', 'ospite')
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
export async function confirmDestructiveAction(options) {
    const {
        title,
        message,
        consequences = [],
        confirmText = 'Conferma',
        cancelText = 'Annulla',
        itemName,
        itemType
    } = options

    // Build confirmation message
    let fullMessage = message

    if (itemName && itemType) {
        fullMessage = `${message}\n\n${itemType}: ${itemName}`
    }

    if (consequences.length > 0) {
        fullMessage += '\n\nConseguenze:\n' + consequences.map(c => `• ${c}`).join('\n')
    }

    fullMessage += '\n\nQuesta azione non può essere annullata.'

    return openConfirmDialog({
        title,
        message,
        details: fullMessage.replace(`${message}\n\n`, ''),
        confirmText,
        cancelText,
        tone: 'danger',
    })
}

/**
 * Confirm deletion of a host (ospite)
 */
export async function confirmDeleteHost(hostName) {
    return confirmDestructiveAction({
        title: 'Elimina Ospite',
        message: 'Sei sicuro di voler eliminare questo ospite?',
        itemName: hostName,
        itemType: 'Ospite',
        consequences: [
            'Tutte le terapie associate saranno disattivate',
            'I promemoria collegati saranno rimossi',
            'L\'assegnazione stanza/letto sarà liberata',
            'La cronologia movimenti resterà per audit'
        ],
        confirmText: 'Elimina Ospite',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deletion of a drug (farmaco)
 */
export async function confirmDeleteDrug(drugName) {
    return confirmDestructiveAction({
        title: 'Elimina Farmaco',
        message: 'Sei sicuro di voler eliminare questo farmaco?',
        itemName: drugName,
        itemType: 'Farmaco',
        consequences: [
            'Tutte le confezioni in magazzino saranno rimosse',
            'Le terapie attive con questo farmaco saranno disattivate',
            'I promemoria collegati saranno rimossi',
            'La cronologia movimenti resterà per audit'
        ],
        confirmText: 'Elimina Farmaco',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deletion of a stock batch (confezione)
 */
export async function confirmDeleteBatch(batchInfo) {
    return confirmDestructiveAction({
        title: 'Elimina Confezione',
        message: 'Sei sicuro di voler eliminare questa confezione?',
        itemName: batchInfo,
        itemType: 'Confezione',
        consequences: [
            'La quantità disponibile sarà rimossa dal magazzino',
            'Le scorte potrebbero scendere sotto la soglia minima',
            'La cronologia movimenti resterà per audit'
        ],
        confirmText: 'Elimina Confezione',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deletion of a reminder (promemoria)
 */
export async function confirmDeleteReminder(reminderInfo) {
    return confirmDestructiveAction({
        title: 'Elimina Promemoria',
        message: 'Sei sicuro di voler eliminare questo promemoria?',
        itemName: reminderInfo,
        itemType: 'Promemoria',
        consequences: [
            'Il promemoria sarà rimosso definitivamente',
            'Le notifiche programmate saranno cancellate'
        ],
        confirmText: 'Elimina Promemoria',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deletion of a movement (movimento)
 */
export async function confirmDeleteMovement(movementInfo) {
    return confirmDestructiveAction({
        title: 'Elimina Movimento',
        message: 'Sei sicuro di voler eliminare questo movimento?',
        itemName: movementInfo,
        itemType: 'Movimento',
        consequences: [
            'Il movimento sarà rimosso dalla cronologia',
            'Le quantità di magazzino potrebbero risultare inconsistenti',
            'Questa operazione dovrebbe essere usata solo per correggere errori'
        ],
        confirmText: 'Elimina Movimento',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deletion of a user (utente)
 */
export async function confirmDeleteUser(username) {
    return confirmDestructiveAction({
        title: 'Elimina Utente',
        message: 'Sei sicuro di voler eliminare questo utente?',
        itemName: username,
        itemType: 'Utente',
        consequences: [
            'L\'utente non potrà più accedere all\'applicazione',
            'Le sessioni attive saranno invalidate',
            'La cronologia audit resterà per tracciabilità'
        ],
        confirmText: 'Elimina Utente',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deactivation of a therapy (terapia)
 */
export async function confirmDeactivateTherapy(therapyInfo) {
    return confirmDestructiveAction({
        title: 'Disattiva Terapia',
        message: 'Sei sicuro di voler disattivare questa terapia?',
        itemName: therapyInfo,
        itemType: 'Terapia',
        consequences: [
            'La terapia sarà marcata come terminata',
            'I promemoria futuri saranno cancellati',
            'La cronologia somministrazioni resterà visibile'
        ],
        confirmText: 'Disattiva Terapia',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deactivation of a room (stanza)
 */
export async function confirmDeactivateRoom(roomName) {
    return confirmDestructiveAction({
        title: 'Disattiva Stanza',
        message: 'Sei sicuro di voler disattivare questa stanza?',
        itemName: roomName,
        itemType: 'Stanza',
        consequences: [
            'La stanza non sarà più disponibile per nuove assegnazioni',
            'Gli ospiti attualmente assegnati dovranno essere riassegnati',
            'I letti della stanza saranno disattivati'
        ],
        confirmText: 'Disattiva Stanza',
        cancelText: 'Annulla'
    })
}

/**
 * Confirm deletion of multiple selected items.
 *
 * This helper supports the PR52 selection-based CRUD workflow by providing a
 * single, consistent confirmation message for bulk destructive actions.
 *
 * @param {number} count
 * Number of selected items that will be deleted.
 * @param {string} [itemType='elementi']
 * Human-readable plural or singular label for the selected item type.
 * @returns {Promise<boolean>}
 * True when the user confirms the bulk deletion.
 */
export async function confirmDeleteMultiple(count, itemType = 'elementi') {
    const normalizedType = String(itemType || '').toLowerCase()
    const isHostType = normalizedType.includes('ospite') || normalizedType.includes('ospiti')

    const message = count === 1
        ? `Sei sicuro di voler eliminare questo ${itemType}?`
        : `Sei sicuro di voler eliminare ${count} ${itemType}?`

    const baseDetails = count > 1
        ? `Questa azione eliminerà ${count} ${itemType} e non può essere annullata.`
        : 'Questa azione non può essere annullata.'
    const cascadeDetails = isHostType
        ? ' Verranno disattivate anche le terapie associate e liberate le assegnazioni stanza/letto.'
        : ''
    const details = `${baseDetails}${cascadeDetails}`

    return openConfirmDialog({
        title: count === 1 ? 'Conferma eliminazione' : 'Conferma eliminazione multipla',
        message,
        details,
        confirmText: 'Elimina',
        cancelText: 'Annulla',
        tone: 'danger',
    })
}

// Made with Bob
