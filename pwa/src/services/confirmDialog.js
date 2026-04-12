import { ref } from 'vue'

const defaultOptions = {
  title: 'Conferma azione',
  message: 'Confermi di voler procedere?',
  details: '',
  confirmText: 'Conferma',
  cancelText: 'Annulla',
  tone: 'danger',
}

const dialogState = ref({
  isOpen: false,
  options: { ...defaultOptions },
})

let resolver = null
let hasHost = false

function closeWith(result) {
  const resolve = resolver
  resolver = null
  dialogState.value = {
    isOpen: false,
    options: { ...defaultOptions },
  }
  if (resolve) resolve(result)
}

function buildPlainText(options) {
  const lines = [options.title, '', options.message]
  if (options.details) {
    lines.push('', options.details)
  }
  return lines.join('\n')
}

export function registerConfirmDialogHost() {
  hasHost = true
}

export function unregisterConfirmDialogHost() {
  hasHost = false
}

export function useConfirmDialogState() {
  return dialogState
}

export function resolveConfirmDialog(result) {
  closeWith(result)
}

export async function openConfirmDialog(options = {}) {
  const merged = {
    ...defaultOptions,
    ...options,
  }

  if (!hasHost) {
    if (typeof globalThis.confirm === 'function') {
      return globalThis.confirm(buildPlainText(merged))
    }
    return false
  }

  if (resolver) {
    closeWith(false)
  }

  return new Promise((resolve) => {
    resolver = resolve
    dialogState.value = {
      isOpen: true,
      options: merged,
    }
  })
}
