<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from '../services/auth'
import {
  createResidenza,
  deactivateResidenza,
  ensureDefaultResidenze,
  listResidenze,
  restoreResidenza,
  updateResidenza,
} from '../services/residenze'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { openConfirmDialog } from '../services/confirmDialog'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'
import { useUndoDelete } from '../composables/useUndoDelete'
import UndoDeleteBanner from '../components/UndoDeleteBanner.vue'
import CrudFilterBar from '../components/CrudFilterBar.vue'
import { db, getSetting, setSetting } from '../db'
import { dataReady } from '../services/seedData'
import { useKeyboardShortcuts, shortcutHint } from '../composables/useKeyboardShortcuts'

const DEFAULT_TURNI = [
  { nome: 'Mattina', inizio: '06:00', fine: '11:59' },
  { nome: 'Pomeriggio', inizio: '12:00', fine: '17:59' },
  { nome: 'Sera', inizio: '18:00', fine: '23:59' },
  { nome: 'Notte', inizio: '00:00', fine: '05:59' },
]
const TURNI_KEY = 'fasceOrarieConfig'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const { pendingUndo, scheduleUndo, executeUndo } = useUndoDelete(10_000)

const {
  errors,
  validateField,
  validateForm,
  clearErrors,
  hasErrors,
} = useFormValidation({
  codice: { required: true, minLength: 1, maxLength: 80 },
  maxOspiti: { required: true, numeric: true, positiveNumber: true, integer: true },
  email: { email: true },
}, {
  codice: 'Nome residenza',
  maxOspiti: 'Max ospiti',
  email: 'Email',
})

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const filterQuery = ref('')

const residenze = ref([])
const isFormOpen = ref(false)

useKeyboardShortcuts({
  searchPlaceholder: 'Cerca',
  onNew: () => openAddForm(),
  onSave: () => { if (isFormOpen.value) handleSave() },
  onDelete: () => {}, // delete è gestito via conferma esplicita, shortcut 'd' non applicabile
  isFormOpen,
})

const editId = ref('')
const editName = ref('')

const form = ref({
  codice: '',
  maxOspiti: '10',
  indirizzo: '',
  telefono: '',
  email: '',
  note: '',
})

const filteredResidenze = computed(() => {
  const q = filterQuery.value.trim().toLowerCase()
  if (!q) return residenze.value
  return residenze.value.filter(item => {
    const text = [item.codice, item.indirizzo, item.telefono, item.email, item.note, String(item.maxOspiti), String(item.ospitiAttivi)].filter(Boolean).join(' ').toLowerCase()
    return text.includes(q)
  })
})

// ── Turni per residenza ──────────────────────────────────────────────────
const showTurniPanel = ref(false)
const turniRoomId = ref('')
const turniRoomLabel = ref('')
const turniRows = ref([...DEFAULT_TURNI])
const turniMessage = ref('')
const turniBusy = ref(false)

function turniSettingsKey() {
  return turniRoomId.value ? `${TURNI_KEY}:${turniRoomId.value}` : TURNI_KEY
}

async function openTurni(item) {
  turniRoomId.value = item.id
  turniRoomLabel.value = item.codice || item.id
  try {
    const saved = await getSetting(turniSettingsKey(), null)
    if (Array.isArray(saved) && saved.length > 0) {
      turniRows.value = saved
    } else {
      const global = await getSetting(TURNI_KEY, null)
      turniRows.value = Array.isArray(global) && global.length > 0 ? [...global] : [...DEFAULT_TURNI]
    }
  } catch {
    turniRows.value = [...DEFAULT_TURNI]
  }
  showTurniPanel.value = true
}

function closeTurni() {
  showTurniPanel.value = false
  turniRoomId.value = ''
}

async function saveTurni() {
  turniBusy.value = true
  turniMessage.value = ''
  try {
    await setSetting(turniSettingsKey(), JSON.parse(JSON.stringify(turniRows.value)))
    turniMessage.value = 'Turni salvati.'
  } catch (err) {
    turniMessage.value = `Errore: ${err.message}`
  } finally {
    turniBusy.value = false
  }
}

async function resetTurni() {
  try {
    await setSetting(turniSettingsKey(), null)
    const global = await getSetting(TURNI_KEY, null)
    turniRows.value = Array.isArray(global) && global.length > 0 ? [...global] : [...DEFAULT_TURNI]
    turniMessage.value = 'Turni ripristinati ai valori globali.'
  } catch (err) {
    turniMessage.value = `Errore: ${err.message}`
  }
}

function addTurnoRow() {
  turniRows.value.push({ nome: '', inizio: '08:00', fine: '12:00' })
}

function removeTurnoRow(idx) {
  turniRows.value.splice(idx, 1)
}

const canSave = computed(() => {
  const code = form.value.codice.trim()
  const max = Number(form.value.maxOspiti)
  return Boolean(code) && Number.isFinite(max) && max > 0 && !hasErrors.value
})

function resetForm() {
  editId.value = ''
  editName.value = ''
  isFormOpen.value = false
  form.value = {
    codice: '',
    maxOspiti: '10',
    indirizzo: '',
    telefono: '',
    email: '',
    note: '',
  }
  clearErrors()
}

function openAddForm() {
  resetForm()
  isFormOpen.value = true
}

function startEdit(item) {
  editId.value = item.id
  editName.value = item.codice || item.id
  const m = item.metadata || {}
  form.value = {
    codice: item.codice || '',
    maxOspiti: String(item.maxOspiti || 10),
    indirizzo: m.indirizzo || item.indirizzo || '',
    telefono: m.telefono || item.telefono || '',
    email: m.email || item.email || '',
    note: item.note || '',
  }
  isFormOpen.value = true
}

function formatCapienza(item) {
  return `${item.ospitiAttivi}/${item.maxOspiti}`
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    await dataReady
    await ensureDefaultResidenze({ operatorId: currentUser.value?.login ?? null })
    residenze.value = await listResidenze()
    await loadGenderStats()
  } catch (error) {
    errorMessage.value = `Errore caricamento: ${error.message}`
  } finally {
    loading.value = false
  }
}

// ── Gender pie chart ──────────────────────────────────────────────────────
const genderStats = ref([]) // [{ roomId, M: n, F: n, Altro: n, totale: n }]

async function loadGenderStats() {
  try {
    const hosts = await db.hosts.toArray()
    const active = hosts.filter(h => !h.deletedAt && h.attivo !== false)
    const byRoom = new Map()
    for (const h of active) {
      if (!h.roomId) continue
      const entry = byRoom.get(h.roomId) || { roomId: h.roomId, M: 0, F: 0, Altro: 0, totale: 0 }
      const s = (h.sesso || '').trim().toUpperCase()
      if (s === 'M') entry.M++
      else if (s === 'F') entry.F++
      else if (s) entry.Altro++
      entry.totale++
      byRoom.set(h.roomId, entry)
    }
    genderStats.value = [...byRoom.values()]
  } catch { genderStats.value = [] }
}

function genderForRoom(roomId) {
  return genderStats.value.find(g => g.roomId === roomId) || { M: 0, F: 0, Altro: 0, totale: 0 }
}

function pieArcs(stats, cx, cy, r) {
  const { M, F, Altro, totale } = stats
  if (totale === 0) return ''
  const colors = { M: '#3b82f6', F: '#ec4899', Altro: '#94a3b8' }
  const parts = [
    { value: M, color: colors.M },
    { value: F, color: colors.F },
    { value: Altro, color: colors.Altro },
  ].filter(p => p.value > 0)
  let accumulated = 0
  return parts.map(p => {
    const slice = (p.value / totale) * 2 * Math.PI
    const startAngle = accumulated - Math.PI / 2
    const endAngle = accumulated + slice - Math.PI / 2
    accumulated += slice
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const large = slice > Math.PI ? 1 : 0
    return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${p.color}" stroke="#fff" stroke-width="1.5"/>`
  }).join('')
}

async function handleSave() {
  if (!canSave.value) return

  const formData = {
    codice: form.value.codice,
    maxOspiti: form.value.maxOspiti,
    email: form.value.email,
  }
  if (!validateForm(formData)) {
    errorMessage.value = 'Correggi gli errori nel form prima di salvare.'
    return
  }

  message.value = ''
  errorMessage.value = ''
  saving.value = true
  try {
    const payload = {
      codice: form.value.codice.trim(),
      maxOspiti: form.value.maxOspiti,
      indirizzo: form.value.indirizzo.trim(),
      telefono: form.value.telefono.trim(),
      email: form.value.email.trim(),
      note: form.value.note,
      operatorId: currentUser.value?.login ?? null,
    }

    if (editId.value) {
      await updateResidenza({ roomId: editId.value, ...payload })
      message.value = 'Residenza aggiornata.'
    } else {
      await createResidenza(payload)
      message.value = 'Residenza creata.'
    }

    resetForm()
    await loadData()
  } catch (error) {
    errorMessage.value = `Errore: ${error.message}`
  } finally {
    saving.value = false
  }
}

async function handleDelete(item) {
  const confirmed = await openConfirmDialog({
    title: 'Conferma eliminazione residenza',
    message: `Eliminare la residenza "${item.codice}"?`,
    details: 'La residenza verra disattivata e non sara piu selezionabile nei promemoria.',
    confirmText: 'Elimina residenza',
    cancelText: 'Annulla',
    tone: 'danger',
  })
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    const deleted = await deactivateResidenza({ roomId: item.id, operatorId: currentUser.value?.login ?? null })
    message.value = 'Residenza eliminata.'
    await loadData()

    scheduleUndo({
      label: `Residenza "${item.codice}" eliminata.`,
      undoAction: async () => {
        await restoreResidenza({
          roomId: deleted.id,
          existing: deleted,
          operatorId: currentUser.value?.login ?? null,
        })
        message.value = 'Eliminazione annullata: residenza ripristinata.'
        await loadData()
      },
    })
  } catch (error) {
    errorMessage.value = `Errore: ${error.message}`
  }
}

onMounted(() => {
  void loadData()
})

onUnmounted(() => { window.removeEventListener('medi-trace:data-changed', handleDataChanged) })
function handleDataChanged() { console.log('[ResidenzeView] data-changed event, reloading...'); void loadData() }
window.addEventListener('medi-trace:data-changed', handleDataChanged)
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Residenze</h2>
      <button class="help-btn" @click="goToHelpSection('residenze')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Elenco residenze</strong></p>
      <p class="muted" style="margin-top:.35rem">
        Le residenze definiscono il contesto operativo dell'operatore. Capienza consigliata: 10 ospiti per residenza.
      </p>

      <CrudFilterBar
        v-model="filterQuery"
        label="Filtra residenze"
        placeholder="Cerca per nome o note"
        :visible-count="filteredResidenze.length"
        :total-count="residenze.length"
      />

      <div class="view-actions" style="margin-top:.75rem">
        <button @click="openAddForm" title="Aggiungi (Scorciatoia: N)">Aggiungi</button>
      </div>

      <div class="dataset-frame" style="margin-top:.75rem">
        <table class="conflict-table">
          <thead>
            <tr>
              <th>Residenza</th>
              <th>Indirizzo</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Capienza</th>
              <th>Posti disp.</th>
              <th>Note</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredResidenze" :key="item.id">
              <td>{{ item.codice }}</td>
              <td>{{ item.indirizzo || (item.metadata && item.metadata.indirizzo) || '—' }}</td>
              <td>{{ item.telefono || (item.metadata && item.metadata.telefono) || '—' }}</td>
              <td>{{ item.email || (item.metadata && item.metadata.email) || '—' }}</td>
              <td>{{ formatCapienza(item) }}</td>
              <td>{{ item.postiDisponibili }}</td>
              <td>{{ item.note || '—' }}</td>
              <td>
                <button @click="startEdit(item)">Modifica</button>
                <button class="btn-ghost" @click="openTurni(item)" title="Turni personalizzati per questa residenza">🕐 Turni</button>
                <button class="btn-danger" @click="handleDelete(item)">Elimina</button>
              </td>
            </tr>
            <tr v-if="filteredResidenze.length === 0 && !loading">
              <td colspan="8" class="muted">
                Nessuna residenza configurata. Premi <strong>N</strong> o clicca <strong>Aggiungi</strong> per configurare la prima residenza.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="loading-skeleton" role="status" aria-label="Caricamento in corso">
        <div class="loading-skeleton-row"></div>
        <div class="loading-skeleton-row"></div>
        <div class="loading-skeleton-row"></div>
      </div>
      <p v-if="message" class="muted" style="margin-top:.55rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" role="alert">{{ errorMessage }}</p>
    </div>

    <div v-if="isFormOpen" class="card">
      <details class="deep-panel add-panel" open @toggle="(e) => { if (!e.target.open) resetForm() }">
        <summary><strong>{{ editId ? `Modifica residenza: ${editName}` : 'Aggiungi residenza' }}</strong></summary>
        <div style="margin-top:.75rem">
          <div class="panel-breadcrumb">
            <button type="button" class="panel-breadcrumb-link" @click="resetForm">Residenze</button>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">{{ editId ? 'Modifica' : 'Aggiungi' }}</span>
            <button type="button" class="panel-close-btn" @click="resetForm">Chiudi</button>
          </div>
          <div class="import-form" style="margin-top:.65rem">
            <ValidatedInput
              v-model="form.codice"
              field-name="codice"
              label="Nome residenza"
              :error="errors.codice"
              :required="true"
              placeholder="Es. Il Rifugio"
              @validate="validateField"
            />
            <ValidatedInput
              v-model="form.maxOspiti"
              field-name="maxOspiti"
              label="Max ospiti"
              type="number"
              :error="errors.maxOspiti"
              :required="true"
              placeholder="10"
              @validate="validateField"
            />
            <label>
              Indirizzo
              <input v-model="form.indirizzo" type="text" placeholder="Via Roma 123, Milano" />
            </label>
            <label>
              Telefono
              <input v-model="form.telefono" type="tel" placeholder="+39 02 1234567" />
            </label>
            <ValidatedInput
              v-model="form.email"
              field-name="email"
              label="Email"
              type="email"
              :error="errors.email"
              placeholder="residenza@esempio.it"
              @validate="validateField"
            />
            <label>
              Note
              <input v-model="form.note" type="text" placeholder="Note opzionali" />
            </label>
            <button :disabled="saving || !canSave" @click="handleSave">{{ saving ? 'Salvataggio...' : (editId ? 'Salva modifica' : 'Salva residenza') }}</button>
            <button type="button" :disabled="saving" @click="resetForm">Annulla</button>
          </div>
        </div>
      </details>
    </div>

    <!-- ── Grafico riempimento per genere ── -->
    <div v-if="residenze.length > 0" class="card">
      <p><strong>📊 Ripartizione ospiti per genere</strong></p>
      <div style="display:flex;flex-wrap:wrap;gap:1.5rem;margin-top:.75rem;justify-content:center">
        <div v-for="r in residenze" :key="r.id" style="text-align:center">
          <svg width="100" height="100" :viewBox="'0 0 100 100'">
            <circle cx="50" cy="50" r="42" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
            <g v-html="pieArcs(genderForRoom(r.id), 50, 50, 42)"></g>
          </svg>
          <p style="font-size:.78rem;font-weight:600;margin-top:.25rem">{{ r.codice }}</p>
          <p style="font-size:.7rem;color:#64748b">
            <span style="color:#3b82f6">♂{{ genderForRoom(r.id).M }}</span>
            <span style="color:#ec4899"> ♀{{ genderForRoom(r.id).F }}</span>
            <span v-if="genderForRoom(r.id).Altro > 0" style="color:#94a3b8"> · {{ genderForRoom(r.id).Altro }}</span>
            &nbsp;/ {{ r.maxOspiti }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── Pannello Turni per Residenza ── -->
    <div v-if="showTurniPanel" class="card" style="border-left: 3px solid #f59e0b">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <p style="margin:0"><strong>🕐 Turni — {{ turniRoomLabel }}</strong></p>
        <button class="btn-ghost" @click="closeTurni">✕ Chiudi</button>
      </div>
      <p class="muted" style="margin-top:.25rem">
        Personalizza i turni per questa residenza. Se non configurati, vengono usati i turni globali.
      </p>

      <div style="margin-top:.75rem;display:flex;flex-direction:column;gap:.5rem">
        <div v-for="(t, idx) in turniRows" :key="idx" style="display:flex;gap:.5rem;align-items:center">
          <input v-model="t.nome" type="text" placeholder="Nome turno" style="flex:1" />
          <input v-model="t.inizio" type="time" style="width:7rem" />
          <span style="color:#64748b">–</span>
          <input v-model="t.fine" type="time" style="width:7rem" />
          <button class="btn-sm btn-danger" @click="removeTurnoRow(idx)" :disabled="turniRows.length <= 1" title="Rimuovi turno">✕</button>
        </div>
      </div>

      <div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap">
        <button class="btn-ghost" @click="addTurnoRow">+ Aggiungi turno</button>
        <button @click="saveTurni" :disabled="turniBusy">{{ turniBusy ? 'Salvataggio...' : 'Salva' }}</button>
        <button class="btn-ghost" @click="resetTurni" title="Ripristina turni globali">↺ Ripristina globali</button>
      </div>

      <p v-if="turniMessage" class="muted" style="margin-top:.5rem">{{ turniMessage }}</p>
    </div>

    <UndoDeleteBanner
      v-if="pendingUndo"
      :label="pendingUndo.label"
      @undo="executeUndo"
      @close="clearUndo"
    />
  </div>
</template>
