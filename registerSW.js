/**
 * MediTrace — Service Worker Registration
 *
 * Registra il service worker e gestisce:
 *  - Aggiornamenti: notifica l'utente quando una nuova versione è disponibile
 *  - Installazione PWA: intercetta l'evento beforeinstallprompt
 *  - Offline-first: precaching tramite Workbox
 */

if ('serviceWorker' in navigator) {
    // Funzione per notificare l'utente di un aggiornamento disponibile
    function notifyUpdate(registration) {
        // Salva nel sessionStorage per evitare prompt multipli
        if (sessionStorage.getItem('sw-update-prompted')) return

        const shouldUpdate = confirm(
            '🔄 Una nuova versione di MediTrace è disponibile.\n\n' +
            'Clicca OK per aggiornare ora (l\'app si ricaricherà).'
        )

        if (shouldUpdate) {
            sessionStorage.removeItem('sw-update-prompted')
            if (registration && registration.waiting) {
                // Notifica il waiting SW di attivarsi subito
                registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
            window.location.reload()
        } else {
            // L'utente rimanda — lo chiediamo solo una volta per sessione
            try {
                sessionStorage.setItem('sw-update-prompted', '1')
            } catch (_) { /* ignore */ }
        }
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/MediTrace/sw.js', { scope: '/MediTrace/' })
            .then((registration) => {
                console.log('[MediTrace] SW registered:', registration.scope)

                // Controlla se c'è già un nuovo SW in attesa
                if (registration.waiting) {
                    notifyUpdate(registration)
                }

                // Ascolta nuovi SW in arrivo
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing
                    if (!newWorker) return

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nuovo SW installato e pronto — notifica l'utente
                            notifyUpdate(registration)
                        }
                    })
                })
            })
            .catch((err) => {
                console.error('[MediTrace] SW registration failed:', err)
            })

        // Ricarica quando il nuovo SW prende il controllo
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return
            refreshing = true
            window.location.reload()
        })
    })
}