<script setup>
import { computed, onMounted, ref } from 'vue'
import { db } from '../db'
import { useAuth } from '../services/auth'
import { softDeleteMovement, upsertMovement } from '../services/movimenti'
import { confirmDeleteMovement } from '../services/confirmations'

const { currentUser } = useAuth()

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const stockBatches = ref([])
const drugs = ref([])
const hosts = ref([])
const therapies = ref([])
const movements = ref([])
const editingMovementId = ref(null)

const form = ref({
  stockBatchId: '',
  tipoMovimento: 'scarico',
  quantita: '',
  dataMovimento: '',
  hostId: '',
  therapyId: '',
  note: '',
})

const canCreateMovement = computed(() => {
  return stockBatches.value.length > 0 && Number(form.value.quantita || 0) > 0
})

function toLocalDateTimeInput(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function drugLabel(drugId) {
  const item = drugs.value.find((drug) => drug.id === drugId)
  if (!item) return 'Farmaco non disponibile'
  return item.nomeFarmaco || item.principioAttivo || 'Farmaco senza nome'
}

function batchLabel(batch) {
  if (!batch) return '—'
  const drugName = drugLabel(batch.drugId)
  const commercialName = batch.nomeCommerciale || 'Confezione'
  const dosage = batch.dosaggio ? ` (${batch.dosaggio})` : ''
  return `${drugName} - ${commercialName}${dosage}`
}

function hostLabel(hostId) {
  if (!hostId) return '—'
  const host = hosts.value.find((item) => item.id === hostId)
  if (!host) return 'Ospite non disponibile'
  const fullName = [host.cognome, host.nome].filter(Boolean).join(' ').trim()
  const namePart = fullName || host.iniziali || host.codiceInterno || hostId
  const visibleId = host.codiceInterno || host.id
  return `[${visibleId}] - ${namePart}`
}

function therapyLabel(therapyId) {
  const therapy = therapies.value.find((item) => item.id === therapyId)
  if (!therapy) return 'Terapia non disponibile'
  const host = hostLabel(therapy.hostId)
  const drug = drugLabel(therapy.drugId)
  const start = therapy.dataInizio ? formatDateTime(therapy.dataInizio) : 'data n/d'
  return `${host} · ${drug} · ${start}`
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [rawBatches, rawDrugs, rawHosts, rawTherapies, rawMovements] = await Promise.all([
      db.stockBatches.toArray(),
      db.drugs.toArray(),
      db.hosts.toArray(),
      db.therapies.toArray(),
      db.movements.toArray(),
    ])

    stockBatches.value = rawBatches
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.nomeCommerciale || a.id).localeCompare(b.nomeCommerciale || b.id))

    drugs.value = rawDrugs
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.principioAttivo || a.id).localeCompare(b.principioAttivo || b.id))

    hosts.value = rawHosts
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.codiceInterno || a.id).localeCompare(b.codiceInterno || b.id))

    therapies.value = rawTherapies
      .filter((item) => !item.deletedAt)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))

    movements.value = rawMovements
      .filter((item) => !item.deletedAt)
      .sort((a, b) => new Date(b.dataMovimento || b.updatedAt || 0) - new Date(a.dataMovimento || a.updatedAt || 0))
  } catch (err) {
    errorMessage.value = `Errore caricamento movimenti: ${err.message}`
  } finally {
    loading.value = false
  }
}

async function saveMovement() {
  message.value = ''
  errorMessage.value = ''

  if (!form.value.stockBatchId) {
    errorMessage.value = 'Seleziona una confezione.'
    return
  }

  const quantity = Number(form.value.quantita || 0)
  if (quantity <= 0) {
    errorMessage.value = 'Inserisci una quantita maggiore di zero.'
    return
  }

  const selectedBatch = stockBatches.value.find((item) => item.id === form.value.stockBatchId)
  if (!selectedBatch) {
    errorMessage.value = 'Confezione selezionata non valida.'
    return
  }

  const movementDate = form.value.dataMovimento
    ? new Date(form.value.dataMovimento).toISOString()
    : new Date().toISOString()

  const existing = editingMovementId.value ? movements.value.find(m => m.id === editingMovementId.value) : null
  saving.value = true
  try {
    const saved = await upsertMovement({
      existing,
      form: {
        ...form.value,
        quantita: quantity,
      },
      selectedBatch,
      movementDate,
      operatorId: currentUser.value?.login ?? null,
    })

    form.value = {
      stockBatchId: '',
      tipoMovimento: 'scarico',
      quantita: '',
      dataMovimento: toLocalDateTimeInput(),
      hostId: '',
      therapyId: '',
      note: '',
    }
    editingMovementId.value = null

    message.value = existing ? 'Movimento aggiornato.' : `Movimento registrato (ID: ${saved.id}).`
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore registrazione movimento: ${err.message}`
  } finally {
    saving.value = false
  }
}

function startEditMovement(movement) {
  const toDateTimeLocal = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (v) => String(v).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  editingMovementId.value = movement.id
  form.value = {
    stockBatchId: movement.stockBatchId || '',
    tipoMovimento: movement.tipoMovimento || movement.type || 'scarico',
    quantita: movement.quantita ?? '',
    dataMovimento: toDateTimeLocal(movement.dataMovimento || movement.updatedAt),
    hostId: movement.hostId || '',
    therapyId: movement.therapyId || '',
    note: movement.note || '',
  }
}

function resetForm() {
  editingMovementId.value = null
  form.value = {
    stockBatchId: '',
    tipoMovimento: 'scarico',
    quantita: '',
    dataMovimento: toLocalDateTimeInput(),
    hostId: '',
    therapyId: '',
    note: '',
  }
}

async function deleteMovement(movement) {
  const batch = stockBatches.value.find(b => b.id === movement.stockBatchId)
  const movementLabel = `${movement.tipoMovimento || movement.type} - ${batchLabel(batch)} (${formatDateTime(movement.dataMovimento)})`
  
  const confirmed = await confirmDeleteMovement(movementLabel)
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''
  try {
    await softDeleteMovement({
      movement,
      operatorId: currentUser.value?.login ?? null,
    })

    if (editingMovementId.value === movement.id) resetForm()
    message.value = 'Movimento eliminato.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore eliminazione movimento: ${err.message}`
  }
}

onMounted(() => {
  form.value.dataMovimento = toLocalDateTimeInput()
  void loadData()
})
</script>

<template>
  <div class="view">
    <h2>Movimenti</h2>

    <div class="card">
      <p><strong>Ultimi movimenti</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Elenco locale ordinato per data movimento piu recente.
      </p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Confezione</th>
            <th>Quantita</th>
            <th>Ospite</th>
            <th>Note</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="movement in movements" :key="movement.id">
            <td>{{ formatDateTime(movement.dataMovimento || movement.updatedAt) }}</td>
            <td>{{ movement.tipoMovimento || movement.type || '—' }}</td>
            <td>{{ batchLabel(stockBatches.find((item) => item.id === movement.stockBatchId)) }}</td>
            <td>{{ movement.quantita ?? '—' }}</td>
            <td>{{ hostLabel(movement.hostId) }}</td>
            <td>{{ movement.note || '—' }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditMovement(movement)">Modifica</button>
              <button style="background:#c0392b" @click="deleteMovement(movement)">Elimina</button>
            </td>
          </tr>
          <tr v-if="movements.length === 0">
            <td colspan="7" class="muted">Nessun movimento registrato nel dataset locale.</td>
          </tr>
        </tbody>
      </table>

      <p v-if="loading" class="muted" style="margin-top:.55rem">Aggiornamento dati...</p>
    </div>

    <div class="card">
      <details>
        <summary><strong>Gestione Movimenti</strong></summary>

        <div style="margin-top:.75rem">
          <p><strong>{{ editingMovementId ? 'Modifica movimento' : 'Nuovo movimento magazzino' }}</strong></p>
          <p class="muted" style="margin-top:.25rem">
            Registra carichi/scarichi operativi con tracciamento sincronizzazione e audit.
          </p>

          <div class="import-form" style="margin-top:.65rem">
            <label>
              Confezione
              <select v-model="form.stockBatchId" :disabled="saving || !stockBatches.length">
                <option value="">Seleziona confezione</option>
                <option v-for="batch in stockBatches" :key="batch.id" :value="batch.id">
                  {{ batchLabel(batch) }}
                </option>
              </select>
            </label>

            <label>
              Tipo movimento
              <select v-model="form.tipoMovimento" :disabled="saving">
                <option value="carico">Carico</option>
                <option value="scarico">Scarico</option>
                <option value="somministrazione">Somministrazione</option>
                <option value="correzione">Correzione</option>
              </select>
            </label>

            <label>
              Quantita
              <input v-model="form.quantita" type="number" min="0" step="0.01" :disabled="saving" />
            </label>

            <label>
              Data e ora
              <input v-model="form.dataMovimento" type="datetime-local" :disabled="saving" />
            </label>

            <label>
              Ospite (opzionale)
              <select v-model="form.hostId" :disabled="saving || !hosts.length">
                <option value="">Nessuno</option>
                <option v-for="host in hosts" :key="host.id" :value="host.id">
                  {{ hostLabel(host.id) }}
                </option>
              </select>
            </label>

            <label>
              Terapia (opzionale)
              <select v-model="form.therapyId" :disabled="saving || !therapies.length">
                <option value="">Nessuna</option>
                <option v-for="therapy in therapies" :key="therapy.id" :value="therapy.id">
                  {{ therapyLabel(therapy.id) }}
                </option>
              </select>
            </label>

            <label>
              Note
              <input v-model="form.note" type="text" placeholder="Dettaglio operativo" :disabled="saving" />
            </label>

            <button :disabled="saving || !canCreateMovement" @click="saveMovement">
              {{ saving ? 'Registrazione...' : (editingMovementId ? 'Salva modifica' : 'Registra movimento') }}
            </button>
            <button type="button" :disabled="saving" @click="resetForm">Annulla</button>
          </div>

          <p v-if="message" class="muted" style="margin-top:.55rem">{{ message }}</p>
          <p v-if="errorMessage" class="import-error">{{ errorMessage }}</p>
        </div>
      </details>
    </div>
  </div>
</template>
