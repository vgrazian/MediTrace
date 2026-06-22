import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { openConfirmDialog } from '../services/confirmDialog'

export function useUnsavedChangesGuard(isDirty, {
  title = 'Modifiche non salvate',
  message = 'Hai modifiche non salvate. Cosa vuoi fare?',
  onSave = null,
} = {}) {
  const handleBeforeUnload = (event) => {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true

    if (onSave) {
      const choice = await openConfirmDialog({
        title,
        message,
        confirmText: 'Salva ed esci',
        cancelText: 'Esci senza salvare',
        extraText: 'Annulla',
        tone: 'primary',
        threeButton: true,
      })

      if (choice === true) {
        // User chose "Salva ed esci"
        try {
          await onSave()
          return true
        } catch (err) {
          // Save failed (e.g., validation) — stay on page, error shown by caller
          return false
        }
      } else if (choice === false) {
        // User chose "Esci senza salvare"
        return true
      }
      // User chose "Annulla" (extra) or dismissed — stay on page
      return false
    }

    const shouldLeave = await openConfirmDialog({
      title,
      message: 'Hai modifiche non salvate. Vuoi uscire senza salvare?',
      confirmText: 'Esci senza salvare',
      cancelText: 'Resta nella pagina',
      tone: 'danger',
    })
    return shouldLeave
  })
}
