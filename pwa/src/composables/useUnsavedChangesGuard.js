import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { openConfirmDialog } from '../services/confirmDialog'

export function useUnsavedChangesGuard(isDirty, {
  title = 'Modifiche non salvate',
  message = 'Hai modifiche non salvate. Vuoi uscire senza salvare?',
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
    const shouldLeave = await openConfirmDialog({
      title,
      message,
      confirmText: 'Esci senza salvare',
      cancelText: 'Resta nella pagina',
      tone: 'danger',
    })
    return shouldLeave
  })
}
