<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useAuth } from '../services/auth'
import { fullSync } from '../services/sync'
import { retryQueue, refreshFromServer, isDataServiceAvailable } from '../services/dataService'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { db, getSetting, setSetting } from '../db'
import { useSyncState, SYNC_STATES } from '../composables/useSyncState'
import { CURRENT_RESIDENZA_SETTING_KEY } from '../services/promemoria'
import { pruneStaleData } from '../services/dataPruning'
import { openConfirmDialog } from '../services/confirmDialog'

const { currentUser, signOut } = useAuth()
const logoSrc = `${import.meta.env.BASE_URL}branding/logo-header.png`

const { statoSync, dettagli, pendingCount, setRefreshed } = useSyncState()

// ── Residenza corrente ──────────────────────────────────────────────────────
const currentResidenzaId = ref('')
const currentResidenzaLabel = ref('')
const showResidenzaDropdown = ref(false)
const availableResidenze = ref([])
const residenzaDropdownRef = ref(null)
const residenzaBadgeRef = ref(null)

const showResidenzaBadge = computed(() => Boolean(currentResidenzaId.value && currentResidenzaLabel.value))

// Sync button color based on state
const syncColor = computed(() => {
  switch (statoSync.value) {
    case SYNC_STATES.ONLINE: return '#22c55e'
    case SYNC_STATES.PENDING: return '#f59e42'
    case SYNC_STATES.OFFLINE: return '#64748b'
    case SYNC_STATES.ERROR: return '#ef4444'
    default: return '#93c5fd'
  }
})

async function loadCurrentResidenza() {
  // Leggi da IndexedDB, con fallback a localStorage
  let savedId = await getSetting(CURRENT_RESIDENZA_SETTING_KEY, '')
  if (!savedId && typeof localStorage !== 'undefined') {
    savedId = localStorage.getItem('medi-residenza') || ''
  }
  currentResidenzaId.value = String(savedId || '')
  if (currentResidenzaId.value) {
    try {
      const room = await db.rooms.get(currentResidenzaId.value)
      if (room && !room.deletedAt) {
        currentResidenzaLabel.value = room.codice || room.nome || currentResidenzaId.value
        return
      }
    } catch { /* ignore */ }
  }
  currentResidenzaId.value = ''
  currentResidenzaLabel.value = ''
}

async function loadAvailableResidenze() {
  try {
    const rooms = await db.rooms.toArray()
    availableResidenze.value = rooms
      .filter(r => !r.deletedAt)
      .map(r => ({ id: r.id, label: r.codice || r.nome || r.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    availableResidenze.value = []
  }
}

function toggleResidenzaDropdown() {
  if (showResidenzaDropdown.value) {
    showResidenzaDropdown.value = false
  } else {
    loadAvailableResidenze()
    // Use nextTick so the document click listener (closeResidenzaDropdown)
    // doesn't immediately close the dropdown on the same click
    nextTick(() => {
      showResidenzaDropdown.value = true
    })
  }
}

async function selectResidenza(roomId) {
  await setSetting(CURRENT_RESIDENZA_SETTING_KEY, roomId)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('medi-residenza', String(roomId))
  }
  currentResidenzaId.value = roomId
  const room = availableResidenze.value.find(r => r.id === roomId)
  currentResidenzaLabel.value = room?.label || roomId
  showResidenzaDropdown.value = false
  // Dispatch event so views can react
  window.dispatchEvent(new CustomEvent('medi-trace:residenza-changed', { detail: { roomId } }))
  // Reload to refresh all data for the new residenza
  window.location.reload()
}

function closeResidenzaDropdown(e) {
  // Ignore clicks on the badge itself (toggleResidenzaDropdown handles those)
  if (residenzaBadgeRef.value && residenzaBadgeRef.value.contains(e.target)) return
  // Ignore clicks inside the dropdown
  if (residenzaDropdownRef.value && residenzaDropdownRef.value.contains(e.target)) return
  showResidenzaDropdown.value = false
}

// ── Periodic sync (Supabase free‑tier safe) ─────────────────────────────────
// With gzip compression (~80% bandwidth reduction) and smart debounce,
// sync interval can safely go down to 1 minute.
// At 1‑min intervals with compression: ~1.6 GB/month (32% of 5 GB free tier).
const DEFAULT_SYNC_INTERVAL_MS = Math.max(
  1 * 60 * 1000, // minimum 1 minute
  Number(import.meta.env.VITE_SYNC_INTERVAL_MINUTES || 1) * 60 * 1000
)
const DEBOUNCE_MS = 30_000 // Wait 30s of inactivity after last change before syncing

let periodicTimer = null
let syncInProgress = false
let lastSyncAttempt = 0
let lastChangeDetectedAt = 0

// Named handler for proper add/removeEventListener pairing
function onLocalChange() {
  lastChangeDetectedAt = Date.now()
}

async function getSyncIntervalMs() {
  try {
    const mins = Number(await getSetting('syncIntervalMinutes', 1)) || 1
    return Math.max(1, mins) * 60 * 1000
  } catch { return DEFAULT_SYNC_INTERVAL_MS }
}

async function maybeAutoSync() {
  if (syncInProgress) return
  if (!navigator.onLine) return

  // Use direct Supabase (new) if available, fallback to snapshot sync (legacy)
  if (isDataServiceAvailable()) {
    syncInProgress = true
    try {
      await retryQueue.flush()        // push local changes
      await refreshFromServer()       // pull remote changes
      lastSyncAttempt = Date.now()
      setRefreshed()
    } catch (_) { }
    syncInProgress = false
    return
  }

  // Legacy snapshot sync
  if (!isSupabaseConfigured) return

  // Only sync if there are pending changes
  const pending = await db.syncQueue.count()
  if (pending === 0) {
    lastChangeDetectedAt = 0
    return
  }

  const now = Date.now()

  // Smart debounce: wait until no new changes for DEBOUNCE_MS
  if (lastChangeDetectedAt > 0 && (now - lastChangeDetectedAt) < DEBOUNCE_MS) {
    return
  }

  // Throttle: don't sync more than once per interval
  const interval = await getSyncIntervalMs()
  if (now - lastSyncAttempt < interval) return

  lastSyncAttempt = now
  syncInProgress = true
  try {
    await fullSync()
  } catch (_) {
    // Silent fail — next cycle will retry
  } finally {
    syncInProgress = false
  }
}

onMounted(() => {
  loadCurrentResidenza()
  loadAvailableResidenze()
  // Retry after short delay to catch residences from ensureDefaultResidenze
  setTimeout(() => { loadAvailableResidenze() }, 2000)
  setTimeout(() => { loadAvailableResidenze() }, 5000)
  document.addEventListener('click', closeResidenzaDropdown)
  // Reload residences on any data change
  window.addEventListener('medi-trace:local-change', loadAvailableResidenze)
  window.addEventListener('medi-trace:data-changed', loadAvailableResidenze)
  if (isSupabaseConfigured) {
    // Check every 30 seconds; debounce prevents sync during active edits
    periodicTimer = setInterval(maybeAutoSync, 30_000)
    // Also run on first mount (after a 10s warm-up)
    setTimeout(maybeAutoSync, 10_000)
    // Listen for local data changes to reset debounce timer
    window.addEventListener('medi-trace:local-change', onLocalChange)
    // Prune stale data once per day (old reminders, movements, activity logs)
    setTimeout(() => { pruneStaleData().catch(() => {}) }, 30_000)
  }
})

onUnmounted(() => {
  if (periodicTimer) clearInterval(periodicTimer)
  window.removeEventListener('medi-trace:local-change', onLocalChange)
  window.removeEventListener('medi-trace:local-change', loadAvailableResidenze)
  window.removeEventListener('medi-trace:data-changed', loadAvailableResidenze)
  document.removeEventListener('click', closeResidenzaDropdown)
})
// ── End periodic sync ────────────────────────────────────────────────────────

async function handleSignOut() {
  const confirmed = await openConfirmDialog({
    title: 'Esci da MediTrace',
    message: 'Vuoi uscire da MediTrace?',
    confirmText: 'Esci',
    cancelText: 'Annulla',
    tone: 'primary',
  })
  if (!confirmed) return
  if (isSupabaseConfigured) {
    try { await retryQueue.flush(); await refreshFromServer() } catch {}
  }
  await signOut()
}

async function handleSync() {
  if (isDataServiceAvailable()) {
    try {
      await retryQueue.flush()
      await refreshFromServer()
      setRefreshed()
    } catch { }
    return
  }
  if (isSupabaseConfigured) {
    try {
      await fullSync()
      setRefreshed()
    } catch {
      // silent fail
    }
  } else {
    await flushLocalSyncQueue()
  }
}
</script>


<template>
  <nav class="app-nav">
    <div class="brand" aria-label="MediTrace">
      <img class="brand-mark" :src="logoSrc" alt="MediTrace" />
    </div>

    <RouterLink to="/" title="Cruscotto — riepilogo e KPI">Cruscotto</RouterLink>
    <RouterLink to="/promemoria" title="Promemoria somministrazioni">Promemoria</RouterLink>
    <RouterLink to="/ospiti" title="Registro ospiti">Ospiti</RouterLink>
    <RouterLink to="/terapie" title="Terapie attive per ospite">Terapie</RouterLink>
    <RouterLink to="/scorte" title="Scorte e report consumi">Scorte</RouterLink>
    <RouterLink to="/movimenti" title="Movimenti di carico/scarico">Movimenti</RouterLink>
    <RouterLink to="/farmaci" title="Catalogo farmaci e confezioni">Farmaci</RouterLink>
    <RouterLink to="/residenze" title="Gestione residenze">Residenze</RouterLink>
    <RouterLink v-if="currentUser?.role === 'admin'" to="/operatori" title="Gestione operatori e permessi">Operatori</RouterLink>
    <RouterLink v-if="currentUser?.role === 'admin'" to="/audit" title="Registro audit e attività">Audit</RouterLink>
    <RouterLink v-if="currentUser?.role === 'admin'" to="/diagnostica" title="Diagnostica sistema e log">Diagnostica</RouterLink>
    <RouterLink to="/manuale" title="Guida utente">Guida</RouterLink>

    <div class="user-area">
      <span ref="residenzaBadgeRef" class="residenza-badge" :class="{ 'residenza-badge--empty': !showResidenzaBadge }" :title="showResidenzaBadge ? `Residenza attiva: ${currentResidenzaLabel} — clicca per cambiare` : 'Seleziona una residenza operativa'" @click.stop="toggleResidenzaDropdown" role="button" tabindex="0" style="cursor:pointer">
        <span v-if="showResidenzaBadge">{{ currentResidenzaLabel }}</span>
        <span v-else class="residenza-placeholder">Residenza</span>
        <span class="residenza-chevron">▾</span>
        <div v-if="showResidenzaDropdown" ref="residenzaDropdownRef" class="residenza-dropdown" @click.stop>
          <div class="residenza-dropdown-header">Cambia residenza</div>
          <button
            v-for="r in availableResidenze"
            :key="r.id"
            class="residenza-dropdown-item"
            :class="{ active: r.id === currentResidenzaId }"
            @click="selectResidenza(r.id)"
          >
            <span v-if="r.id === currentResidenzaId" class="residenza-check">✓</span>
            <span v-else class="residenza-check-placeholder"></span>
            {{ r.label }}
          </button>
          <div v-if="availableResidenze.length === 0" class="residenza-dropdown-empty">
            Nessuna residenza disponibile
          </div>
        </div>
      </span>
      <button class="sync-btn" @click="handleSync" :title="dettagli" aria-label="Sincronizza">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="syncColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        <span class="sync-label" :style="{ color: syncColor }">Sync</span>
      </button>
      <RouterLink to="/impostazioni" class="user-name user-name-link">{{ currentUser?.name }}</RouterLink>
      <RouterLink to="/impostazioni" title="Impostazioni" aria-label="Impostazioni">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </RouterLink>
      <button type="button" @click="handleSignOut">Logout</button>
    </div>
  </nav>
</template>

<style scoped>
.sync-btn {
  background: none;
  border: none;
  padding: 0 0.5em;
  cursor: pointer;
  outline: none;
  transition: background .2s;
}
.sync-btn:hover {
  background: #e0e7ff;
  border-radius: 6px;
}
.sync-label {
  font-size: .72em;
  margin-left: .25em;
}

.sync-label {
  font-size: .72em;
  margin-left: .25em;
}

.residenza-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.2em 0.6em;
  margin-right: 0.5em;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 8px;
  font-size: 0.82em;
  font-weight: 500;
  white-space: nowrap;
  vertical-align: middle;
  user-select: none;
  position: relative;
}
.residenza-badge:hover {
  background: #bfdbfe;
}
.residenza-badge--empty {
  background: transparent;
  border: 1px dashed rgba(216, 231, 251, .35);
  color: #b8cef0;
}
.residenza-badge--empty:hover {
  background: rgba(255,255,255,.08);
  color: #fff;
}
.residenza-placeholder {
  opacity: 0.7;
  font-style: italic;
}
.residenza-chevron {
  font-size: 0.7em;
  margin-left: 0.2em;
  opacity: 0.6;
}
.residenza-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  max-width: 320px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.12);
  z-index: 1000;
  overflow: hidden;
}
.residenza-dropdown-header {
  padding: 0.5em 0.8em;
  font-size: 0.75em;
  font-weight: 600;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.residenza-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.4em;
  width: 100%;
  padding: 0.55em 0.8em;
  border: none;
  background: none;
  font-size: 0.88em;
  color: #1e293b;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.residenza-dropdown-item:hover {
  background: #eff6ff;
}
.residenza-dropdown-item.active {
  background: #dbeafe;
  font-weight: 600;
}
.residenza-check {
  color: #2563eb;
  font-weight: 700;
  width: 1.2em;
}
.residenza-check-placeholder {
  width: 1.2em;
}
.residenza-dropdown-empty {
  padding: 1em 0.8em;
  font-size: 0.85em;
  color: #94a3b8;
  text-align: center;
}
</style>
