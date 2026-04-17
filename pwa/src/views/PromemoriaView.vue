<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { db, enqueue, getSetting, setSetting } from '../db'
import { useAuth } from '../services/auth'
import { BED_SEQUENCE_SETTING_KEY, CURRENT_RESIDENZA_SETTING_KEY, buildReminderRows, markReminder, reminderStateBadge, reminderActionButtonColor, REMINDER_OUTCOMES } from '../services/promemoria'
import { confirmDeleteReminder } from '../services/confirmations'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'
import { useHelpNavigation } from '../composables/useHelpNavigation'

const route = useRoute()
const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()

const loading = ref(false)
const markingId = ref(null)
const savingEdit = ref(false)
const bulkBusy = ref(false)
const message = ref('')
const errorMessage = ref('')
const selectedReminderIds = ref([])

const allReminders = ref([])
const hosts = ref([])
const drugs = ref([])
const therapies = ref([])
const beds = ref([])
const rooms = ref([])
const bedSequence = ref([])

const dateFilter = ref('today')
const stateFilter = ref('')
const residenzaFilter = ref('')
const editingReminderId = ref('')
const form = ref({
  scheduledAt: '',
  stato: 'DA_ESEGUIRE',
  note: '',
})

const highlightedReminderId = computed(() => String(route.query.highlight || ''))

const {
  errors,
  validateField,
  validateForm,
  clearErrors,
  hasErrors,
} = useFormValidation({
  scheduledAt: { required: true, date: true, futureDate: true },
  note: { maxLength: 500 },
}, {
  scheduledAt: 'Orario promemoria',
  note: 'Note',
})

const rows = computed(() => buildReminderRows({
  reminders: allReminders.value,
  hosts: hosts.value,
  drugs: drugs.value,
  therapies: therapies.value,
  beds: beds.value,
  rooms: rooms.value,
  bedSequence: bedSequence.value,
  dateFilter: dateFilter.value,
  stateFilter: stateFilter.value,
  residenzaFilter: residenzaFilter.value,
}))

const residenzaOptions = computed(() => {
  const sorted = [...rooms.value].sort((a, b) => String(a.codice || '').localeCompare(String(b.codice || '')))
  return sorted.map(room => ({ id: room.id, label: room.codice || room.id }))
})

const actionableRows = computed(() => rows.value.filter((item) => item.stato === 'DA_ESEGUIRE' || item.stato === 'POSTICIPATO'))

const selectedActionableIds = computed(() => {
  const allowed = new Set(actionableRows.value.map((item) => item.id))
  return selectedReminderIds.value.filter((id) => allowed.has(id))
})

const allActionableSelected = computed({
  get() {
    if (actionableRows.value.length === 0) return false
    return selectedActionableIds.value.length === actionableRows.value.length
  },
  set(value) {
    if (!value) {
      selectedReminderIds.value = []
      return
    }
    selectedReminderIds.value = actionableRows.value.map((item) => item.id)
  },
})

const canRunBulkActions = computed(() => selectedActionableIds.value.length > 0 && !bulkBusy.value && !savingEdit.value)

function isHighlighted(reminderId) {
  return highlightedReminderId.value && highlightedReminderId.value === reminderId
}

function formatSchedule(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('it-IT', { hour12: false })
}

function toLocalDateTimeInput(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const pad = (v) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [rawReminders, rawHosts, rawDrugs, rawTherapies, rawBeds, rawRooms, savedBedSequence] = await Promise.all([
      db.reminders.toArray(),
      db.hosts.toArray(),
      db.drugs.toArray(),
      db.therapies.toArray(),
      db.beds.toArray(),
      db.rooms.toArray(),
      getSetting(BED_SEQUENCE_SETTING_KEY, []),
    ])
    allReminders.value = rawReminders
    hosts.value = rawHosts.filter(h => !h.deletedAt)
    drugs.value = rawDrugs.filter(d => !d.deletedAt)
    therapies.value = rawTherapies.filter(t => !t.deletedAt)
    beds.value = rawBeds.filter(b => !b.deletedAt)
    rooms.value = rawRooms.filter(r => !r.deletedAt)
    bedSequence.value = Array.isArray(savedBedSequence) ? savedBedSequence : []
    const validIds = new Set(rawReminders.filter(item => !item.deletedAt).map(item => item.id))
    selectedReminderIds.value = selectedReminderIds.value.filter((id) => validIds.has(id))

    const savedResidenza = await getSetting(CURRENT_RESIDENZA_SETTING_KEY, '')
    const validResidenza = String(savedResidenza || '')
    if (!validResidenza || rooms.value.some(room => room.id === validResidenza)) {
      residenzaFilter.value = validResidenza
    } else {
      residenzaFilter.value = ''
    }
  } catch (err) {
    errorMessage.value = `Errore caricamento: ${err.message}`
  } finally {
    loading.value = false
  }
}

function toggleReminderSelection(reminderId, checked) {
  if (!checked) {
    selectedReminderIds.value = selectedReminderIds.value.filter((id) => id !== reminderId)
    return
  }
  if (!selectedReminderIds.value.includes(reminderId)) {
    selectedReminderIds.value = [...selectedReminderIds.value, reminderId]
  }
}

function isReminderSelected(reminderId) {
  return selectedReminderIds.value.includes(reminderId)
}

function isReminderActionable(reminder) {
  return reminder.stato === 'DA_ESEGUIRE' || reminder.stato === 'POSTICIPATO'
}

async function applyOutcome(reminderId, outcome) {
  message.value = ''
  errorMessage.value = ''
  markingId.value = reminderId
  try {
    await markReminder({
      reminderId,
      outcome,
      operatorId: currentUser.value?.login ?? null,
    })
    message.value = `Promemoria contrassegnato: ${outcome}.`
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  } finally {
    markingId.value = null
  }
}

async function setReminderPending(reminderId) {
  message.value = ''
  errorMessage.value = ''
  markingId.value = reminderId
  try {
    const existing = await db.reminders.get(reminderId)
    if (!existing || existing.deletedAt) throw new Error('Promemoria non trovato')

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    await db.transaction('rw', db.reminders, db.syncQueue, db.activityLog, async () => {
      await db.reminders.put({
        ...existing,
        stato: 'DA_ESEGUIRE',
        eseguitoAt: null,
        operatore: null,
        updatedAt: now,
        syncStatus: 'pending',
      })
      await enqueue('reminders', reminderId, 'upsert')
      await db.activityLog.add({
        entityType: 'reminders',
        entityId: reminderId,
        action: 'reminder_reset_pending',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })
    message.value = 'Promemoria riportato a Da eseguire.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  } finally {
    markingId.value = null
  }
}

async function applyOutcomeBulk(outcome) {
  if (!canRunBulkActions.value) return
  message.value = ''
  errorMessage.value = ''
  bulkBusy.value = true
  try {
    for (const reminderId of selectedActionableIds.value) {
      await markReminder({
        reminderId,
        outcome,
        operatorId: currentUser.value?.login ?? null,
      })
    }
    message.value = `Somministrazioni aggiornate: ${selectedActionableIds.value.length} → ${outcome}.`
    selectedReminderIds.value = []
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore operazione multipla: ${err.message}`
  } finally {
    bulkBusy.value = false
  }
}

async function setPendingBulk() {
  if (!canRunBulkActions.value) return
  message.value = ''
  errorMessage.value = ''
  bulkBusy.value = true
  try {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const selectedIds = [...selectedActionableIds.value]
    await db.transaction('rw', db.reminders, db.syncQueue, db.activityLog, async () => {
      for (const reminderId of selectedIds) {
        const existing = await db.reminders.get(reminderId)
        if (!existing || existing.deletedAt) continue
        await db.reminders.put({
          ...existing,
          stato: 'DA_ESEGUIRE',
          eseguitoAt: null,
          operatore: null,
          updatedAt: now,
          syncStatus: 'pending',
        })
        await enqueue('reminders', reminderId, 'upsert')
        await db.activityLog.add({
          entityType: 'reminders',
          entityId: reminderId,
          action: 'reminder_reset_pending',
          deviceId,
          operatorId: currentUser.value?.login ?? null,
          ts: now,
        })
      }
    })
    message.value = `Somministrazioni aggiornate: ${selectedIds.length} → DA_ESEGUIRE.`
    selectedReminderIds.value = []
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore operazione multipla: ${err.message}`
  } finally {
    bulkBusy.value = false
  }
}

function startEdit(reminder) {
  editingReminderId.value = reminder.id
  form.value = {
    scheduledAt: toLocalDateTimeInput(reminder.scheduledAt),
    stato: reminder.stato || 'DA_ESEGUIRE',
    note: reminder.note || '',
  }
}

function resetForm() {
  editingReminderId.value = ''
  form.value = {
    scheduledAt: '',
    stato: 'DA_ESEGUIRE',
    note: '',
  }
  clearErrors()
}

async function saveReminderEdit() {
  if (!editingReminderId.value) return
  message.value = ''
  errorMessage.value = ''
  if (!validateForm(form.value)) {
    errorMessage.value = 'Correggi gli errori nel form prima di salvare.'
    return
  }
  savingEdit.value = true

  try {
    const existing = await db.reminders.get(editingReminderId.value)
    if (!existing || existing.deletedAt) throw new Error('Promemoria non trovato')

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    const updated = {
      ...existing,
      scheduledAt: form.value.scheduledAt ? new Date(form.value.scheduledAt).toISOString() : existing.scheduledAt,
      stato: form.value.stato || existing.stato || 'DA_ESEGUIRE',
      note: form.value.note || '',
      updatedAt: now,
      syncStatus: 'pending',
    }

    await db.transaction('rw', db.reminders, db.syncQueue, db.activityLog, async () => {
      await db.reminders.put(updated)
      await enqueue('reminders', updated.id, 'upsert')
      await db.activityLog.add({
        entityType: 'reminders',
        entityId: updated.id,
        action: 'reminder_updated',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    message.value = 'Promemoria aggiornato.'
    resetForm()
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  } finally {
    savingEdit.value = false
  }
}

async function deleteReminder(reminderId) {
  const reminder = allReminders.value.find(r => r.id === reminderId)
  const host = hosts.value.find(h => h.id === reminder?.hostId)
  const drug = drugs.value.find(d => d.id === reminder?.drugId)
  const reminderLabel = `${host?.iniziali || host?.codiceInterno || 'Ospite'} - ${drug?.principioAttivo || 'Farmaco'} (${formatSchedule(reminder?.scheduledAt)})`
  
  const confirmed = await confirmDeleteReminder(reminderLabel)
  if (!confirmed) return
  
  message.value = ''
  errorMessage.value = ''

  try {
    const existing = await db.reminders.get(reminderId)
    if (!existing || existing.deletedAt) throw new Error('Promemoria non trovato')

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    await db.transaction('rw', db.reminders, db.syncQueue, db.activityLog, async () => {
      await db.reminders.put({
        ...existing,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
      await enqueue('reminders', reminderId, 'upsert')
      await db.activityLog.add({
        entityType: 'reminders',
        entityId: reminderId,
        action: 'reminder_deleted',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    if (editingReminderId.value === reminderId) resetForm()
    message.value = 'Promemoria eliminato.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  }
}

onMounted(() => void loadData())

watch(() => route.fullPath, () => void loadData())

watch(residenzaFilter, async (value) => {
  await setSetting(CURRENT_RESIDENZA_SETTING_KEY, String(value || ''))
})
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Promemoria</h2>
      <button class="help-btn" @click="goToHelpSection('promemoria')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Filtri</strong></p>
      <div class="import-form" style="margin-top:.5rem">
        <label>
          Data
          <select v-model="dateFilter">
            <option value="today">Oggi</option>
            <option value="all">Tutti</option>
          </select>
        </label>
        <label>
          Stato
          <select v-model="stateFilter">
            <option value="">Tutti gli stati</option>
            <option value="DA_ESEGUIRE">Da eseguire</option>
            <option value="ESEGUITO">Eseguito</option>
            <option value="SALTATO">Saltato</option>
            <option value="POSTICIPATO">Posticipato</option>
            <option value="ANNULLATO">Annullato</option>
          </select>
        </label>
        <label>
          Residenza operativa
          <select v-model="residenzaFilter">
            <option value="">Tutte le residenze</option>
            <option v-for="residenza in residenzaOptions" :key="residenza.id" :value="residenza.id">
              {{ residenza.label }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="card">
      <p><strong>Somministrazioni previste</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Registra l'esito di ogni somministrazione. Sincronizzato con gli altri dispositivi.
      </p>
      <p v-if="highlightedReminderId" class="muted" style="margin-top:.35rem;font-style:italic">
        Evidenziato da notifica: {{ highlightedReminderId }}
      </p>

      <div style="margin-top:.65rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <button class="reminder-action-btn" :disabled="!canRunBulkActions" @click="applyOutcomeBulk('ESEGUITO')">Eseguito</button>
        <button class="reminder-action-btn" :disabled="!canRunBulkActions" @click="applyOutcomeBulk('POSTICIPATO')">Posticipato</button>
        <button class="reminder-action-btn" :disabled="!canRunBulkActions" @click="applyOutcomeBulk('SALTATO')">Saltato</button>
        <button class="reminder-action-btn" :disabled="!canRunBulkActions" @click="setPendingBulk">Da eseguire</button>
        <span class="muted" style="font-size:.82rem">
          Selezionati: {{ selectedActionableIds.length }} / {{ actionableRows.length }}
        </span>
      </div>

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table" style="min-width:1100px">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :checked="allActionableSelected"
                :disabled="actionableRows.length === 0"
                @change="allActionableSelected = $event.target.checked"
              />
            </th>
            <th>Orario</th>
            <th>Ospite</th>
            <th>Residenza</th>
            <th>Farmaco</th>
            <th>Dose</th>
            <th>Freq./giorno</th>
            <th>Stato</th>
            <th>Erogazione</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="reminder in rows"
            :key="reminder.id"
            :class="{ 'reminder-highlight': isHighlighted(reminder.id) }"
          >
            <td>
              <input
                type="checkbox"
                :checked="isReminderSelected(reminder.id)"
                :disabled="!isReminderActionable(reminder)"
                @change="toggleReminderSelection(reminder.id, $event.target.checked)"
              />
            </td>
            <td>{{ formatSchedule(reminder.scheduledAt) }}</td>
            <td>{{ reminder.hostLabel }}</td>
            <td>{{ reminder.residenzaLabel }}</td>
            <td>{{ reminder.drugLabel }}</td>
            <td>{{ reminder.dosePerSomministrazione ?? '—' }}</td>
            <td>{{ reminder.dailyScheduleTimes?.join(' / ') ?? reminder.somministrazioniGiornaliere ?? '—' }}</td>
            <td>
              <span :class="['reminder-state', reminderStateBadge(reminder.stato)]">
                {{ reminder.stato }}
              </span>
            </td>
            <td>
              <div v-if="reminder.stato === 'DA_ESEGUIRE' || reminder.stato === 'POSTICIPATO'" style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.35rem">
                <button
                  class="reminder-action-btn"
                  :disabled="markingId === reminder.id"
                  :style="{ backgroundColor: reminderActionButtonColor('ESEGUITO').bg, color: reminderActionButtonColor('ESEGUITO').text, border: 'none', borderRadius: '0.25rem', cursor: markingId === reminder.id ? 'not-allowed' : 'pointer' }"
                  title="Somministrazione eseguita"
                  @click="applyOutcome(reminder.id, 'ESEGUITO')"
                >
                  Eseguito
                </button>
                <button
                  class="reminder-action-btn"
                  :disabled="markingId === reminder.id"
                  :style="{ backgroundColor: reminderActionButtonColor('POSTICIPATO').bg, color: reminderActionButtonColor('POSTICIPATO').text, border: 'none', borderRadius: '0.25rem', cursor: markingId === reminder.id ? 'not-allowed' : 'pointer' }"
                  title="Somministrazione posticipata"
                  @click="applyOutcome(reminder.id, 'POSTICIPATO')"
                >
                  Posticipato
                </button>
                <button
                  class="reminder-action-btn"
                  :disabled="markingId === reminder.id"
                  :style="{ backgroundColor: reminderActionButtonColor('SALTATO').bg, color: reminderActionButtonColor('SALTATO').text, border: 'none', borderRadius: '0.25rem', cursor: markingId === reminder.id ? 'not-allowed' : 'pointer' }"
                  title="Somministrazione saltata"
                  @click="applyOutcome(reminder.id, 'SALTATO')"
                >
                  Saltato
                </button>
                <button
                  class="reminder-action-btn"
                  :disabled="markingId === reminder.id"
                  :style="{ backgroundColor: reminderActionButtonColor('ANNULLATO').bg, color: reminderActionButtonColor('ANNULLATO').text, border: 'none', borderRadius: '0.25rem', cursor: markingId === reminder.id ? 'not-allowed' : 'pointer' }"
                  title="Somministrazione annullata"
                  @click="applyOutcome(reminder.id, 'ANNULLATO')"
                >
                  Annullato
                </button>
              </div>
              <button
                v-if="reminder.stato !== 'DA_ESEGUIRE'"
                class="reminder-action-btn"
                :disabled="markingId === reminder.id"
                style="margin-top:.2rem"
                @click="setReminderPending(reminder.id)"
              >
                Da eseguire
              </button>
            </td>
            <td>
              <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                <button class="reminder-secondary-btn" :disabled="markingId === reminder.id || savingEdit" @click="startEdit(reminder)">Modifica</button>
                <button class="reminder-secondary-btn" :disabled="markingId === reminder.id || savingEdit" style="background:#d35f55" @click="deleteReminder(reminder.id)">Elimina</button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length === 0 && !loading">
            <td colspan="12" class="muted">Nessun promemoria per il filtro selezionato.</td>
          </tr>
        </tbody>
      </table>
      </div>

      <p v-if="loading" class="muted" style="margin-top:.55rem">Caricamento...</p>
      <p v-if="message" class="muted" style="margin-top:.55rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error">{{ errorMessage }}</p>
    </div>

    <div class="card">
      <details>
        <summary><strong>Gestione Promemoria</strong></summary>

        <div style="margin-top:.75rem">
          <p><strong>{{ editingReminderId ? `Modifica promemoria ${editingReminderId}` : 'Seleziona un promemoria da modificare' }}</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <ValidatedInput
              v-model="form.scheduledAt"
              field-name="scheduledAt"
              label="Orario promemoria"
              type="datetime-local"
              :error="errors.scheduledAt"
              :required="true"
              :disabled="!editingReminderId || savingEdit"
              @validate="(field, value) => validateField(field, value)"
            />
            <label>
              Stato
              <select v-model="form.stato" :disabled="!editingReminderId || savingEdit">
                <option value="DA_ESEGUIRE">Da eseguire</option>
                <option value="ESEGUITO">Eseguito</option>
                <option value="SALTATO">Saltato</option>
                <option value="POSTICIPATO">Posticipato</option>
              </select>
            </label>
            <ValidatedInput
              v-model="form.note"
              field-name="note"
              label="Note"
              type="text"
              placeholder="Note operative"
              :error="errors.note"
              :disabled="!editingReminderId || savingEdit"
              @validate="(field, value) => validateField(field, value)"
            />
            <button :disabled="!editingReminderId || savingEdit || hasErrors" @click="saveReminderEdit">
              {{ savingEdit ? 'Salvataggio...' : 'Salva modifica' }}
            </button>
            <button type="button" :disabled="savingEdit" @click="resetForm">Annulla</button>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
