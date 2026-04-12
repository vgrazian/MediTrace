<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, getSetting } from '../db'
import { useAuth } from '../services/auth'
import { upsertDrug, deleteDrug, upsertBatch, deactivateBatch } from '../services/farmaci'
import { confirmDeleteDrug, confirmDeleteBatch, confirmDeleteMultiple } from '../services/confirmations'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'
import CrudFilterBar from '../components/CrudFilterBar.vue'
import { useSelection } from '../composables/useSelection'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { useUnsavedChangesGuard } from '../composables/useUnsavedChangesGuard'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()

// Validation for drug form
const {
  errors: drugErrors,
  validateField: validateDrugField,
  validateForm: validateDrugForm,
  clearErrors: clearDrugErrors,
  hasErrors: hasDrugErrors
} = useFormValidation({
  nomeFarmaco: { required: true, minLength: 2, maxLength: 100 },
  principioAttivo: { required: true, minLength: 2, maxLength: 100 },
  classeTerapeutica: { maxLength: 50 },
  scortaMinima: { numeric: true, positiveNumber: true, integer: true }
}, {
  nomeFarmaco: 'Nome farmaco',
  principioAttivo: 'Principio attivo',
  classeTerapeutica: 'Classe terapeutica',
  scortaMinima: 'Scorta minima'
})

// Validation for batch form
const {
  errors: batchErrors,
  validateField: validateBatchField,
  validateForm: validateBatchForm,
  clearErrors: clearBatchErrors,
  hasErrors: hasBatchErrors
} = useFormValidation({
  drugId: { required: true },
  nomeCommerciale: { required: true, minLength: 2, maxLength: 100 },
  dosaggio: { maxLength: 50 },
  quantitaAttuale: { numeric: true, positiveNumber: true, integer: true },
  sogliaRiordino: { numeric: true, positiveNumber: true, integer: true },
  scadenza: { date: true }
}, {
  drugId: 'Farmaco',
  nomeCommerciale: 'Nome commerciale',
  dosaggio: 'Dosaggio',
  quantitaAttuale: 'Quantità attuale',
  sogliaRiordino: 'Soglia riordino',
  scadenza: 'Scadenza'
})

const loading = ref(false)
const savingDrug = ref(false)
const savingBatch = ref(false)
const message = ref('')
const errorMessage = ref('')

const drugs = ref([])
const batches = ref([])
const editingDrugId = ref(null)
const editingBatchId = ref(null)
const isFormOpen = ref(false)
const panelMode = ref('list')
const filterQuery = ref('')
const formSnapshot = ref('')

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

const normalizedFilter = computed(() => filterQuery.value.trim().toLowerCase())

const filteredDrugs = computed(() => {
  const q = normalizedFilter.value
  if (!q) return drugs.value
  return drugs.value.filter((drug) => {
    const haystack = [
      drug.id,
      drug.nomeFarmaco,
      drug.principioAttivo,
      drug.classeTerapeutica,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const filteredBatches = computed(() => {
  const q = normalizedFilter.value
  if (!q) return batches.value
  return batches.value.filter((batch) => {
    const haystack = [
      batch.id,
      batch.nomeCommerciale,
      batch.dosaggio,
      drugLabel(batch.drugId),
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const isDirty = computed(() => {
  if (!isFormOpen.value) return false
  return formSnapshot.value !== JSON.stringify({
    panelMode: panelMode.value,
    drugForm: drugForm.value,
    batchForm: batchForm.value,
  })
})

useUnsavedChangesGuard(isDirty)

const {
  allSelected: allDrugsSelected,
  someSelected: someDrugsSelected,
  selectedCount: selectedDrugsCount,
  toggleSelection: toggleDrugSelection,
  toggleSelectAll: toggleAllDrugs,
  clearSelection: clearDrugSelection,
  isSelected: isDrugSelected,
  getSelectedItems: getSelectedDrugs,
} = useSelection(filteredDrugs)

const {
  allSelected: allBatchesSelected,
  someSelected: someBatchesSelected,
  selectedCount: selectedBatchesCount,
  toggleSelection: toggleBatchSelection,
  toggleSelectAll: toggleAllBatches,
  clearSelection: clearBatchSelection,
  isSelected: isBatchSelected,
  getSelectedItems: getSelectedBatches,
} = useSelection(filteredBatches)

function markFormSnapshot() {
  formSnapshot.value = JSON.stringify({
    panelMode: panelMode.value,
    drugForm: drugForm.value,
    batchForm: batchForm.value,
  })
}

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

  // Validate form
  if (!validateDrugForm(drugForm.value)) {
    errorMessage.value = 'Correggi gli errori nel form prima di salvare.'
    return
  }

  const nomeFarmaco = drugForm.value.nomeFarmaco.trim()
  const principioAttivo = drugForm.value.principioAttivo.trim()

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
    clearDrugErrors()
    editingDrugId.value = null
    message.value = existing && !existing.deletedAt ? 'Farmaco aggiornato.' : `Farmaco salvato (ID: ${saved.id}).`
    await loadData()
    markFormSnapshot()
  } catch (err) {
    errorMessage.value = `Errore salvataggio farmaco: ${err.message}`
  } finally {
    savingDrug.value = false
  }
}

async function createBatch() {
  message.value = ''
  errorMessage.value = ''

  // Validate form
  if (!validateBatchForm(batchForm.value)) {
    errorMessage.value = 'Correggi gli errori nel form prima di salvare.'
    return
  }

  const name = batchForm.value.nomeCommerciale.trim()
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
    clearBatchErrors()
    editingBatchId.value = null
    message.value = existing ? 'Confezione aggiornata.' : 'Confezione salvata.'
    await loadData()
    markFormSnapshot()
  } catch (err) {
    errorMessage.value = `Errore salvataggio confezione: ${err.message}`
  } finally {
    savingBatch.value = false
  }
}

async function deactivateBatchUI(batch) {
  const drugName = drugLabel(batch.drugId)
  const batchName = `${batch.nomeCommerciale} (${drugName})`
  const confirmed = await confirmDeleteBatch(batchName)
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    await deactivateBatch({
      batchId: batch.id,
      existing: batch,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = 'Confezione eliminata.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore eliminazione confezione: ${err.message}`
  }
}

function openAddDrugForm() {
  resetDrugForm()
  panelMode.value = 'create-drug'
  isFormOpen.value = true
  markFormSnapshot()
}

function openAddBatchForm() {
  resetBatchForm()
  panelMode.value = 'create-batch'
  isFormOpen.value = true
  markFormSnapshot()
}

function startEditDrug(drug) {
  editingDrugId.value = drug.id
  panelMode.value = 'edit-drug'
  isFormOpen.value = true
  drugForm.value = {
    nomeFarmaco: drug.nomeFarmaco || '',
    principioAttivo: drug.principioAttivo || '',
    classeTerapeutica: drug.classeTerapeutica || '',
    scortaMinima: String(drug.scortaMinima ?? ''),
  }
  markFormSnapshot()
}

function startEditBatch(batch) {
  editingBatchId.value = batch.id
  panelMode.value = 'edit-batch'
  isFormOpen.value = true
  batchForm.value = {
    drugId: batch.drugId || '',
    nomeCommerciale: batch.nomeCommerciale || '',
    dosaggio: batch.dosaggio || '',
    quantitaAttuale: String(batch.quantitaAttuale ?? ''),
    sogliaRiordino: String(batch.sogliaRiordino ?? ''),
    scadenza: batch.scadenza ? String(batch.scadenza).slice(0, 10) : '',
  }
  markFormSnapshot()
}

function resetDrugForm() {
  editingDrugId.value = null
  drugForm.value = {
    nomeFarmaco: '',
    principioAttivo: '',
    classeTerapeutica: '',
    scortaMinima: '',
  }
  clearDrugErrors()
  markFormSnapshot()
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
  clearBatchErrors()
  markFormSnapshot()
}

async function deleteDrugRecord(drug) {
  const drugName = drug.nomeFarmaco || drug.principioAttivo || drug.id
  const confirmed = await confirmDeleteDrug(drugName)
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

function openEditDrugForm() {
  if (selectedDrugsCount.value !== 1) return
  const selectedDrug = getSelectedDrugs()[0]
  if (!selectedDrug) return
  startEditDrug(selectedDrug)
}

function openEditBatchForm() {
  if (selectedBatchesCount.value !== 1) return
  const selectedBatch = getSelectedBatches()[0]
  if (!selectedBatch) return
  startEditBatch(selectedBatch)
}

async function deleteSelectedDrugs() {
  if (selectedDrugsCount.value === 0) return

  const selectedDrugs = getSelectedDrugs()
  const confirmed = await confirmDeleteMultiple(
    selectedDrugsCount.value,
    selectedDrugsCount.value === 1 ? 'farmaco' : 'farmaci',
  )
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    for (const drug of selectedDrugs) {
      await deleteDrug({
        drugId: drug.id,
        existing: drug,
        operatorId: currentUser.value?.login ?? null,
      })
    }

    if (editingDrugId.value && selectedDrugs.some(drug => drug.id === editingDrugId.value)) {
      resetDrugForm()
    }

    clearDrugSelection()
    message.value = selectedDrugs.length === 1
      ? 'Farmaco eliminato.'
      : `${selectedDrugs.length} farmaci eliminati.`
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore eliminazione farmaco: ${err.message}`
  }
}

async function deleteSelectedBatches() {
  if (selectedBatchesCount.value === 0) return

  const selectedBatches = getSelectedBatches()
  const confirmed = await confirmDeleteMultiple(
    selectedBatchesCount.value,
    selectedBatchesCount.value === 1 ? 'confezione' : 'confezioni',
  )
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    for (const batch of selectedBatches) {
      await deactivateBatch({
        batchId: batch.id,
        existing: batch,
        operatorId: currentUser.value?.login ?? null,
      })
    }

    if (editingBatchId.value && selectedBatches.some(batch => batch.id === editingBatchId.value)) {
      resetBatchForm()
    }

    clearBatchSelection()
    message.value = selectedBatches.length === 1
      ? 'Confezione eliminata.'
      : `${selectedBatches.length} confezioni eliminate.`
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore eliminazione confezione: ${err.message}`
  }
}

onMounted(() => {
  void loadData()
  markFormSnapshot()
})
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Catalogo Farmaci</h2>
      <button class="help-btn" @click="goToHelpSection('farmaci')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Farmaci registrati</strong></p>
      <CrudFilterBar
        v-model="filterQuery"
        label="Filtra farmaci e confezioni"
        placeholder="Cerca per nome farmaco, principio attivo, confezione o dosaggio"
        :visible-count="filteredDrugs.length + filteredBatches.length"
        :total-count="drugs.length + batches.length"
      />
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        <button @click="openAddDrugForm">Aggiungi</button>
        <button :disabled="selectedDrugsCount !== 1" @click="openEditDrugForm">Modifica</button>
        <button
          :disabled="selectedDrugsCount === 0"
          style="background:#c0392b"
          @click="deleteSelectedDrugs"
        >
          Elimina{{ selectedDrugsCount > 0 ? ` (${selectedDrugsCount})` : '' }}
        </button>
      </div>
      <p v-if="selectedDrugsCount > 0" class="muted" style="margin-top:.55rem">
        {{ selectedDrugsCount }} farmac{{ selectedDrugsCount > 1 ? 'i' : 'o' }} selezionat{{ selectedDrugsCount > 1 ? 'i' : 'o' }}.
        <button type="button" style="margin-left:.4rem" @click="clearDrugSelection">Deseleziona tutto</button>
      </p>
      <p v-if="loading" class="muted" style="margin-top:.5rem">Caricamento...</p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th style="width:2.5rem">
              <input
                type="checkbox"
                :checked="allDrugsSelected"
                :indeterminate.prop="someDrugsSelected"
                aria-label="Seleziona tutti i farmaci"
                @change="toggleAllDrugs"
              />
            </th>
            <th>Nome farmaco</th>
            <th>Principio attivo</th>
            <th>Classe</th>
            <th>Scorta minima</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="drug in filteredDrugs"
            :key="drug.id"
            :style="isDrugSelected(drug.id) ? 'background:rgba(52, 152, 219, 0.12)' : undefined"
          >
            <td>
              <input
                type="checkbox"
                :checked="isDrugSelected(drug.id)"
                :aria-label="`Seleziona farmaco ${drug.nomeFarmaco || drug.principioAttivo || drug.id}`"
                @change="toggleDrugSelection(drug.id)"
              />
            </td>
            <td>{{ drug.nomeFarmaco || '—' }}</td>
            <td>{{ drug.principioAttivo }}</td>
            <td>{{ drug.classeTerapeutica || '—' }}</td>
            <td>{{ drug.scortaMinima ?? 0 }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditDrug(drug)">Modifica</button>
              <button style="background:#c0392b" @click="deleteDrugRecord(drug)">Elimina</button>
            </td>
          </tr>
          <tr v-if="filteredDrugs.length === 0 && !loading">
            <td colspan="6" class="muted">Nessun farmaco disponibile.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <p><strong>Confezioni attive</strong></p>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        <button @click="openAddBatchForm">Aggiungi</button>
        <button :disabled="selectedBatchesCount !== 1" @click="openEditBatchForm">Modifica</button>
        <button
          :disabled="selectedBatchesCount === 0"
          style="background:#c0392b"
          @click="deleteSelectedBatches"
        >
          Elimina{{ selectedBatchesCount > 0 ? ` (${selectedBatchesCount})` : '' }}
        </button>
      </div>
      <p v-if="selectedBatchesCount > 0" class="muted" style="margin-top:.55rem">
        {{ selectedBatchesCount }} confezion{{ selectedBatchesCount > 1 ? 'i' : 'e' }} selezionat{{ selectedBatchesCount > 1 ? 'i' : 'a' }}.
        <button type="button" style="margin-left:.4rem" @click="clearBatchSelection">Deseleziona tutto</button>
      </p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th style="width:2.5rem">
              <input
                type="checkbox"
                :checked="allBatchesSelected"
                :indeterminate.prop="someBatchesSelected"
                aria-label="Seleziona tutte le confezioni"
                @change="toggleAllBatches"
              />
            </th>
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
          <tr
            v-for="batch in filteredBatches"
            :key="batch.id"
            :style="isBatchSelected(batch.id) ? 'background:rgba(52, 152, 219, 0.12)' : undefined"
          >
            <td>
              <input
                type="checkbox"
                :checked="isBatchSelected(batch.id)"
                :aria-label="`Seleziona confezione ${batch.nomeCommerciale}`"
                @change="toggleBatchSelection(batch.id)"
              />
            </td>
            <td>{{ drugLabel(batch.drugId) }}</td>
            <td>{{ batch.nomeCommerciale }}</td>
            <td>{{ batch.dosaggio || '—' }}</td>
            <td>{{ batch.quantitaAttuale ?? 0 }}</td>
            <td>{{ batch.sogliaRiordino ?? 0 }}</td>
            <td>{{ formatDate(batch.scadenza) }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditBatch(batch)">Modifica</button>
              <button style="background:#c0392b" @click="deactivateBatchUI(batch)">Elimina</button>
            </td>
          </tr>
          <tr v-if="filteredBatches.length === 0 && !loading">
            <td colspan="8" class="muted">Nessuna confezione attiva disponibile.</td>
          </tr>
        </tbody>
      </table>

      <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>
    </div>

    <div class="card">
      <details class="deep-panel" :open="isFormOpen" @toggle="isFormOpen = $event.target.open">
        <summary><strong>Gestisci Farmaci</strong></summary>

        <div style="margin-top:.75rem">
          <div class="panel-breadcrumb">
            <button type="button" class="panel-breadcrumb-link" @click="isFormOpen = false">Farmaci</button>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">
              {{ panelMode.includes('batch') ? 'Confezioni' : 'Farmaco' }}
            </span>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">
              {{ panelMode.startsWith('edit') ? 'Modifica' : 'Aggiungi' }}
            </span>
            <button type="button" class="panel-close-btn" @click="isFormOpen = false">Chiudi</button>
          </div>
          <p><strong>{{ editingDrugId ? 'Modifica farmaco' : 'Aggiungi nuovo farmaco' }}</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <ValidatedInput
              v-model="drugForm.nomeFarmaco"
              field-name="nomeFarmaco"
              label="Nome farmaco"
              :error="drugErrors.nomeFarmaco"
              :required="true"
              placeholder="Tachipirina"
              @validate="(field, value) => validateDrugField(field, value)"
            />

            <ValidatedInput
              v-model="drugForm.principioAttivo"
              field-name="principioAttivo"
              label="Principio attivo"
              :error="drugErrors.principioAttivo"
              :required="true"
              placeholder="Paracetamolo"
              @validate="(field, value) => validateDrugField(field, value)"
            />

            <ValidatedInput
              v-model="drugForm.classeTerapeutica"
              field-name="classeTerapeutica"
              label="Classe terapeutica"
              :error="drugErrors.classeTerapeutica"
              placeholder="Analgesici"
              @validate="(field, value) => validateDrugField(field, value)"
            />

            <ValidatedInput
              v-model="drugForm.scortaMinima"
              field-name="scortaMinima"
              label="Scorta minima"
              type="number"
              :error="drugErrors.scortaMinima"
              placeholder="0"
              @validate="(field, value) => validateDrugField(field, value)"
            />

            <button :disabled="savingDrug || hasDrugErrors" @click="createDrug">
              {{ savingDrug ? 'Salvataggio...' : (editingDrugId ? 'Salva modifica' : 'Salva farmaco') }}
            </button>
            <button type="button" :disabled="savingDrug" @click="resetDrugForm">Annulla</button>
          </div>
        </div>

        <div style="margin-top:1rem">
          <p><strong>{{ editingBatchId ? 'Modifica confezione di magazzino' : 'Aggiungi confezione di magazzino' }}</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Farmaco *
              <select
                v-model="batchForm.drugId"
                :disabled="!canCreateBatch || savingBatch"
                @blur="validateBatchField('drugId', batchForm.drugId)"
                :aria-invalid="!!batchErrors.drugId"
                :aria-describedby="batchErrors.drugId ? 'drugId-error' : undefined"
              >
                <option value="">Seleziona farmaco</option>
                <option v-for="drug in drugs" :key="drug.id" :value="drug.id">{{ drugLabel(drug.id) }}</option>
              </select>
              <span v-if="batchErrors.drugId" id="drugId-error" class="error-message" role="alert">
                {{ batchErrors.drugId }}
              </span>
            </label>

            <ValidatedInput
              v-model="batchForm.nomeCommerciale"
              field-name="nomeCommerciale"
              label="Nome commerciale"
              :error="batchErrors.nomeCommerciale"
              :required="true"
              placeholder="Tachipirina"
              @validate="(field, value) => validateBatchField(field, value)"
            />

            <ValidatedInput
              v-model="batchForm.dosaggio"
              field-name="dosaggio"
              label="Dosaggio"
              :error="batchErrors.dosaggio"
              placeholder="500 mg"
              @validate="(field, value) => validateBatchField(field, value)"
            />

            <ValidatedInput
              v-model="batchForm.quantitaAttuale"
              field-name="quantitaAttuale"
              label="Quantità attuale"
              type="number"
              :error="batchErrors.quantitaAttuale"
              placeholder="0"
              @validate="(field, value) => validateBatchField(field, value)"
            />

            <ValidatedInput
              v-model="batchForm.sogliaRiordino"
              field-name="sogliaRiordino"
              label="Soglia riordino"
              type="number"
              :error="batchErrors.sogliaRiordino"
              placeholder="0"
              @validate="(field, value) => validateBatchField(field, value)"
            />

            <ValidatedInput
              v-model="batchForm.scadenza"
              field-name="scadenza"
              label="Scadenza"
              type="date"
              :error="batchErrors.scadenza"
              @validate="(field, value) => validateBatchField(field, value)"
            />

            <button :disabled="savingBatch || !canCreateBatch || hasBatchErrors" @click="createBatch">
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
