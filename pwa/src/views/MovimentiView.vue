<script setup>
import { computed, onMounted, ref } from 'vue'
import { db } from '../db'
import { useAuth } from '../services/auth'
import { softDeleteMovement, upsertMovement } from '../services/movimenti'
import { confirmDeleteMovement, confirmDeleteMultiple } from '../services/confirmations'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'
import CrudFilterBar from '../components/CrudFilterBar.vue'
import { useSelection } from '../composables/useSelection'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { useUnsavedChangesGuard } from '../composables/useUnsavedChangesGuard'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()

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
const filterQuery = ref('')
const formSnapshot = ref('')

const form = ref({
  stockBatchId: '',
  tipoMovimento: 'scarico',
  quantita: '',
  dataMovimento: '',
  hostId: '',
  therapyId: '',
  note: '',
})

const {
  errors,
  validateField,
  validateForm,
  clearErrors,
  hasErrors,
} = useFormValidation({
  stockBatchId: { required: true },
  tipoMovimento: { required: true },
  quantita: { required: true, numeric: true, positiveNumber: true },
  note: { maxLength: 500 },
}, {
  stockBatchId: 'Confezione',
  tipoMovimento: 'Tipo movimento',
  quantita: 'Quantita',
  note: 'Note',
})

const canCreateMovement = computed(() => {
  return stockBatches.value.length > 0 && Number(form.value.quantita || 0) > 0
})

const normalizedFilter = computed(() => filterQuery.value.trim().toLowerCase())

const filteredMovements = computed(() => {
  const q = normalizedFilter.value
  if (!q) return movements.value
  return movements.value.filter((movement) => {
    const batch = stockBatches.value.find((item) => item.id === movement.stockBatchId)
    const haystack = [
      movement.id,
      movement.tipoMovimento,
      movement.note,
      movement.quantita,
      batchLabel(batch),
      hostLabel(movement.hostId),
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const isDirty = computed(() => {
  if (editingMovementId.value === null && !form.value.stockBatchId && !String(form.value.quantita || '').trim() && !String(form.value.note || '').trim()) {
    return false
  }
  return formSnapshot.value !== JSON.stringify({
    editingMovementId: editingMovementId.value,
    form: form.value,
  })
})

useUnsavedChangesGuard(isDirty)

const {
  allSelected,
  someSelected,
  selectedCount,
  toggleSelection,
  toggleSelectAll,
  clearSelection,
  isSelected,
  getSelectedItems,
} = useSelection(filteredMovements)

function markFormSnapshot() {
  formSnapshot.value = JSON.stringify({
    editingMovementId: editingMovementId.value,
    form: form.value,
  })
}

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

  if (!validateForm(form.value)) {
    errorMessage.value = 'Correggi gli errori nel form prima di salvare.'
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
    markFormSnapshot()
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
  markFormSnapshot()
}

function openEditForm() {
  if (selectedCount.value !== 1) return
  const selectedMovement = getSelectedItems()[0]
  if (!selectedMovement) return
  startEditMovement(selectedMovement)
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
  clearErrors()
  markFormSnapshot()
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

async function deleteSelectedMovements() {
  if (selectedCount.value === 0) return

  const selectedMovements = getSelectedItems()
  const confirmed = await confirmDeleteMultiple(
    selectedCount.value,
    selectedCount.value === 1 ? 'movimento' : 'movimenti',
  )
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    for (const movement of selectedMovements) {
      await softDeleteMovement({
        movement,
        operatorId: currentUser.value?.login ?? null,
      })
    }

    if (editingMovementId.value && selectedMovements.some(item => item.id === editingMovementId.value)) {
      resetForm()
    }

    clearSelection()
    message.value = selectedMovements.length === 1
      ? 'Movimento eliminato.'
      : `${selectedMovements.length} movimenti eliminati.`
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore eliminazione movimento: ${err.message}`
  }
}

onMounted(() => {
  form.value.dataMovimento = toLocalDateTimeInput()
  void loadData()
  markFormSnapshot()
})
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Movimenti</h2>
      <button class="help-btn" @click="goToHelpSection('movimenti')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Ultimi movimenti</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Elenco locale ordinato per data movimento piu recente.
      </p>
      <CrudFilterBar
        v-model="filterQuery"
        label="Filtra movimenti"
        placeholder="Cerca per tipo, confezione, ospite o note"
        :visible-count="filteredMovements.length"
        :total-count="movements.length"
      />

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        <button :disabled="selectedCount !== 1" @click="openEditForm">Modifica</button>
        <button
          :disabled="selectedCount === 0"
          style="background:#c0392b"
          @click="deleteSelectedMovements"
        >
          Elimina{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </button>
      </div>

      <p v-if="selectedCount > 0" class="muted" style="margin-top:.55rem">
        {{ selectedCount }} moviment{{ selectedCount > 1 ? 'i' : 'o' }} selezionat{{ selectedCount > 1 ? 'i' : 'o' }}.
        <button type="button" style="margin-left:.4rem" @click="clearSelection">Deseleziona tutto</button>
      </p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th style="width:2.5rem">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                aria-label="Seleziona tutti i movimenti"
                @change="toggleSelectAll"
              />
            </th>
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
          <tr
            v-for="movement in filteredMovements"
            :key="movement.id"
            :style="isSelected(movement.id) ? 'background:rgba(52, 152, 219, 0.12)' : undefined"
          >
            <td>
              <input
                type="checkbox"
                :checked="isSelected(movement.id)"
                :aria-label="`Seleziona movimento ${movement.tipoMovimento || movement.type || movement.id}`"
                @change="toggleSelection(movement.id)"
              />
            </td>
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
          <tr v-if="filteredMovements.length === 0">
            <td colspan="8" class="muted">Nessun movimento registrato nel dataset locale.</td>
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
              <select
                v-model="form.stockBatchId"
                :disabled="saving || !stockBatches.length"
                :aria-invalid="!!errors.stockBatchId"
                :aria-describedby="errors.stockBatchId ? 'stockBatchId-error' : undefined"
                @blur="validateField('stockBatchId', form.stockBatchId)"
              >
                <option value="">Seleziona confezione</option>
                <option v-for="batch in stockBatches" :key="batch.id" :value="batch.id">
                  {{ batchLabel(batch) }}
                </option>
              </select>
              <span v-if="errors.stockBatchId" id="stockBatchId-error" class="error-message" role="alert">
                {{ errors.stockBatchId }}
              </span>
            </label>

            <label>
              Tipo movimento
              <select
                v-model="form.tipoMovimento"
                :disabled="saving"
                :aria-invalid="!!errors.tipoMovimento"
                :aria-describedby="errors.tipoMovimento ? 'tipoMovimento-error' : undefined"
                @blur="validateField('tipoMovimento', form.tipoMovimento)"
              >
                <option value="carico">Carico</option>
                <option value="scarico">Scarico</option>
                <option value="somministrazione">Somministrazione</option>
                <option value="correzione">Correzione</option>
              </select>
              <span v-if="errors.tipoMovimento" id="tipoMovimento-error" class="error-message" role="alert">
                {{ errors.tipoMovimento }}
              </span>
            </label>

            <ValidatedInput
              v-model="form.quantita"
              field-name="quantita"
              label="Quantita"
              type="number"
              :error="errors.quantita"
              :required="true"
              :disabled="saving"
              @validate="(field, value) => validateField(field, value)"
            />

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

            <ValidatedInput
              v-model="form.note"
              field-name="note"
              label="Note"
              type="text"
              placeholder="Dettaglio operativo"
              :error="errors.note"
              :disabled="saving"
              @validate="(field, value) => validateField(field, value)"
            />

            <button :disabled="saving || !canCreateMovement || hasErrors" @click="saveMovement">
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
