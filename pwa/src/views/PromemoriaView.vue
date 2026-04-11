<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { db, enqueue, getSetting } from '../db'
import { useAuth } from '../services/auth'
import { buildReminderRows, markReminder, reminderStateBadge, REMINDER_OUTCOMES } from '../services/promemoria'
import { confirmDeleteReminder } from '../services/confirmations'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'

const route = useRoute()
const { currentUser } = useAuth()

const loading = ref(false)
const markingId = ref(null)
const savingEdit = ref(false)
const message = ref('')
const errorMessage = ref('')

const allReminders = ref([])
const hosts = ref([])
const drugs = ref([])
const therapies = ref([])

const dateFilter = ref('today')
const stateFilter = ref('')
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
  dateFilter: dateFilter.value,
  stateFilter: stateFilter.value,
}))

function isHighlighted(reminderId) {
  return highlightedReminderId.value && highlightedReminderId.value === reminderId
}

function formatSchedule(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
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
    const [rawReminders, rawHosts, rawDrugs, rawTherapies] = await Promise.all([
      db.reminders.toArray(),
      db.hosts.toArray(),
      db.drugs.toArray(),
      db.therapies.toArray(),
    ])
    allReminders.value = rawReminders
    hosts.value = rawHosts.filter(h => !h.deletedAt)
    drugs.value = rawDrugs.filter(d => !d.deletedAt)
    therapies.value = rawTherapies.filter(t => !t.deletedAt)
  } catch (err) {
    errorMessage.value = `Errore caricamento: ${err.message}`
  } finally {
    loading.value = false
  }
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
</script>

<template>
  <div class="view">
    <h2>Promemoria</h2>

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

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Orario</th>
            <th>Ospite</th>
            <th>Stanza/Letto</th>
            <th>Farmaco</th>
            <th>Dose</th>
            <th>Freq./giorno</th>
            <th>Consumo sett.</th>
            <th>Stato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="reminder in rows"
            :key="reminder.id"
            :class="{ 'reminder-highlight': isHighlighted(reminder.id) }"
          >
            <td>{{ formatSchedule(reminder.scheduledAt) }}</td>
            <td>{{ reminder.hostLabel }}</td>
            <td>{{ reminder.stanzaLetto }}</td>
            <td>{{ reminder.drugLabel }}</td>
            <td>{{ reminder.dosePerSomministrazione ?? '—' }}</td>
            <td>{{ reminder.somministrazioniGiornaliere ?? '—' }}</td>
            <td>{{ reminder.consumoMedioSettimanale ?? '—' }}</td>
            <td>
              <span :class="['reminder-state', reminderStateBadge(reminder.stato)]">
                {{ reminder.stato }}
              </span>
            </td>
            <td>
              <div v-if="reminder.stato === 'DA_ESEGUIRE' || reminder.stato === 'POSTICIPATO'" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.35rem">
                <button
                  :disabled="markingId === reminder.id"
                  style="padding:.2rem .55rem;font-size:.8rem"
                  @click="applyOutcome(reminder.id, 'ESEGUITO')"
                >
                  Eseguito
                </button>
                <button
                  :disabled="markingId === reminder.id"
                  style="padding:.2rem .55rem;font-size:.8rem;background:#c0392b"
                  @click="applyOutcome(reminder.id, 'SALTATO')"
                >
                  Saltato
                </button>
                <button
                  :disabled="markingId === reminder.id"
                  style="padding:.2rem .55rem;font-size:.8rem;background:#e6a817;color:#111"
                  @click="applyOutcome(reminder.id, 'POSTICIPATO')"
                >
                  Posticipa
                </button>
              </div>
              <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                <button :disabled="markingId === reminder.id || savingEdit" @click="startEdit(reminder)">Modifica</button>
                <button :disabled="markingId === reminder.id || savingEdit" style="background:#c0392b" @click="deleteReminder(reminder.id)">Elimina</button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length === 0 && !loading">
            <td colspan="9" class="muted">Nessun promemoria per il filtro selezionato.</td>
          </tr>
        </tbody>
      </table>

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
