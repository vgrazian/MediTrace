<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, getSetting } from '../db'
import { useAuth } from '../services/auth'
import { upsertDrug, deleteDrug, upsertBatch, deactivateBatch } from '../services/farmaci'

const { currentUser } = useAuth()

const loading = ref(false)
const savingDrug = ref(false)
const savingBatch = ref(false)
const message = ref('')
const errorMessage = ref('')

const drugs = ref([])
const batches = ref([])
const editingDrugId = ref(null)
const editingBatchId = ref(null)

const drugForm = ref({
  nomeFarmaco: '',
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

function drugLabel(drugId) {
  const item = drugs.value.find(drug => drug.id === drugId)
  if (!item) return drugId
  const name = String(item.nomeFarmaco || '').trim()
  const activeIngredient = String(item.principioAttivo || '').trim()
  if (name && activeIngredient && name !== activeIngredient) {
    return `${name} (${activeIngredient})`
  }
  return name || activeIngredient || drugId
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
      .sort((a, b) => (a.nomeFarmaco || a.principioAttivo || a.id).localeCompare(b.nomeFarmaco || b.principioAttivo || b.id))

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

  const nomeFarmaco = drugForm.value.nomeFarmaco.trim()
  const principioAttivo = drugForm.value.principioAttivo.trim()
  if (!nomeFarmaco || !principioAttivo) {
    errorMessage.value = 'Inserisci nome farmaco e principio attivo.'
    return
  }

  savingDrug.value = true
  try {
    const existing = editingDrugId.value ? await db.drugs.get(editingDrugId.value) : null

    const saved = await upsertDrug({
      existing: existing && !existing.deletedAt ? existing : null,
      nomeFarmaco,
      principioAttivo,
      classeTerapeutica: drugForm.value.classeTerapeutica.trim() || '',
      scortaMinima: Number(drugForm.value.scortaMinima || 0),
      operatorId: currentUser.value?.login ?? null,
    })

    drugForm.value = {
      nomeFarmaco: '',
      principioAttivo: '',
      classeTerapeutica: '',
      scortaMinima: '',
    }
    editingDrugId.value = null
    message.value = existing && !existing.deletedAt ? 'Farmaco aggiornato.' : `Farmaco salvato (ID: ${saved.id}).`
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

  const id = editingBatchId.value || crypto.randomUUID()

  savingBatch.value = true
  try {
    const existing = editingBatchId.value ? await db.stockBatches.get(editingBatchId.value) : null

    await upsertBatch({
      batchId: id,
      existing,
      drugId: batchForm.value.drugId,
      nomeCommerciale: name,
      dosaggio: batchForm.value.dosaggio.trim() || '',
      quantitaAttuale: Number(batchForm.value.quantitaAttuale || 0),
      sogliaRiordino: Number(batchForm.value.sogliaRiordino || 0),
      scadenza: batchForm.value.scadenza || null,
      operatorId: currentUser.value?.login ?? null,
    })

    batchForm.value = {
      drugId: '',
      nomeCommerciale: '',
      dosaggio: '',
      quantitaAttuale: '',
      sogliaRiordino: '',
      scadenza: '',
    }
    editingBatchId.value = null
    message.value = existing ? 'Confezione aggiornata.' : 'Confezione salvata.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore salvataggio confezione: ${err.message}`
  } finally {
    savingBatch.value = false
  }
}

async function deactivateBatchUI(batch) {
  const confirmed = window.confirm('Confermi disattivazione confezione?')
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    await deactivateBatch({
      batchId: batch.id,
      existing: batch,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = 'Confezione disattivata.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore disattivazione confezione: ${err.message}`
  }
}

function startEditDrug(drug) {
  editingDrugId.value = drug.id
  drugForm.value = {
    nomeFarmaco: drug.nomeFarmaco || '',
    principioAttivo: drug.principioAttivo || '',
    classeTerapeutica: drug.classeTerapeutica || '',
    scortaMinima: String(drug.scortaMinima ?? ''),
  }
}

function startEditBatch(batch) {
  editingBatchId.value = batch.id
  batchForm.value = {
    drugId: batch.drugId || '',
    nomeCommerciale: batch.nomeCommerciale || '',
    dosaggio: batch.dosaggio || '',
    quantitaAttuale: String(batch.quantitaAttuale ?? ''),
    sogliaRiordino: String(batch.sogliaRiordino ?? ''),
    scadenza: batch.scadenza ? String(batch.scadenza).slice(0, 10) : '',
  }
}

function resetDrugForm() {
  editingDrugId.value = null
  drugForm.value = {
    nomeFarmaco: '',
    principioAttivo: '',
    classeTerapeutica: '',
    scortaMinima: '',
  }
}

function resetBatchForm() {
  editingBatchId.value = null
  batchForm.value = {
    drugId: '',
    nomeCommerciale: '',
    dosaggio: '',
    quantitaAttuale: '',
    sogliaRiordino: '',
    scadenza: '',
  }
}

async function deleteDrugRecord(drug) {
  const confirmed = window.confirm('Confermi eliminazione farmaco?')
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    await deleteDrug({
      drugId: drug.id,
      existing: drug,
      operatorId: currentUser.value?.login ?? null,
    })

    if (editingDrugId.value === drug.id) resetDrugForm()
    message.value = 'Farmaco eliminato.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore eliminazione farmaco: ${err.message}`
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
      <p><strong>Farmaci registrati</strong></p>
      <p v-if="loading" class="muted" style="margin-top:.5rem">Caricamento...</p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Nome farmaco</th>
            <th>Principio attivo</th>
            <th>Classe</th>
            <th>Scorta minima</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="drug in drugs" :key="drug.id">
            <td>{{ drug.nomeFarmaco || '—' }}</td>
            <td>{{ drug.principioAttivo }}</td>
            <td>{{ drug.classeTerapeutica || '—' }}</td>
            <td>{{ drug.scortaMinima ?? 0 }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditDrug(drug)">Modifica</button>
              <button style="background:#c0392b" @click="deleteDrugRecord(drug)">Elimina</button>
            </td>
          </tr>
          <tr v-if="drugs.length === 0 && !loading">
            <td colspan="5" class="muted">Nessun farmaco disponibile.</td>
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
              <button style="margin-right:.35rem" @click="startEditBatch(batch)">Modifica</button>
              <button style="background:#c0392b" @click="deactivateBatchUI(batch)">Disattiva</button>
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

    <div class="card">
      <details>
        <summary><strong>Gestisci Farmaci</strong></summary>

        <div style="margin-top:.75rem">
          <p><strong>{{ editingDrugId ? 'Modifica farmaco' : 'Aggiungi nuovo farmaco' }}</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Nome farmaco
              <input v-model="drugForm.nomeFarmaco" type="text" placeholder="Tachipirina" />
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
              {{ savingDrug ? 'Salvataggio...' : (editingDrugId ? 'Salva modifica' : 'Salva farmaco') }}
            </button>
            <button type="button" :disabled="savingDrug" @click="resetDrugForm">Annulla</button>
          </div>
        </div>

        <div style="margin-top:1rem">
          <p><strong>{{ editingBatchId ? 'Modifica confezione di magazzino' : 'Aggiungi confezione di magazzino' }}</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Farmaco
              <select v-model="batchForm.drugId" :disabled="!canCreateBatch || savingBatch">
                <option value="">Seleziona farmaco</option>
                <option v-for="drug in drugs" :key="drug.id" :value="drug.id">{{ drugLabel(drug.id) }}</option>
              </select>
            </label>

            <label>
              Nome commerciale
              <input v-model="batchForm.nomeCommerciale" type="text" placeholder="Tachipirina" />
            </label>

            <label>
              Dosaggio
              <input v-model="batchForm.dosaggio" type="text" placeholder="500 mg" />
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
              {{ savingBatch ? 'Salvataggio...' : (editingBatchId ? 'Salva modifica' : 'Salva confezione') }}
            </button>
            <button type="button" :disabled="savingBatch" @click="resetBatchForm">Annulla</button>
          </div>
          <p v-if="!canCreateBatch" class="muted" style="margin-top:.5rem;font-size:.85rem">
            Prima crea almeno un farmaco.
          </p>
        </div>
      </details>
    </div>
  </div>
</template>
