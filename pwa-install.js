/**
 * MediTrace PWA Install — Standalone script (no Vue dependency)
 * 
 * Inietta un banner di installazione nel DOM e gestisce il flusso
 * beforeinstallprompt in modo completamente indipendente dalla SPA.
 * 
 * Da includere in index.html PRIMA della chiusura di </body>.
 */
(function () {
    'use strict';

    // ── Non mostrare se già in modalità standalone ──
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return;
    if (typeof navigator !== 'undefined' && navigator.standalone) return;

    var deferredPrompt = null;
    var bannerEl = null;
    var isDismissed = false;

    // Controlla sessionStorage
    try {
        var dismissedAt = sessionStorage.getItem('pwa-install-dismissed');
        if (dismissedAt) {
            var elapsed = Date.now() - parseInt(dismissedAt, 10);
            if (elapsed < 24 * 60 * 60 * 1000) isDismissed = true;
        }
    } catch (_) { /* ignore */ }

    // ── Determina piattaforma ──
    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPad|iPod/.test(ua);
    var isAndroid = /Android/.test(ua);

    function getHint() {
        if (isIOS) return 'Tocca l\'icona Condividi e poi "Aggiungi a Home"';
        if (isAndroid) return 'Tocca "Installa app" per un accesso rapido e uso offline';
        return 'Installa MediTrace per un accesso rapido e uso offline';
    }

    // ── Crea il banner ──
    function createBanner() {
        if (bannerEl) return;

        var hint = getHint();

        bannerEl = document.createElement('div');
        bannerEl.className = 'pwa-install-banner';
        bannerEl.setAttribute('role', 'dialog');
        bannerEl.setAttribute('aria-label', 'Installa MediTrace');
        bannerEl.setAttribute('aria-live', 'polite');
        bannerEl.innerHTML =
            '<div class="pwa-install-banner-content">' +
            '<div class="pwa-install-icon" aria-hidden="true">' +
            '<svg width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#2563eb"/><text x="20" y="27" text-anchor="middle" fill="white" font-size="22" font-weight="bold">M</text></svg>' +
            '</div>' +
            '<div class="pwa-install-text">' +
            '<strong class="pwa-install-title">Aggiungi MediTrace alla Home</strong>' +
            '<p class="pwa-install-hint">' + hint + '</p>' +
            '<p class="pwa-install-message" style="display:none"></p>' +
            '</div>' +
            '<div class="pwa-install-actions">' +
            '<button class="pwa-install-btn pwa-install-btn-primary">Installa</button>' +
            '<button class="pwa-install-btn pwa-install-btn-secondary">Non ora</button>' +
            '</div>' +
            '</div>';

        // Event listeners
        var primaryBtn = bannerEl.querySelector('.pwa-install-btn-primary');
        var secondaryBtn = bannerEl.querySelector('.pwa-install-btn-secondary');

        primaryBtn.addEventListener('click', handleInstall);
        secondaryBtn.addEventListener('click', handleDismiss);

        document.body.appendChild(bannerEl);

        // Animazione entrata
        requestAnimationFrame(function () {
            bannerEl.classList.add('pwa-install-banner--visible');
        });
    }

    function removeBanner() {
        if (!bannerEl) return;
        bannerEl.classList.remove('pwa-install-banner--visible');
        setTimeout(function () {
            if (bannerEl && bannerEl.parentNode) {
                bannerEl.parentNode.removeChild(bannerEl);
            }
            bannerEl = null;
        }, 300);
    }

    // ── Azioni ──
    function handleInstall() {
        if (!deferredPrompt) {
            // Fallback: nessun prompt disponibile
            if (isIOS) {
                handleDismiss();
                return;
            }
            var msgEl = bannerEl && bannerEl.querySelector('.pwa-install-message');
            if (msgEl) {
                msgEl.textContent = 'Usa il menu del browser per installare l\'app';
                msgEl.style.display = 'block';
            }
            return;
        }

        var btn = bannerEl && bannerEl.querySelector('.pwa-install-btn-primary');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Installazione...';
        }

        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choiceResult) {
            deferredPrompt = null;
            if (choiceResult.outcome === 'accepted') {
                removeBanner();
            } else {
                var btn2 = bannerEl && bannerEl.querySelector('.pwa-install-btn-primary');
                if (btn2) {
                    btn2.disabled = false;
                    btn2.textContent = 'Installa';
                }
                handleDismiss();
            }
        }).catch(function () {
            deferredPrompt = null;
            handleDismiss();
        });
    }

    function handleDismiss() {
        try {
            sessionStorage.setItem('pwa-install-dismissed', String(Date.now()));
        } catch (_) { /* ignore */ }
        isDismissed = true;
        removeBanner();
    }

    // ── Mostra banner quando beforeinstallprompt è disponibile ──
    function showIfAvailable() {
        if (isDismissed) return;
        if (!deferredPrompt && !isIOS && !('BeforeInstallPromptEvent' in window)) return;
        // Su iOS mostriamo sempre (con istruzioni manuali)
        createBanner();
    }

    // ── Ascolta beforeinstallprompt ──
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        showIfAvailable();
    });

    // ── Su iOS o quando beforeinstallprompt non è supportato, ritardiamo ──
    // Il banner viene comunque mostrato dopo un breve delay per dare
    // tempo all'utente di orientarsi nell'app
    window.addEventListener('appinstalled', function () {
        removeBanner();
    });

    // Ascolta cambi display-mode
    try {
        var mq = window.matchMedia('(display-mode: standalone)');
        mq.addEventListener('change', function (e) {
            if (e.matches) removeBanner();
        });
    } catch (_) { /* ignore */ }

    // ── API esposta globalmente ──
    // window.MediTracePWA.showInstall() può essere chiamata da Vue
    window.MediTracePWA = {
        showInstall: function () {
            isDismissed = false;
            try { sessionStorage.removeItem('pwa-install-dismissed'); } catch (_) { }
            showIfAvailable();
        },
        isInstalled: function () {
            return window.matchMedia('(display-mode: standalone)').matches ||
                (typeof navigator !== 'undefined' && navigator.standalone);
        },
        canInstall: function () {
            return !!deferredPrompt || ('BeforeInstallPromptEvent' in window);
        }
    };

})();
