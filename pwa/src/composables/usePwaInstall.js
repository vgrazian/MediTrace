/**
 * usePwaInstall.js — Composable per gestire l'installazione PWA
 *
 * Fornisce:
 *  - canInstall:  true quando il browser supporta l'installazione e l'app non è già installata
 *  - isInstalled: true se l'app è in esecuzione in modalità standalone/fullscreen
 *  - install():   avvia il flusso di installazione nativo
 *  - dismiss():   nasconde il prompt (salvato in sessionStorage)
 *  - showPrompt:  reactive, controlla se mostrare il banner
 */

import { ref, readonly, onMounted } from 'vue'

// ── Singleton globale: l'evento beforeinstallprompt viene catturato una volta sola ──
let deferredPrompt = null
let listenersSetup = false

const canInstall = ref(false)
const isInstalled = ref(false)
const showPrompt = ref(false)
const isNative = ref(false)

// Controlla se l'app è già in esecuzione in modalità standalone
function checkInstalled() {
    if (typeof window === 'undefined') return false

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
    // iOS Safari standalone
    const isIOSStandalone = typeof navigator !== 'undefined' &&
        ('standalone' in navigator) && navigator.standalone === true

    return isStandalone || isFullscreen || isIOSStandalone
}

// Verifica se l'installazione è già stata rimandata in questa sessione
function wasDismissed() {
    try {
        const dismissed = sessionStorage.getItem('pwa-install-dismissed')
        if (!dismissed) return false
        // Riscade dopo 24 ore
        const dismissedAt = parseInt(dismissed, 10)
        return Date.now() - dismissedAt < 24 * 60 * 60 * 1000
    } catch {
        return false
    }
}

function setupListeners() {
    if (listenersSetup || typeof window === 'undefined') return
    listenersSetup = true

    // 1. Rileva se già installata
    isInstalled.value = checkInstalled()

    if (isInstalled.value) {
        isNative.value = true
        return // non serve mostrare il prompt di installazione
    }

    // 2. Ascolta l'evento beforeinstallprompt (Chrome, Edge, Samsung Internet, Opera)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        deferredPrompt = e
        canInstall.value = true

        // Mostra il banner solo se non è stato dismissato di recente
        if (!wasDismissed()) {
            showPrompt.value = true
        }
    })

    // 3. Rileva quando l'app viene installata con successo
    window.addEventListener('appinstalled', () => {
        isInstalled.value = true
        isNative.value = true
        canInstall.value = false
        showPrompt.value = false
        deferredPrompt = null
    })

    // 4. Ascolta cambi di display-mode (es. quando si apre da home screen)
    const displayModeQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayChange = (e) => {
        if (e.matches) {
            isInstalled.value = true
            isNative.value = true
            canInstall.value = false
            showPrompt.value = false
        }
    }
    try {
        displayModeQuery.addEventListener('change', handleDisplayChange)
    } catch {
        // Fallback per browser più vecchi
        displayModeQuery.addListener(handleDisplayChange)
    }
}

/**
 * Avvia il flusso di installazione nativo
 * @returns {Promise<{outcome: string}>}
 */
async function install() {
    if (!deferredPrompt) {
        // Fallback: alcune versioni di Chrome su Android permettono installazione
        // anche senza beforeinstallprompt tramite le API standard
        if (typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window) {
            // Prova a triggerare il prompt nativo comunque
            showPrompt.value = true
        }
        return { outcome: 'unavailable' }
    }

    try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        deferredPrompt = null
        canInstall.value = false
        showPrompt.value = false

        if (outcome === 'accepted') {
            isInstalled.value = true
            isNative.value = true
        }

        return { outcome }
    } catch {
        deferredPrompt = null
        canInstall.value = false
        showPrompt.value = false
        return { outcome: 'error' }
    }
}

/**
 * Nasconde il prompt (l'utente ha scelto "non ora")
 */
function dismiss() {
    showPrompt.value = false
    try {
        sessionStorage.setItem('pwa-install-dismissed', String(Date.now()))
    } catch {
        // sessionStorage non disponibile
    }
}

/**
 * Forza la visualizzazione del prompt (es. da menu Impostazioni)
 * Se lo script standalone pwa-install.js è caricato, usa il suo banner.
 */
function showInstallPrompt() {
    // Delega al banner standalone se disponibile (iniettato da pwa-install.js)
    if (typeof window !== 'undefined' && window.MediTracePWA && window.MediTracePWA.showInstall) {
        window.MediTracePWA.showInstall()
        return
    }
    // Fallback: usa il banner Vue interno
    if (canInstall.value && !wasDismissed()) {
        showPrompt.value = true
    }
}

export function usePwaInstall() {
    onMounted(() => {
        setupListeners()
    })

    return {
        canInstall: readonly(canInstall),
        isInstalled: readonly(isInstalled),
        isNative: readonly(isNative),
        showPrompt: readonly(showPrompt),
        install,
        dismiss,
        showInstallPrompt
    }
}
