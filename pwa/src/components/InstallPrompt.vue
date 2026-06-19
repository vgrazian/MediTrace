<!--
  InstallPrompt.vue — Banner/Modal per invitare l'utente a installare la PWA
  
  Utilizzo:
    <InstallPrompt />
  
  Mostra un banner animato in basso (mobile) o un toast in alto (desktop)
  quando l'app è installabile. Il banner:
  - Ha un'animazione di entrata dal basso
  - Mostra icona, titolo, descrizione e pulsanti Installa / Non ora
  - Salva la scelta "Non ora" per 24h in sessionStorage
  - Si auto-nasconde se l'utente installa l'app
  - Non viene mostrato se l'app è già in modalità standalone
-->
<script setup>
import { usePwaInstall } from '../composables/usePwaInstall.js'
import { ref, computed } from 'vue'

const {
  isInstalled,
  showPrompt,
  canInstall,
  install,
  dismiss
} = usePwaInstall()

const isInstalling = ref(false)
const installMessage = ref('')

// ── Varianti per piattaforma ──
const isIOS = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
})

const isAndroid = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /Android/.test(navigator.userAgent)
})

const platformHint = computed(() => {
  if (isIOS.value) return 'Tocca l\'icona Condividi e poi "Aggiungi a Home"'
  if (isAndroid.value) return 'Tocca "Installa app" qui sotto o usa il menu ⋮ → Aggiungi a schermata Home'
  return 'Installa MediTrace per un accesso rapido e uso offline'
})

// ── Azioni ──
async function handleInstall() {
  if (isInstalling.value) return
  isInstalling.value = true
  installMessage.value = ''

  const { outcome } = await install()

  if (outcome === 'accepted') {
    installMessage.value = '✅ App installata con successo!'
  } else if (outcome === 'dismissed') {
    installMessage.value = ''
    dismiss()
  } else if (outcome === 'unavailable') {
    // Su iOS o browser che non supportano beforeinstallprompt,
    // mostriamo istruzioni manuali
    if (isIOS.value) {
      dismiss()
    } else {
      installMessage.value = 'Usa il menu del browser per installare l\'app'
      setTimeout(() => { installMessage.value = '' }, 3000)
    }
  } else {
    installMessage.value = 'Riprova dal menu del browser'
    setTimeout(() => { installMessage.value = '' }, 3000)
  }

  isInstalling.value = false
}

function handleDismiss() {
  dismiss()
}
</script>

<template>
  <!-- Non mostrare se già installata o prompt nascosto -->
  <Transition name="install-slide">
    <div
      v-if="!isInstalled && showPrompt"
      class="install-prompt"
      role="dialog"
      aria-label="Installa MediTrace"
      aria-live="polite"
    >
      <div class="install-prompt-content">
        <!-- Icona app -->
        <div class="install-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#2563eb" />
            <text x="20" y="27" text-anchor="middle" fill="white" font-size="22" font-weight="bold">M</text>
          </svg>
        </div>

        <!-- Testo -->
        <div class="install-text">
          <strong class="install-title">Aggiungi MediTrace alla Home</strong>
          <p class="install-hint">{{ platformHint }}</p>
          <p v-if="installMessage" class="install-message">{{ installMessage }}</p>
        </div>

        <!-- Azioni -->
        <div class="install-actions">
          <button
            class="install-btn install-btn-primary"
            :disabled="isInstalling"
            @click="handleInstall"
          >
            {{ isInstalling ? 'Installazione...' : 'Installa' }}
          </button>
          <button
            class="install-btn install-btn-secondary"
            @click="handleDismiss"
          >
            Non ora
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Contenitore banner ── */
.install-prompt {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: #ffffff;
  border-top: 2px solid #2563eb;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

.install-prompt-content {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
  flex-wrap: wrap;
}

/* ── Icona ── */
.install-icon {
  flex-shrink: 0;
}

/* ── Testo ── */
.install-text {
  flex: 1;
  min-width: 180px;
}

.install-title {
  display: block;
  font-size: 15px;
  color: #1e293b;
  margin-bottom: 2px;
}

.install-hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}

.install-message {
  margin: 4px 0 0;
  font-size: 13px;
  color: #16a34a;
  font-weight: 500;
}

/* ── Pulsanti ── */
.install-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.install-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;
}

.install-btn:active {
  transform: scale(0.97);
}

.install-btn-primary {
  background: #2563eb;
  color: #ffffff;
}

.install-btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.install-btn-primary:disabled {
  opacity: 0.6;
  cursor: wait;
}

.install-btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.install-btn-secondary:hover {
  background: #e2e8f0;
}

/* ── Animazione entrata/uscita ── */
.install-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.install-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.6, 1),
              opacity 0.25s cubic-bezier(0.4, 0, 0.6, 1);
}

.install-slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.install-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* ── Responsive: su desktop mostriamo più compatto ── */
@media (min-width: 768px) {
  .install-prompt {
    bottom: 16px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    padding: 12px 20px;
    max-width: 520px;
  }

  .install-prompt-content {
    flex-wrap: nowrap;
  }

  /* Animazione desktop: dal basso con fade */
  .install-slide-enter-from,
  .install-slide-leave-to {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
}
</style>
