<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, enqueue, getSetting } from '../db'
import { useAuth } from '../services/auth'

const { currentUser } = useAuth()

const loading = ref(false)
const savingDrug = ref(false)
const savingBatch = ref(false)
const message = ref('')
const errorMessage = ref('')

const drugs = ref([])
const batches = ref([])

const drugForm = ref({
  id: '',
  principioAttivo: '',
  classeTerapeutica: '',
  scortaMinima: '',
})

const batchForm = ref({
  drugId: '',
  nomeCommerciale: '',
  dosaggio: '',
  quantitaAttuale: '',
  sogliaRiordino: '',
  scadenza: '',
})

const canCreateBatch = computed(() => drugs.value.length > 0)

function toIdFromName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
}

function drugLabel(drugId) {
  const item = drugs.value.find(drug => drug.id === drugId)
  return item?.principioAttivo ?? drugId
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [rawDrugs, rawBatches] = await Promise.all([
      db.drugs.toArray(),
      db.stockBatches.toArray(),
    ])

    drugs.value = rawDrugs
      .filter(item => !item.deletedAt)
      .sort((a, b) => (a.principioAttivo || a.id).localeCompare(b.principioAttivo || b.id))

    batches.value = rawBatches
      .filter(item => !item.deletedAt)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  } catch (err) {
    errorMessage.value = `Errore caricamento catalogo: ${err.message}`
  } finally {
    loading.value = false
  }
}

async function createDrug() {
  message.value = ''
  errorMessage.value = ''

  const name = drugForm.value.principioAttivo.trim()
  if (!name) {
    errorMessage.value = 'Inserisci almeno il principio attivo.'
    return
  }

  const id = (drugForm.value.id || toIdFromName(name) || crypto.randomUUID()).trim()
  const now = new Date().toISOString()

  savingDrug.value = true
  try {
    const existing = await db.drugs.get(id)
    if (existing && !existing.deletedAt) {
      throw new Error('ID farmaco già esistente')
    }

    const record = {
      id,
      principioAttivo: name,
      classeTerapeutica: drugForm.value.classeTerapeutica.trim() || '',
      scortaMinima: Number(drugForm.value.scortaMinima || 0),
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.drugs, db.syncQueue, db.activityLog, async () => {
      await db.drugs.put(record)
      await enqueue('drugs', record.id, 'upsert')
      await db.activityLog.add({
        entityType: 'drugs',
        entityId: record.id,
        action: 'drug_created',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    drugForm.value = {
      id: '',
      principioAttivo: '',
      classeTerapeutica: '',
      scortaMinima: '',
    }
    message.value = 'Farmaco salvato.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore salvataggio farmaco: ${err.message}`
  } finally {
    savingDrug.value = false
  }
}

async function createBatch() {
  message.value = ''
  errorMessage.value = ''

  if (!batchForm.value.drugId) {
    errorMessage.value = 'Seleziona un farmaco per la confezione.'
    return
  }

  const name = batchForm.value.nomeCommerciale.trim()
  if (!name) {
    errorMessage.value = 'Inserisci nome commerciale della confezione.'
    return
  }

  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  savingBatch.value = true
  try {
    const record = {
      id,
      drugId: batchForm.value.drugId,
      nomeCommerciale: name,
      dosaggio: batchForm.value.dosaggio.trim() || '',
      quantitaAttuale: Number(batchForm.value.quantitaAttuale || 0),
      sogliaRiordino: Number(batchForm.value.sogliaRiordino || 0),
      scadenza: batchForm.value.scadenza || null,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.stockBatches, db.syncQueue, db.activityLog, async () => {
      await db.stockBatches.put(record)
      await enqueue('stockBatches', record.id, 'upsert')
      await db.activityLog.add({
        entityType: 'stockBatches',
        entityId: record.id,
        action: 'stock_batch_created',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    batchForm.value = {
      drugId: '',
      nomeCommerciale: '',
      dosaggio: '',
      quantitaAttuale: '',
      sogliaRiordino: '',
      scadenza: '',
    }
    message.value = 'Confezione salvata.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore salvataggio confezione: ${err.message}`
  } finally {
    savingBatch.value = false
  }
}

async function deactivateBatch(batch) {
  const confirmed = window.confirm('Confermi disattivazione confezione?')
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''
  const now = new Date().toISOString()

  try {
    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.stockBatches, db.syncQueue, db.activityLog, async () => {
      await db.stockBatches.put({
        ...batch,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
      await enqueue('stockBatches', batch.id, 'upsert')
      await db.activityLog.add({
        entityType: 'stockBatches',
        entityId: batch.id,
        action: 'stock_batch_deactivated',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    message.value = 'Confezione disattivata.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore disattivazione confezione: ${err.message}`
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="view">
    <h2>Catalogo Farmaci</h2>

    <div class="card">
      <p><strong>Nuovo farmaco</strong></p>
      <div class="import-form" style="margin-top:.65rem">
        <label>
          ID farmaco (opzionale)
          <input v-model="drugForm.id" type="text" placeholder="es. paracetamolo" />
        </label>

        <label>
          Principio attivo
          <input v-model="drugForm.principioAttivo" type="text" placeholder="Paracetamolo" />
        </label>

        <label>
          Classe terapeutica
          <input v-model="drugForm.classeTerapeutica" type="text" placeholder="Analgesici" />
        </label>

        <label>
          Scorta minima
          <input v-model="drugForm.scortaMinima" type="number" min="0" step="1" />
        </label>

        <button :disabled="savingDrug" @click="createDrug">
          {{ savingDrug ? 'Salvataggio...' : 'Salva farmaco' }}
        </button>
      </div>
    </div>

    <div class="card">
      <p><strong>Nuova confezione magazzino</strong></p>
      <div class="import-form" style="margin-top:.65rem">
        <label>
          Farmaco
          <select v-model="batchForm.drugId" :disabled="!canCreateBatch || savingBatch">
            <option value="">Seleziona farmaco</option>
            <option v-for="drug in drugs" :key="drug.id" :value="drug.id">{{ drug.principioAttivo }}</option>
          </select>
        </label>

        <label>
          Nome commerciale
          <input v-model="batchForm.nomeCommerciale" type="text" placeholder="Tachipirina" />
        </label>

        <label>
          Dosaggio
          <input v-model="batchForm.dosaggio" type="text" placeholder="500mg" />
        </label>

        <label>
          Quantita' attuale
          <input v-model="batchForm.quantitaAttuale" type="number" min="0" step="1" />
        </label>

        <label>
          Soglia riordino
          <input v-model="batchForm.sogliaRiordino" type="number" min="0" step="1" />
        </label>

        <label>
          Scadenza
          <input v-model="batchForm.scadenza" type="date" />
        </label>

        <button :disabled="savingBatch || !canCreateBatch" @click="createBatch">
          {{ savingBatch ? 'Salvataggio...' : 'Salva confezione' }}
        </button>
      </div>
      <p v-if="!canCreateBatch" class="muted" style="margin-top:.5rem;font-size:.85rem">
        Prima crea almeno un farmaco.
      </p>
    </div>

    <div class="card">
      <p><strong>Farmaci registrati</strong></p>
      <p v-if="loading" class="muted" style="margin-top:.5rem">Caricamento...</p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>ID</th>
            <th>Principio attivo</th>
            <th>Classe</th>
            <th>Scorta minima</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="drug in drugs" :key="drug.id">
            <td>{{ drug.id }}</td>
            <td>{{ drug.principioAttivo }}</td>
            <td>{{ drug.classeTerapeutica || '—' }}</td>
            <td>{{ drug.scortaMinima ?? 0 }}</td>
          </tr>
          <tr v-if="drugs.length === 0 && !loading">
            <td colspan="4" class="muted">Nessun farmaco disponibile.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <p><strong>Confezioni attive</strong></p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Farmaco</th>
            <th>Nome commerciale</th>
            <th>Dosaggio</th>
            <th>Quantita'</th>
            <th>Soglia</th>
            <th>Scadenza</th>
            <th>Azione</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="batch in batches" :key="batch.id">
            <td>{{ drugLabel(batch.drugId) }}</td>
            <td>{{ batch.nomeCommerciale }}</td>
            <td>{{ batch.dosaggio || '—' }}</td>
            <td>{{ batch.quantitaAttuale ?? 0 }}</td>
            <td>{{ batch.sogliaRiordino ?? 0 }}</td>
            <td>{{ formatDate(batch.scadenza) }}</td>
            <td>
              <button @click="deactivateBatch(batch)">Disattiva</button>
            </td>
          </tr>
          <tr v-if="batches.length === 0 && !loading">
            <td colspan="7" class="muted">Nessuna confezione attiva disponibile.</td>
          </tr>
        </tbody>
      </table>

      <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>
    </div>
  </div>
</template>
