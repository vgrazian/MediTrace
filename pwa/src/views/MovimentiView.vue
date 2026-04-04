<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, enqueue, getSetting } from '../db'
import { useAuth } from '../services/auth'

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
  return item?.principioAttivo ?? drugId ?? '—'
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
  if (!host) return hostId
  return host.codiceInterno || host.iniziali || hostId
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

async function createMovement() {
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

  const now = new Date().toISOString()
  const movementDate = form.value.dataMovimento
    ? new Date(form.value.dataMovimento).toISOString()
    : now

  const record = {
    id: crypto.randomUUID(),
    stockBatchId: form.value.stockBatchId,
    drugId: selectedBatch.drugId || null,
    hostId: form.value.hostId || null,
    therapyId: form.value.therapyId || null,
    type: form.value.tipoMovimento,
    tipoMovimento: form.value.tipoMovimento,
    quantita: quantity,
    dataMovimento: movementDate,
    note: form.value.note.trim() || '',
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending',
  }

  saving.value = true
  try {
    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.movements, db.syncQueue, db.activityLog, async () => {
      await db.movements.put(record)
      await enqueue('movements', record.id, 'upsert')
      await db.activityLog.add({
        entityType: 'movements',
        entityId: record.id,
        action: 'movement_created',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
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

    message.value = 'Movimento registrato.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore registrazione movimento: ${err.message}`
  } finally {
    saving.value = false
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
      <p><strong>Nuovo movimento magazzino</strong></p>
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
              {{ host.codiceInterno || host.id }}
            </option>
          </select>
        </label>

        <label>
          Terapia (opzionale)
          <select v-model="form.therapyId" :disabled="saving || !therapies.length">
            <option value="">Nessuna</option>
            <option v-for="therapy in therapies" :key="therapy.id" :value="therapy.id">
              {{ therapy.id }}
            </option>
          </select>
        </label>

        <label>
          Note
          <input v-model="form.note" type="text" placeholder="Dettaglio operativo" :disabled="saving" />
        </label>

        <button :disabled="saving || !canCreateMovement" @click="createMovement">
          {{ saving ? 'Registrazione...' : 'Registra movimento' }}
        </button>
      </div>

      <p v-if="message" class="muted" style="margin-top:.55rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error">{{ errorMessage }}</p>
    </div>

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
          </tr>
          <tr v-if="movements.length === 0">
            <td colspan="6" class="muted">Nessun movimento registrato nel dataset locale.</td>
          </tr>
        </tbody>
      </table>

      <p v-if="loading" class="muted" style="margin-top:.55rem">Aggiornamento dati...</p>
    </div>
  </div>
</template>
