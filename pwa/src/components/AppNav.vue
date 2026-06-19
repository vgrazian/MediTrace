<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useAuth } from '../services/auth'
import { fullSync } from '../services/sync'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { db, getSetting, setSetting } from '../db'
import { useSyncState, SYNC_STATES } from '../composables/useSyncState'
import { CURRENT_RESIDENZA_SETTING_KEY } from '../services/promemoria'
import { pruneStaleData } from '../services/dataPruning'

const { currentUser, signOut } = useAuth()
const logoSrc = `${import.meta.env.BASE_URL}branding/logo-header.svg`

const { statoSync, dettagli, flushLocalSyncQueue } = useSyncState()

// ── Residenza corrente ──────────────────────────────────────────────────────
const currentResidenzaId = ref('')
const currentResidenzaLabel = ref('')
const showResidenzaDropdown = ref(false)
const availableResidenze = ref([])
const residenzaDropdownRef = ref(null)
const residenzaBadgeRef = ref(null)

const showResidenzaBadge = computed(() => Boolean(currentResidenzaId.value && currentResidenzaLabel.value))

async function loadCurrentResidenza() {
  const savedId = await getSetting(CURRENT_RESIDENZA_SETTING_KEY, '')
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
  document.addEventListener('click', closeResidenzaDropdown)
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
  document.removeEventListener('click', closeResidenzaDropdown)
})
// ── End periodic sync ────────────────────────────────────────────────────────

async function handleSignOut() {
  // Try sync before logout
  if (isSupabaseConfigured) {
    try { await fullSync() } catch {}
  } else {
    await flushLocalSyncQueue()
  }
  await signOut()
}

async function handleSync() {
  if (isSupabaseConfigured) {
    try {
      await fullSync()
    } catch {
      // silent fail
    }
  } else {
    await flushLocalSyncQueue()
  }
}

async function handleSyncIndicatorClick() {
  await handleSync()
}
</script>


<template>
  <nav class="app-nav">
    <div class="brand" aria-label="MediTrace">
      <img class="brand-mark" :src="logoSrc" alt="Comunità di Sant'Egidio" />
      <span class="brand-title">MediTrace</span>
    </div>

    <span v-if="showResidenzaBadge" ref="residenzaBadgeRef" class="residenza-badge" :title="`Residenza attiva: ${currentResidenzaLabel} — clicca per cambiare`" @click.stop="toggleResidenzaDropdown" role="button" tabindex="0" style="cursor:pointer">
      🏠 {{ currentResidenzaLabel }}
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

    <RouterLink to="/">Cruscotto</RouterLink>
    <RouterLink to="/promemoria">Promemoria</RouterLink>
    <RouterLink to="/terapie">Terapie</RouterLink>
    <RouterLink to="/scorte">Scorte</RouterLink>
    <RouterLink to="/movimenti">Movimenti</RouterLink>
    <RouterLink to="/ospiti">Ospiti</RouterLink>
    <RouterLink to="/farmaci">Farmaci</RouterLink>
    <RouterLink to="/residenze">Residenze</RouterLink>
    <RouterLink to="/manuale">Guida</RouterLink>
    <RouterLink v-if="currentUser?.role === 'admin'" to="/operatori">Operatori</RouterLink>
    <RouterLink v-if="currentUser?.role === 'admin'" to="/audit">Audit</RouterLink>

    <div class="sync-indicator-area">
      <span
        class="sync-indicator"
        :data-state="statoSync"
        :title="dettagli"
        aria-label="Stato sincronizzazione"
        @click="handleSyncIndicatorClick"
        role="button"
        tabindex="0"
        style="cursor:pointer"
      >
        <template v-if="statoSync === SYNC_STATES.SYNCED">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#22c55e" stroke-width="2"/><circle cx="9" cy="9" r="3" fill="#22c55e"/></svg>
        </template>
        <template v-else-if="statoSync === SYNC_STATES.PENDING">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#f59e42" stroke-width="2"/><circle cx="9" cy="9" r="3" fill="#f59e42"/></svg>
        </template>
        <template v-else-if="statoSync === SYNC_STATES.CONFLICT">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#ef4444" stroke-width="2"/><circle cx="9" cy="9" r="3" fill="#ef4444"/></svg>
        </template>
        <template v-else-if="statoSync === SYNC_STATES.ERROR">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#a21caf" stroke-width="2"/><circle cx="9" cy="9" r="3" fill="#a21caf"/></svg>
        </template>
        <template v-else-if="statoSync === SYNC_STATES.OFFLINE">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#64748b" stroke-width="2"/><circle cx="9" cy="9" r="3" fill="#64748b"/></svg>
        </template>
      </span>
    </div>

    <div class="user-area">
      <button class="sync-btn" @click="handleSync" title="Sincronizza dati e aggiorna app" aria-label="Sincronizza">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">
          <path d="M11 2v2.5M11 17.5V20M4.22 4.22l1.77 1.77M16.01 16.01l1.77 1.77M2 11h2.5M17.5 11H20M4.22 17.78l1.77-1.77M16.01 5.99l1.77-1.77" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
          <circle cx="11" cy="11" r="7" stroke="#2563eb" stroke-width="2"/>
        </svg>
      </button>
      <RouterLink to="/impostazioni" class="user-name user-name-link">{{ currentUser?.name }}</RouterLink>
      <RouterLink to="/impostazioni">⚙</RouterLink>
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

.sync-indicator-area {
  display: inline-block;
  margin-left: 1em;
  vertical-align: middle;
}
.sync-indicator {
  display: inline-block;
  width: 22px;
  height: 22px;
  vertical-align: middle;
  cursor: pointer;
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
