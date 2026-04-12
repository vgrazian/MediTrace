import { onBeforeUnmount, ref } from 'vue'

const DEFAULT_UNDO_TIMEOUT_MS = 10_000

export function useUndoDelete(timeoutMs = DEFAULT_UNDO_TIMEOUT_MS) {
    const pendingUndo = ref(null)
    let undoTimer = null

    function clearUndo() {
        if (undoTimer) {
            clearTimeout(undoTimer)
            undoTimer = null
        }
        pendingUndo.value = null
    }

    function scheduleUndo({
        label,
        undoAction,
        timeout = timeoutMs,
    }) {
        clearUndo()

        pendingUndo.value = {
            label: String(label || 'Elemento eliminato.'),
            undoAction,
        }

        undoTimer = setTimeout(() => {
            pendingUndo.value = null
            undoTimer = null
        }, timeout)
    }

    async function executeUndo() {
        if (!pendingUndo.value?.undoAction) {
            clearUndo()
            return
        }

        const action = pendingUndo.value.undoAction
        clearUndo()
        await action()
    }

    onBeforeUnmount(() => {
        clearUndo()
    })

    return {
        pendingUndo,
        scheduleUndo,
        executeUndo,
        clearUndo,
    }
}
