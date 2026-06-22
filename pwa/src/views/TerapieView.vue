<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
// --- Keyboard Shortcuts (Scorciatoie da tastiera) ---
function handleKeyboardShortcut(event) {
  const tag = (event.target?.tagName || '').toLowerCase()
  const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'
  if (event.key === '/') {
    if (isInput) return
    event.preventDefault()
    const searchInput = document.querySelector('input[placeholder="Cerca per ospite, farmaco, dose o note"]')
    if (searchInput) searchInput.focus()
  }
  if (isInput) return
  if (event.key === 'n' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    openAddForm()
  }
  // Salva (form attivo)
  if ((event.key === 's' && (event.ctrlKey || event.metaKey)) && isFormOpen.value) {
    event.preventDefault()
    handleSave()
  }
  // Elimina selezionato
  if (event.key === 'd' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    if (selectedCount.value > 0) deleteSelectedTherapies()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyboardShortcut)
  stopResidenzaWatch = watch(residenzaId, () => { void loadData() })
  void loadData()
  markFormSnapshot()
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardShortcut)
  if (stopResidenzaWatch) stopResidenzaWatch()
})
import { db } from '../db'
import { useAuth } from '../services/auth'
import { deactivateTherapyRecord, restoreTherapyRecord, upsertTherapy } from '../services/terapie'
import { confirmDeactivateTherapy, confirmDeleteMultiple } from '../services/confirmations'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'
import CrudFilterBar from '../components/CrudFilterBar.vue'
import { useSelection } from '../composables/useSelection'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { useUnsavedChangesGuard } from '../composables/useUnsavedChangesGuard'
import { useUndoDelete } from '../composables/useUndoDelete'
import UndoDeleteBanner from '../components/UndoDeleteBanner.vue'
import { useSessionViewState } from '../composables/useSessionViewState'
import { useCurrentResidenza } from '../composables/useCurrentResidenza'

const { currentUser } = useAuth()
const route = useRoute()
const { goToHelpSection } = useHelpNavigation()
const { pendingUndo, scheduleUndo, executeUndo } = useUndoDelete(10_000)
const { residenzaId } = useCurrentResidenza()
let stopResidenzaWatch = null

const {
  errors,
  validateField,
  validateForm,
  clearErrors,
  hasErrors,
} = useFormValidation({
  hostId: { required: true },
  drugId: { required: true },
  dosePerSomministrazione: { required: true },
  somministrazioniGiornaliere: { required: true },
  dataInizio: { required: true, date: true },
  dataFine: { date: true, futureDate: true },
  note: { maxLength: 500 },
}, {
  hostId: 'Ospite',
  drugId: 'Farmaco',
  dosePerSomministrazione: 'Dose per somministrazione',
  somministrazioniGiornaliere: 'Somministrazioni giornaliere',
  dataInizio: 'Data inizio',
  dataFine: 'Data fine',
  note: 'Note',
})

const hosts = ref([])
const drugs = ref([])
const therapies = ref([])
const batches = ref([])
const editingTherapyId = ref(null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const isFormOpen = ref(false)
const panelMode = ref('list')
const filterQuery = ref('')
const sortBy = ref('updatedDesc')
const formSnapshot = ref('')

const BLANK_ORARI = ['', '', '', '', '', '']
const form = ref({
  hostId: '',
  drugId: '',
  stockBatchId: '',
  dosePerSomministrazione: '',
  somministrazioniGiornaliere: '',
  orariSomministrazione: [...BLANK_ORARI],
  dataInizio: '',
  dataFine: '',
  note: '',
})

const canCreate = computed(() => hosts.value.length > 0 && drugs.value.length > 0)

const normalizedFilter = computed(() => filterQuery.value.trim().toLowerCase())

const filteredTherapies = computed(() => {
  const q = normalizedFilter.value
  // Filter by current residence if selected (via host.roomId)
  const hostById = new Map(hosts.value.map(h => [h.id, h]))
  const residenceFiltered = residenzaId.value
    ? therapies.value.filter(t => {
        const host = hostById.get(t.hostId)
        return host && host.roomId === residenzaId.value
      })
    : therapies.value

  const baseRows = q
    ? residenceFiltered.filter((therapy) => {
    const haystack = [
      therapy.id,
      hostLabel(therapy.hostId),
      drugLabel(therapy.drugId),
      therapy.note,
      therapy.dosePerSomministrazione,
      therapy.somministrazioniGiornaliere,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
    : residenceFiltered

  const result = [...baseRows]
  if (sortBy.value === 'host') {
    return result.sort((a, b) => hostLabel(a.hostId).localeCompare(hostLabel(b.hostId)))
  }
  if (sortBy.value === 'farmaco') {
    return result.sort((a, b) => drugLabel(a.drugId).localeCompare(drugLabel(b.drugId)))
  }
  if (sortBy.value === 'inizio') {
    return result.sort((a, b) => new Date(a.dataInizio || 0) - new Date(b.dataInizio || 0))
  }
  return result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
})

useSessionViewState('viewState:terapie', {
  filterQuery,
  sortBy,
})

function isTherapyCurrentlyActive(therapy) {
  if (!therapy || therapy.deletedAt) return false
  if (therapy.attiva === false) return false
  const now = new Date()
  const start = therapy.dataInizio ? new Date(therapy.dataInizio) : null
  const end = therapy.dataFine ? new Date(therapy.dataFine) : null
  if (start && !Number.isNaN(start.getTime()) && start > now) return false
  if (end && !Number.isNaN(end.getTime()) && end < now) return false
  return true
}

const therapiesByHost = computed(() => {
  const hostById = new Map(hosts.value.map(h => [h.id, h]))
  const grouped = new Map()
  for (const therapy of therapies.value) {
    if (!isTherapyCurrentlyActive(therapy)) continue
    // Filter by current residence if selected
    if (residenzaId.value) {
      const host = hostById.get(therapy.hostId)
      if (!host || host.roomId !== residenzaId.value) continue
    }
    const hostKey = therapy.hostId || 'host-missing'
    const entry = grouped.get(hostKey) ?? {
      hostId: hostKey,
      hostDisplay: hostLabel(hostKey),
      therapies: [],
    }
    entry.therapies.push(therapy)
    grouped.set(hostKey, entry)
  }

  return Array.from(grouped.values()).sort((a, b) => a.hostDisplay.localeCompare(b.hostDisplay))
})

const isDirty = computed(() => {
  if (!isFormOpen.value) return false
  return formSnapshot.value !== JSON.stringify({
    panelMode: panelMode.value,
    editingTherapyId: editingTherapyId.value,
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
} = useSelection(filteredTherapies)

function markFormSnapshot() {
  formSnapshot.value = JSON.stringify({
    panelMode: panelMode.value,
    editingTherapyId: editingTherapyId.value,
    form: form.value,
  })
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString()
}

function hostLabel(hostId) {
  const host = hosts.value.find(item => item.id === hostId)
  if (!host) return hostId
  const fullName = [host.nome, host.cognome].filter(Boolean).join(' ').trim()
  return fullName || host.iniziali || host.codiceInterno || hostId
}

function drugLabel(drugId) {
  const drug = drugs.value.find(item => item.id === drugId)
  if (!drug) return drugId
  return drug.nomeFarmaco || drug.principioAttivo || 'Farmaco senza nome'
}

function batchLabel(batchId) {
  if (!batchId) return '—'
  const batch = batches.value.find(b => b.id === batchId)
  if (!batch) return batchId
  return batch.nomeCommerciale || batch.id
}

const availableBatches = computed(() => {
  if (!form.value.drugId) return []
  return batches.value.filter(b => b.drugId === form.value.drugId)
})

function isActiveHost(host) {
  if (!host) return false
  if (host.deletedAt) return false
  if (host.attivo === false) return false
  return true
}

function getBlockingHostForTherapy(therapy) {
  if (!therapy?.hostId) return null
  const host = hosts.value.find(item => item.id === therapy.hostId)
  return isActiveHost(host) ? host : null
}

function therapyAssignmentLabel(therapy) {
  return `${therapy.id || 'terapia-n/d'} (ospite: ${hostLabel(therapy.hostId)})`
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [rawHosts, rawDrugs, rawTherapies, rawBatches] = await Promise.all([
      db.hosts.toArray(),
      db.drugs.toArray(),
      db.therapies.toArray(),
      db.stockBatches.toArray(),
    ])

    hosts.value = rawHosts
      .filter(row => !row.deletedAt)
      .sort((a, b) => {
        const nameA = [a.nome, a.cognome].filter(Boolean).join(' ').trim().toLowerCase()
        const nameB = [b.nome, b.cognome].filter(Boolean).join(' ').trim().toLowerCase()
        return nameA.localeCompare(nameB)
      })

    drugs.value = rawDrugs
      .filter(row => !row.deletedAt)
      .sort((a, b) => (a.principioAttivo || a.id).localeCompare(b.principioAttivo || b.id))

    batches.value = rawBatches
      .filter(row => !row.deletedAt)
      .sort((a, b) => (a.nomeCommerciale || a.id).localeCompare(b.nomeCommerciale || b.id))

    therapies.value = rawTherapies
      .filter(row => !row.deletedAt)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  } catch (err) {
    errorMessage.value = `Errore caricamento terapie: ${err.message}`
  } finally {
    loading.value = false
  }

  // Apply ospite filter from query param (e.g., ?ospite=HOST_ID)
  const ospiteId = String(route.query.ospite || '').trim()
  if (ospiteId) {
    const host = hosts.value.find(h => h.id === ospiteId)
    if (host) {
      filterQuery.value = [host.nome, host.cognome].filter(Boolean).join(' ').trim()
    }
  }
}

async function saveTherapy() {
  message.value = ''
  errorMessage.value = ''

  if (!validateForm(form.value)) {
    errorMessage.value = 'Correggi gli errori nel form prima di salvare.'
    return
  }

  saving.value = true
  try {
    const existing = editingTherapyId.value ? therapies.value.find(t => t.id === editingTherapyId.value) : null
    const saved = await upsertTherapy({
      existing,
      form: form.value,
      operatorId: currentUser.value?.login ?? null,
    })

    form.value = {
      hostId: '',
      drugId: '',
      stockBatchId: '',
      dosePerSomministrazione: '',
      somministrazioniGiornaliere: '',
      consumoMedioSettimanale: '',
      dataInizio: '',
      dataFine: '',
      note: '',
    }
    editingTherapyId.value = null
    message.value = existing ? 'Terapia aggiornata.' : `Terapia salvata (ID: ${saved.id}).`
    await loadData()
    isFormOpen.value = false
    panelMode.value = 'list'
    markFormSnapshot()
  } catch (err) {
    errorMessage.value = `Errore salvataggio: ${err.message}`
  } finally {
    saving.value = false
  }
}

function startEditTherapy(therapy) {
  editingTherapyId.value = therapy.id
  panelMode.value = 'edit'
  const toDateInput = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }
  form.value = {
    hostId: therapy.hostId || '',
    drugId: therapy.drugId || '',
    stockBatchId: therapy.stockBatchId || '',
    dosePerSomministrazione: therapy.dosePerSomministrazione ?? '',
    somministrazioniGiornaliere: therapy.somministrazioniGiornaliere ?? '',
    orariSomministrazione: Array.isArray(therapy.orariSomministrazione) ? [...therapy.orariSomministrazione, ...BLANK_ORARI].slice(0,6) : [...BLANK_ORARI],
    dataInizio: toDateInput(therapy.dataInizio),
    dataFine: toDateInput(therapy.dataFine),
    note: therapy.note || '',
  }
  isFormOpen.value = true
  markFormSnapshot()
}

function openAddForm() {
  resetForm()
  panelMode.value = 'create'
  isFormOpen.value = true
  markFormSnapshot()
}

function openEditForm() {
  if (selectedCount.value !== 1) return
  const selectedTherapy = getSelectedItems()[0]
  if (!selectedTherapy) return
  startEditTherapy(selectedTherapy)
}

function resetForm() {
  editingTherapyId.value = null
  panelMode.value = 'list'
  form.value = {
    hostId: '',
    drugId: '',
    stockBatchId: '',
    dosePerSomministrazione: '',
    somministrazioniGiornaliere: '',
    orariSomministrazione: [...BLANK_ORARI],
    dataInizio: '',
    dataFine: '',
    note: '',
  }
  clearErrors()
  markFormSnapshot()
}

async function deleteTherapy(therapy) {
  const blockingHost = getBlockingHostForTherapy(therapy)
  if (blockingHost) {
    message.value = ''
    errorMessage.value = `Non e' possibile eliminare la terapia ${therapyAssignmentLabel(therapy)} in quanto e' ancora assegnata a un ospite attivo. Aggiorna prima l'assegnazione.`
    return
  }

  const confirmed = await confirmDeactivateTherapy(`${hostLabel(therapy.hostId)} · ${drugLabel(therapy.drugId)}`)
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''
  try {
    const deletedTherapy = await deactivateTherapyRecord({
      therapy,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = 'Terapia eliminata.'
    if (editingTherapyId.value === therapy.id) resetForm()
    await loadData()
    scheduleUndo({
      label: `Terapia ${hostLabel(therapy.hostId)} · ${drugLabel(therapy.drugId)} eliminata.`,
      undoAction: async () => {
        await restoreTherapyRecord({
          therapy: deletedTherapy,
          operatorId: currentUser.value?.login ?? null,
        })
        message.value = 'Eliminazione annullata: terapia ripristinata.'
        await loadData()
      },
    })
  } catch (err) {
    errorMessage.value = `Errore eliminazione: ${err.message}`
  }
}

async function deleteSelectedTherapies() {
  if (selectedCount.value === 0) return

  const selectedTherapies = getSelectedItems()

  const blocked = selectedTherapies
    .filter(therapy => getBlockingHostForTherapy(therapy))
  if (blocked.length > 0) {
    const details = blocked.map(therapyAssignmentLabel).join(', ')
    message.value = ''
    errorMessage.value = `Non e' possibile eliminare una o piu' terapie in quanto ancora assegnate a ospiti attivi: ${details}. Aggiorna prima le assegnazioni.`
    return
  }

  const confirmed = await confirmDeleteMultiple(
    selectedCount.value,
    selectedCount.value === 1 ? 'terapia' : 'terapie',
  )
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    const deletedTherapies = []
    for (const therapy of selectedTherapies) {
      const deleted = await deactivateTherapyRecord({
        therapy,
        operatorId: currentUser.value?.login ?? null,
      })
      deletedTherapies.push(deleted)
    }

    if (editingTherapyId.value && selectedTherapies.some(item => item.id === editingTherapyId.value)) {
      resetForm()
    }

    clearSelection()
    message.value = selectedTherapies.length === 1
      ? 'Terapia eliminata.'
      : `${selectedTherapies.length} terapie eliminate.`
    await loadData()
    scheduleUndo({
      label: selectedTherapies.length === 1
        ? 'Terapia eliminata.'
        : `${selectedTherapies.length} terapie eliminate.`,
      undoAction: async () => {
        for (const deleted of deletedTherapies) {
          await restoreTherapyRecord({
            therapy: deleted,
            operatorId: currentUser.value?.login ?? null,
          })
        }
        message.value = selectedTherapies.length === 1
          ? 'Eliminazione annullata: terapia ripristinata.'
          : `Eliminazione annullata: ${selectedTherapies.length} terapie ripristinate.`
        await loadData()
      },
    })
  } catch (err) {
    errorMessage.value = `Errore eliminazione: ${err.message}`
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
      <h2>Terapie Attive</h2>
      <button class="help-btn" @click="goToHelpSection('terapie')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Elenco terapie attive</strong></p>
      <p class="muted" style="margin-top:.25rem">Terapie non eliminate presenti nel dataset locale.</p>
      <CrudFilterBar
        v-model="filterQuery"
        label="Filtra terapie"
        placeholder="Cerca per ospite, farmaco, dose o note"
        :visible-count="filteredTherapies.length"
        :total-count="therapies.length"
      />
      <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem;max-width:22rem">
        Ordina terapie
        <select v-model="sortBy" aria-label="Ordina terapie">
          <option value="updatedDesc">Ultima modifica</option>
          <option value="host">Ospite</option>
          <option value="farmaco">Farmaco</option>
          <option value="inizio">Data inizio</option>
        </select>
      </label>

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:.75rem">
        <button
          :disabled="!canCreate"
          :title="!canCreate ? 'Servono Ospiti e Farmaci nel dataset per creare terapie' : 'Aggiungi (Scorciatoia: N)'"
          @click="openAddForm"
        >Aggiungi</button>
        <button :disabled="selectedCount !== 1" @click="openEditForm" title="Modifica selezionata">Modifica</button>
        <button
          :disabled="selectedCount === 0"
          class="btn-danger"
          @click="deleteSelectedTherapies"
          title="Elimina selezionata (Scorciatoia: D)"
        >
          Elimina{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </button>
        <span v-if="selectedCount > 0" class="muted" style="font-size:.82rem">
          {{ selectedCount }} selezionat{{ selectedCount > 1 ? 'e' : 'a' }}.
          <button type="button" class="btn-sm btn-ghost" @click="clearSelection">Deseleziona tutto</button>
        </span>
      </div>

      <div v-if="loading" class="loading-skeleton" role="status" aria-label="Caricamento in corso">
        <div class="loading-skeleton-row"></div>
        <div class="loading-skeleton-row"></div>
        <div class="loading-skeleton-row"></div>
      </div>

      <div class="dataset-frame" style="margin-top:.75rem" v-if="!loading">
      <table class="conflict-table">
        <thead>
          <tr>
            <th style="width:2.5rem">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                aria-label="Seleziona tutte le terapie"
                @change="toggleSelectAll"
              />
            </th>
            <th>Ospite</th>
            <th>Farmaco</th>
            <th>Confezione</th>
            <th>Dose</th>
            <th>Freq./giorno</th>
            <!-- <th>Consumo sett.</th> -->
            <th>Inizio</th>
            <th>Fine</th>
            <th>Azione</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="therapy in filteredTherapies"
            :key="therapy.id"
            :style="isSelected(therapy.id) ? 'background:rgba(52, 152, 219, 0.12)' : undefined"
          >
            <td>
              <input
                type="checkbox"
                :checked="isSelected(therapy.id)"
                :aria-label="`Seleziona terapia ${hostLabel(therapy.hostId)} ${drugLabel(therapy.drugId)}`"
                @change="toggleSelection(therapy.id)"
              />
            </td>
            <td>{{ hostLabel(therapy.hostId) }}</td>
            <td>{{ drugLabel(therapy.drugId) }}</td>
            <td>{{ batchLabel(therapy.stockBatchId) }}</td>
            <td>{{ therapy.dosePerSomministrazione ?? '—' }}</td>
            <td>{{ therapy.somministrazioniGiornaliere ?? '—' }}</td>
            <!-- <td>{{ therapy.consumoMedioSettimanale ?? '—' }}</td> -->
            <td>{{ formatDate(therapy.dataInizio) }}</td>
            <td>{{ formatDate(therapy.dataFine) }}</td>
            <td>
              <button @click="startEditTherapy(therapy)">Modifica</button>
              <button class="btn-danger" @click="deleteTherapy(therapy)">Elimina</button>
            </td>
          </tr>
          <tr v-if="filteredTherapies.length === 0 && !loading">
            <td colspan="10" class="muted">
              Nessuna terapia attiva.
              <template v-if="!canCreate">⚠️ Aggiungi prima Ospiti e Farmaci dalle rispettive sezioni.</template>
              <template v-else>Premi <strong>N</strong> o clicca <strong>Aggiungi</strong> per creare la prima terapia.</template>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" role="alert">{{ errorMessage }}</p>
    </div>

    <div class="card">
      <details class="deep-panel add-panel" :open="isFormOpen" @toggle="isFormOpen = $event.target.open">
        <summary><strong>Gestione Terapie</strong></summary>

        <div style="margin-top:.75rem">
          <div class="panel-breadcrumb">
            <button type="button" class="panel-breadcrumb-link" @click="isFormOpen = false">Terapie</button>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">{{ panelMode === 'edit' ? 'Modifica' : 'Aggiungi' }}</span>
            <button type="button" class="panel-close-btn" @click="isFormOpen = false">Chiudi</button>
          </div>
          <p><strong>{{ editingTherapyId ? 'Modifica terapia' : 'Aggiungi nuova terapia' }}</strong></p>
          <p class="muted" style="margin-top:.25rem">Compila i campi minimi per registrare una terapia attiva per ospite.</p>
          <p class="muted" style="margin-top:.25rem">Dopo il salvataggio di una nuova terapia torni automaticamente alla lista.</p>

          <div class="import-form" style="margin-top:.65rem">
            <label>
              Ospite
              <select
                v-model="form.hostId"
                :disabled="saving || !hosts.length"
                @blur="validateField('hostId', form.hostId)"
                :aria-invalid="!!errors.hostId"
                :aria-describedby="errors.hostId ? 'hostId-error' : undefined"
              >
                <option value="">Seleziona ospite</option>
                <option v-for="host in hosts" :key="host.id" :value="host.id">
                  {{ hostLabel(host.id) }}
                </option>
              </select>
              <span v-if="errors.hostId" id="hostId-error" class="error-message" role="alert">
                {{ errors.hostId }}
              </span>
            </label>

            <label>
              Farmaco
              <select
                v-model="form.drugId"
                :disabled="saving || !drugs.length"
                @blur="validateField('drugId', form.drugId)"
                :aria-invalid="!!errors.drugId"
                :aria-describedby="errors.drugId ? 'drugId-error' : undefined"
              >
                <option value="">Seleziona farmaco</option>
                <option v-for="drug in drugs" :key="drug.id" :value="drug.id">
                  {{ drugLabel(drug.id) }}
                </option>
              </select>
              <span v-if="errors.drugId" id="drugId-error" class="error-message" role="alert">
                {{ errors.drugId }}
              </span>
            </label>

            <label>
              Confezione
              <select
                v-model="form.stockBatchId"
                :disabled="saving || !form.drugId"
              >
                <option value="">— qualsiasi —</option>
                <option v-for="batch in availableBatches" :key="batch.id" :value="batch.id">
                  {{ batch.nomeCommerciale || batch.id }}
                </option>
              </select>
            </label>

            <ValidatedInput
              v-model="form.dosePerSomministrazione"
              field-name="dosePerSomministrazione"
              label="Dose per somministrazione"
              type="number"
              :error="errors.dosePerSomministrazione"
              :required="true"
              @validate="validateField"
            />

            <ValidatedInput
              v-model="form.somministrazioniGiornaliere"
              field-name="somministrazioniGiornaliere"
              label="Somministrazioni giornaliere"
              type="number"
              :error="errors.somministrazioniGiornaliere"
              :required="true"
              min="1"
              max="6"
              @validate="validateField"
            />
            <div style="margin-bottom:1rem">
              <label><strong>Orari somministrazione</strong></label>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                <template v-for="idx in 6" :key="idx">
                  <input
                    type="time"
                    :disabled="idx > Math.max(1, Number(form.somministrazioniGiornaliere) || 1)"
                    v-model="form.orariSomministrazione[idx-1]"
                    style="width:6.5rem"
                    :placeholder="`Orario ${idx}`"
                  />
                </template>
              </div>
              <small class="muted">Compila almeno un orario. Solo i primi N orari sono attivi, dove N = somministrazioni giornaliere.</small>
            </div>

            <ValidatedInput
              v-model="form.dataInizio"
              field-name="dataInizio"
              label="Data inizio"
              type="date"
              :error="errors.dataInizio"
              :required="true"
              @validate="validateField"
            />

            <ValidatedInput
              v-model="form.dataFine"
              field-name="dataFine"
              label="Data fine (opzionale)"
              type="date"
              :error="errors.dataFine"
              @validate="validateField"
            />

            <ValidatedInput
              v-model="form.note"
              field-name="note"
              label="Note terapia (dettagli somministrazione)"
              :error="errors.note"
              placeholder="Es: a stomaco vuoto prima del pasto"
              @validate="validateField"
            />

            <button :disabled="saving || !canCreate || hasErrors" @click="saveTherapy">
              {{ saving ? 'Salvataggio...' : (editingTherapyId ? 'Salva modifica' : 'Salva terapia') }}
            </button>
            <button type="button" :disabled="saving" @click="() => { resetForm(); isFormOpen = false }">Annulla</button>
          </div>

          <p v-if="!canCreate" class="muted" style="margin-top:.5rem;font-size:.85rem;background:#fff3cd;padding:.5rem;border-radius:6px;border:1px solid #f2d09a;color:#6b3b0a">
            ⚠️ Per creare una terapia servono almeno un <strong>Ospite</strong> e un <strong>Farmaco</strong> nel dataset.
            <br />Vai su <RouterLink to="/ospiti">Ospiti</RouterLink> e <RouterLink to="/farmaci">Farmaci</RouterLink> per inserirli.
          </p>
        </div>
      </details>
    </div>

    <div class="card">
      <p><strong>Somministrazioni attive per ospite</strong></p>
      <p class="muted" style="margin-top:.25rem">Vista operativa per ospite con dettaglio terapia attiva.</p>

      <div style="margin-top:.75rem;border:1px solid var(--line);border-radius:.5rem;background:#fff;max-height:22rem;overflow:auto">
        <table class="conflict-table">
          <thead>
            <tr>
              <th>Ospite</th>
              <th>Farmaco</th>
              <th>Dose</th>
              <th>Freq./giorno</th>
              <th>Dettagli somministrazione</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in therapiesByHost" :key="group.hostId">
              <tr v-for="(therapy, idx) in group.therapies" :key="therapy.id">
                <td>{{ idx === 0 ? group.hostDisplay : '↳' }}</td>
                <td>{{ drugLabel(therapy.drugId) }}</td>
                <td>{{ therapy.dosePerSomministrazione ?? '—' }}</td>
                <td>{{ therapy.somministrazioniGiornaliere ?? '—' }}</td>
                <td>{{ therapy.note || therapy.notaTerapia || '—' }}</td>
              </tr>
            </template>
            <tr v-if="therapiesByHost.length === 0">
              <td colspan="5" class="muted">Nessuna somministrazione attiva disponibile.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UndoDeleteBanner
      v-if="pendingUndo"
      :label="pendingUndo.label"
      :timeout="10000"
      @undo="executeUndo"
      @close="pendingUndo = null"
    />
  </div>
</template>
