<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useKeyboardShortcuts, shortcutHint } from '../composables/useKeyboardShortcuts'
import { db } from '../db'
import { dataReady } from '../services/seedData'
import { useAuth } from '../services/auth'
import { restoreMovement, softDeleteMovement, upsertMovement } from '../services/movimenti'
import { confirmDeleteMovement, confirmDeleteMultiple } from '../services/confirmations'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'
import CrudFilterBar from '../components/CrudFilterBar.vue'
import { useSelection } from '../composables/useSelection'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { useUnsavedChangesGuard } from '../composables/useUnsavedChangesGuard'
import { useUndoDelete } from '../composables/useUndoDelete'
import UndoDeleteBanner from '../components/UndoDeleteBanner.vue'
import { useSessionViewState } from '../composables/useSessionViewState'
import { canRole } from '../services/rbac'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const { pendingUndo, scheduleUndo, executeUndo } = useUndoDelete(10_000)

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
const isFormOpen = ref(false)
const continuaDopoSalvataggio = ref(false)
const sessionMovementCount = ref(0)
const lastSavedMovementLabel = ref('')

useKeyboardShortcuts({
  searchPlaceholder: 'Cerca per tipo, causale, confezione, ospite o note',
  onNew: () => openAddForm(),
  onSave: () => { if (isFormOpen.value) saveMovement() },
  onDelete: () => { if (selectedCount.value > 0 && canDeleteMovements.value) deleteSelectedMovements() },
  isFormOpen,
})

onMounted(() => {
  form.value.dataMovimento = toLocalDateTimeInput()
  void loadData()
  markFormSnapshot()
})

// Reload when demo data or other bulk changes occur
onUnmounted(() => { window.removeEventListener('medi-trace:data-changed', handleDataChanged) })
function handleDataChanged() { console.log('[MovimentiView] data-changed event, reloading...'); void loadData() }
window.addEventListener('medi-trace:data-changed', handleDataChanged)

const panelMode = ref('list')
const filterQuery = ref('')
const sortBy = ref('dataDesc')
const formSnapshot = ref('')
const showSearchPanel = ref(false)
const searchType = ref('')
const searchDateFrom = ref('')
const searchDateTo = ref('')
const searchHostId = ref('')
const searchDrugId = ref('')

const form = ref({
  stockBatchId: '',
  tipoMovimento: 'scarico',
  quantita: '',
  dataMovimento: '',
  hostId: '',
  therapyId: '',
  causale: '',
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
  causale: { maxLength: 200 },
  note: { maxLength: 500 },
}, {
  stockBatchId: 'Confezione',
  tipoMovimento: 'Tipo movimento',
  quantita: 'Quantita',
  causale: 'Causale',
  note: 'Note',
})

const canCreateMovement = computed(() => {
  return stockBatches.value.length > 0 && Number(form.value.quantita || 0) > 0
})

const canDeleteMovements = computed(() => canRole(currentUser.value?.role, 'movements:delete'))

const normalizedFilter = computed(() => filterQuery.value.trim().toLowerCase())

const filteredMovements = computed(() => {
  const q = normalizedFilter.value
  let baseRows = q
    ? movements.value.filter((movement) => {
    const batch = stockBatches.value.find((item) => item.id === movement.stockBatchId)
    const haystack = [
      movement.id,
      movement.tipoMovimento,
      movement.causale,
      movement.note,
      movement.quantita,
      batchLabel(batch),
      hostLabel(movement.hostId),
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
    : movements.value

  // Advanced search filters
  if (searchType.value) {
    baseRows = baseRows.filter(m => m.tipoMovimento === searchType.value || m.type === searchType.value)
  }
  if (searchDateFrom.value) {
    const from = new Date(searchDateFrom.value)
    baseRows = baseRows.filter(m => {
      const d = new Date(m.dataMovimento || m.updatedAt || 0)
      return d >= from
    })
  }
  if (searchDateTo.value) {
    const to = new Date(searchDateTo.value)
    to.setHours(23, 59, 59, 999)
    baseRows = baseRows.filter(m => {
      const d = new Date(m.dataMovimento || m.updatedAt || 0)
      return d <= to
    })
  }
  if (searchHostId.value) {
    baseRows = baseRows.filter(m => m.hostId === searchHostId.value)
  }
  if (searchDrugId.value) {
    baseRows = baseRows.filter(m => {
      const batch = stockBatches.value.find(b => b.id === m.stockBatchId)
      return batch?.drugId === searchDrugId.value
    })
  }

  const result = [...baseRows]
  if (sortBy.value === 'dataAsc') {
    return result.sort((a, b) => new Date(a.dataMovimento || a.updatedAt || 0) - new Date(b.dataMovimento || b.updatedAt || 0))
  }
  if (sortBy.value === 'confezione') {
    return result.sort((a, b) => batchLabel(stockBatches.value.find((item) => item.id === a.stockBatchId)).localeCompare(batchLabel(stockBatches.value.find((item) => item.id === b.stockBatchId))))
  }
  if (sortBy.value === 'quantita') {
    return result.sort((a, b) => Number(b.quantita || 0) - Number(a.quantita || 0))
  }
  return result.sort((a, b) => new Date(b.dataMovimento || b.updatedAt || 0) - new Date(a.dataMovimento || a.updatedAt || 0))
})

useSessionViewState('viewState:movimenti', {
  filterQuery,
  sortBy,
})

const isDirty = computed(() => {
  if (!isFormOpen.value) return false
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
  return parsed.toLocaleString('it-IT', { hour12: false })
}

function drugLabel(drugId) {
  const item = drugs.value.find((drug) => drug.id === drugId)
  if (!item) return 'Farmaco non disponibile'
  return item.nomeFarmaco || item.principioAttivo || 'Farmaco senza nome'
}

function batchLabel(batch, showStock = false) {
  if (!batch) return '—'
  const drugName = drugLabel(batch.drugId)
  const commercialName = batch.nomeCommerciale || 'Confezione'
  const dosage = batch.dosaggio ? ` (${batch.dosaggio})` : ''
  const unit = batch.unitaMisura ? ` [${batch.unitaMisura}]` : ''
  const stock = showStock && batch.quantitaAttuale !== undefined ? ` — disp: ${batch.quantitaAttuale}` : ''
  return `${drugName} - ${commercialName}${dosage}${unit}${stock}`
}

const selectedBatchUnit = computed(() => {
  const batch = stockBatches.value.find(b => b.id === form.value.stockBatchId)
  return batch?.unitaMisura || ''
})

const selectedBatchStock = computed(() => {
  const batch = stockBatches.value.find(b => b.id === form.value.stockBatchId)
  if (!batch || batch.quantitaAttuale === undefined || batch.quantitaAttuale === null) return null
  return Number(batch.quantitaAttuale)
})

function hostLabel(hostId) {
  if (!hostId) return '—'
  const host = hosts.value.find((item) => item.id === hostId)
  if (!host) return 'Ospite non disponibile'
  const fullName = [host.nome, host.cognome].filter(Boolean).join(' ').trim()
  return fullName || host.iniziali || host.codiceInterno || hostId
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
    await dataReady
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

    if (continuaDopoSalvataggio.value && !existing) {
      // Batch mode: keep form open, only clear quantity + causale
      form.value.quantita = ''
      form.value.causale = ''
      form.value.note = ''
      sessionMovementCount.value++
      lastSavedMovementLabel.value = `${form.value.tipoMovimento} — ${batchLabel(selectedBatch)} (${quantity})`
      message.value = `Registrato (#${sessionMovementCount.value}): ${lastSavedMovementLabel.value}`
      editingMovementId.value = null
      await loadData()
      markFormSnapshot()
    } else {
      form.value = {
        stockBatchId: '',
        tipoMovimento: 'scarico',
        quantita: '',
        dataMovimento: toLocalDateTimeInput(),
        hostId: '',
        therapyId: '',
        causale: '',
        note: '',
      }
      editingMovementId.value = null
      sessionMovementCount.value = 0

      message.value = existing ? 'Movimento aggiornato.' : `Movimento registrato (ID: ${saved.id}).`
      await loadData()
      isFormOpen.value = false
      panelMode.value = 'list'
      markFormSnapshot()
    }
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
    causale: movement.causale || '',
    note: movement.note || '',
  }
  panelMode.value = 'edit'
  isFormOpen.value = true
  markFormSnapshot()
}

function openEditForm() {
  if (selectedCount.value !== 1) return
  const selectedMovement = getSelectedItems()[0]
  if (!selectedMovement) return
  startEditMovement(selectedMovement)
  panelMode.value = 'edit'
  isFormOpen.value = true
}

function openAddForm() {
  resetForm()
  panelMode.value = 'create'
  isFormOpen.value = true
}

function resetForm() {
  editingMovementId.value = null
  panelMode.value = 'list'
  sessionMovementCount.value = 0
  lastSavedMovementLabel.value = ''
  form.value = {
    stockBatchId: '',
    tipoMovimento: 'scarico',
    quantita: '',
    dataMovimento: toLocalDateTimeInput(),
    hostId: '',
    therapyId: '',
    causale: '',
    note: '',
  }
  clearErrors()
  markFormSnapshot()
}

async function deleteMovement(movement) {
  if (!canDeleteMovements.value) {
    errorMessage.value = 'Eliminazione movimenti consentita solo agli amministratori.'
    return
  }
  const batch = stockBatches.value.find(b => b.id === movement.stockBatchId)
  const movementLabel = `${movement.tipoMovimento || movement.type} - ${batchLabel(batch)} (${formatDateTime(movement.dataMovimento)})${movement.causale ? ' — ' + movement.causale : ''}`
  
  const confirmed = await confirmDeleteMovement(movementLabel)
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''
  try {
    const deletedMovement = await softDeleteMovement({
      movement,
      operatorId: currentUser.value?.login ?? null,
    })

    if (editingMovementId.value === movement.id) resetForm()
    message.value = 'Movimento eliminato.'
    await loadData()
    scheduleUndo({
      label: `Movimento "${movement.tipoMovimento || movement.type || movement.id}" eliminato.`,
      undoAction: async () => {
        await restoreMovement({
          movement: deletedMovement,
          operatorId: currentUser.value?.login ?? null,
        })
        message.value = 'Eliminazione annullata: movimento ripristinato.'
        await loadData()
      },
    })
  } catch (err) {
    errorMessage.value = `Errore eliminazione movimento: ${err.message}`
  }
}

async function deleteSelectedMovements() {
  if (!canDeleteMovements.value) {
    errorMessage.value = 'Eliminazione movimenti consentita solo agli amministratori.'
    return
  }
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
    const deletedMovements = []
    for (const movement of selectedMovements) {
      const deleted = await softDeleteMovement({
        movement,
        operatorId: currentUser.value?.login ?? null,
      })
      deletedMovements.push(deleted)
    }

    if (editingMovementId.value && selectedMovements.some(item => item.id === editingMovementId.value)) {
      resetForm()
    }

    clearSelection()
    message.value = selectedMovements.length === 1
      ? 'Movimento eliminato.'
      : `${selectedMovements.length} movimenti eliminati.`
    await loadData()
    scheduleUndo({
      label: selectedMovements.length === 1
        ? 'Movimento eliminato.'
        : `${selectedMovements.length} movimenti eliminati.`,
      undoAction: async () => {
        for (const deleted of deletedMovements) {
          await restoreMovement({
            movement: deleted,
            operatorId: currentUser.value?.login ?? null,
          })
        }
        message.value = selectedMovements.length === 1
          ? 'Eliminazione annullata: movimento ripristinato.'
          : `Eliminazione annullata: ${selectedMovements.length} movimenti ripristinati.`
        await loadData()
      },
    })
  } catch (err) {
    errorMessage.value = `Errore eliminazione movimento: ${err.message}`
  }
}
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
      <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem;max-width:22rem">
        Ordina movimenti
        <select v-model="sortBy" aria-label="Ordina movimenti">
          <option value="dataDesc">Data piu recente</option>
          <option value="dataAsc">Data meno recente</option>
          <option value="confezione">Confezione</option>
          <option value="quantita">Quantita</option>
        </select>
      </label>

      <div class="view-actions" style="margin-top:.75rem">
        <button @click="openAddForm" title="Aggiungi (Scorciatoia: N)">Aggiungi</button>
        <button :disabled="selectedCount !== 1" @click="openEditForm" title="Modifica selezionato">Modifica</button>
        <button
          :disabled="selectedCount === 0 || !canDeleteMovements"
          class="btn-danger"
          @click="deleteSelectedMovements"
          title="Elimina selezionato (Scorciatoia: D)"
        >
          Elimina{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </button>
        <button
          @click="showSearchPanel = !showSearchPanel"
          :class="{ 'btn-primary': showSearchPanel }"
          title="Cerca (Scorciatoia: /)"
        >
          {{ showSearchPanel ? 'Chiudi ricerca' : 'Cerca' }}
        </button>
      </div>

      <!-- Advanced Search Panel -->
      <div v-if="showSearchPanel" class="search-panel" style="margin-top:.75rem;padding:.75rem;border:1px solid var(--line);border-radius:.5rem;background:#f8fafd">
        <p style="margin-bottom:.55rem"><strong>Ricerca avanzata movimenti</strong></p>
        <div class="search-fields">
          <label>
            Tipo movimento
            <select v-model="searchType">
              <option value="">Tutti</option>
              <option value="carico">Carico (aggiunge)</option>
              <option value="scarico">Scarico (rimuove)</option>
              <option value="somministrazione">Somministrazione (rimuove)</option>
              <option value="correzione">Correzione (rettifica)</option>
            </select>
          </label>
          <label>
            Data da
            <input type="date" v-model="searchDateFrom" />
          </label>
          <label>
            Data a
            <input type="date" v-model="searchDateTo" />
          </label>
          <label>
            Ospite
            <select v-model="searchHostId">
              <option value="">Tutti</option>
              <option v-for="host in hosts" :key="host.id" :value="host.id">{{ hostLabel(host.id) }}</option>
            </select>
          </label>
          <label>
            Farmaco
            <select v-model="searchDrugId">
              <option value="">Tutti</option>
              <option v-for="drug in drugs" :key="drug.id" :value="drug.id">{{ drugLabel(drug.id) }}</option>
            </select>
          </label>
        </div>
        <button
          v-if="searchType || searchDateFrom || searchDateTo || searchHostId || searchDrugId"
          style="margin-top:.55rem"
          @click="searchType = ''; searchDateFrom = ''; searchDateTo = ''; searchHostId = ''; searchDrugId = ''"
        >Azzera filtri avanzati</button>
      </div>

      <p v-if="selectedCount > 0" class="muted" style="margin-top:.55rem">
        {{ selectedCount }} moviment{{ selectedCount > 1 ? 'i' : 'o' }} selezionat{{ selectedCount > 1 ? 'i' : 'o' }}.
        <button type="button" style="margin-left:.4rem" @click="clearSelection">Deseleziona tutto</button>
      </p>
      <p v-if="!canDeleteMovements" class="muted" style="margin-top:.35rem">
        Solo gli amministratori possono eliminare i movimenti.
      </p>

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table">
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
            <th>Causale</th>
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
            <td>{{ movement.causale || '—' }}</td>
            <td>{{ movement.note || '—' }}</td>
            <td>
              <button @click="startEditMovement(movement)">Modifica</button>
              <button v-if="canDeleteMovements" class="btn-danger" @click="deleteMovement(movement)">Elimina</button>
            </td>
          </tr>
          <tr v-if="filteredMovements.length === 0">
            <td colspan="9" class="muted">
              Nessun movimento registrato. Premi <strong>N</strong> o clicca <strong>Aggiungi</strong> per registrare il primo movimento.
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <div v-if="loading" class="loading-skeleton" role="status" aria-label="Aggiornamento in corso">
        <div class="loading-skeleton-row"></div>
        <div class="loading-skeleton-row"></div>
        <div class="loading-skeleton-row"></div>
      </div>
    </div>

    <div v-if="isFormOpen" class="card">
      <details class="deep-panel add-panel" open @toggle="(e) => { if (!e.target.open) isFormOpen = false }">
        <summary><strong>{{ editingMovementId ? 'Modifica movimento' : 'Nuovo movimento' }}</strong></summary>

        <div style="margin-top:.75rem">
          <div class="panel-breadcrumb">
            <button type="button" class="panel-breadcrumb-link" @click="isFormOpen = false">Movimenti</button>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">{{ panelMode === 'edit' ? 'Modifica' : 'Aggiungi' }}</span>
            <button type="button" class="panel-close-btn" @click="isFormOpen = false">Chiudi</button>
          </div>
          <p><strong>{{ editingMovementId ? 'Modifica movimento' : 'Nuovo movimento magazzino' }}</strong></p>
          <p class="muted" style="margin-top:.25rem">
            Registra carichi/scarichi operativi con tracciamento sincronizzazione e audit.
            Per aggiornamenti di fine giornata, attiva <strong>"Continua dopo il salvataggio"</strong> per registrare piu movimenti in sequenza senza uscire dal form.
          </p>
          <p class="muted" style="margin-top:.25rem">
            Dopo il salvataggio di un nuovo movimento il pannello si chiude e torni alla lista.
          </p>

          <div class="import-form" style="margin-top:.65rem">
            <label>
              Confezione (farmaco in unita)
              <select
                v-model="form.stockBatchId"
                :disabled="saving || !stockBatches.length"
                :aria-invalid="!!errors.stockBatchId"
                :aria-describedby="errors.stockBatchId ? 'stockBatchId-error' : undefined"
                @blur="validateField('stockBatchId', form.stockBatchId)"
              >
                <option value="">Seleziona confezione</option>
                <option v-for="batch in stockBatches" :key="batch.id" :value="batch.id">
                  {{ batchLabel(batch, true) }}
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
                <option value="carico">Carico (aggiunge scorte)</option>
                <option value="scarico">Scarico (rimuove scorte)</option>
                <option value="somministrazione">Somministrazione (rimuove scorte)</option>
                <option value="correzione">Correzione (rettifica scorte)</option>
              </select>
              <span v-if="errors.tipoMovimento" id="tipoMovimento-error" class="error-message" role="alert">
                {{ errors.tipoMovimento }}
              </span>
            </label>

            <ValidatedInput
              v-model="form.quantita"
              field-name="quantita"
              :label="selectedBatchUnit ? `Quantita (${selectedBatchUnit})` : 'Quantita'"
              type="number"
              :error="errors.quantita"
              :required="true"
              :disabled="saving"
              @validate="(field, value) => validateField(field, value)"
            />
            <p v-if="selectedBatchStock !== null" class="muted" style="margin-top:-.35rem;margin-bottom:.35rem">
              Disponibile: {{ selectedBatchStock }} {{ selectedBatchUnit }}.
              <span v-if="form.quantita && Number(form.quantita) > selectedBatchStock && form.tipoMovimento !== 'carico'" style="color:#c0392b">
                ⚠ Supera la scorta disponibile!
              </span>
            </p>

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
              v-model="form.causale"
              field-name="causale"
              label="Causale (motivazione)"
              type="text"
              placeholder="Es. Acquisto mensile, Reso fornitore, Rottura confezione"
              :error="errors.causale"
              :disabled="saving"
              @validate="(field, value) => validateField(field, value)"
            />

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

            <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-top:.5rem">
              <button :disabled="saving || !canCreateMovement || hasErrors" @click="saveMovement">
                {{ saving ? 'Registrazione...' : (editingMovementId ? 'Salva modifica' : 'Registra movimento') }}
              </button>
              <button type="button" :disabled="saving" @click="() => { resetForm(); isFormOpen = false }">Annulla</button>
              <label v-if="!editingMovementId" class="checkbox-label" style="display:flex;align-items:center;gap:.35rem;cursor:pointer;font-size:.9rem;user-select:none">
                <input type="checkbox" v-model="continuaDopoSalvataggio" :disabled="saving" />
                Continua dopo il salvataggio
              </label>
            </div>
            <p v-if="sessionMovementCount > 0 && !editingMovementId" class="muted" style="margin-top:.4rem">
              {{ sessionMovementCount }} moviment{{ sessionMovementCount > 1 ? 'i' : 'o' }} registrat{{ sessionMovementCount > 1 ? 'i' : 'o' }} in questa sessione.
              Ultimo: {{ lastSavedMovementLabel }}
            </p>
          </div>
        </div>
      </details>
    </div>

    <p v-if="message" class="muted" style="margin-top:.55rem">{{ message }}</p>
    <p v-if="errorMessage" class="import-error" role="alert">{{ errorMessage }}</p>

    <UndoDeleteBanner
      v-if="pendingUndo"
      :label="pendingUndo.label"
      :timeout="10000"
      @undo="executeUndo"
      @close="pendingUndo = null"
    />
  </div>
</template>
