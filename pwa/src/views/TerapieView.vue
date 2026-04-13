<script setup>
import { computed, onMounted, ref } from 'vue'
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

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const { pendingUndo, scheduleUndo, executeUndo } = useUndoDelete(10_000)

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
const editingTherapyId = ref(null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const isFormOpen = ref(false)
const panelMode = ref('list')
const filterQuery = ref('')
const formSnapshot = ref('')

const form = ref({
  hostId: '',
  drugId: '',
  dosePerSomministrazione: '',
  somministrazioniGiornaliere: '',
  consumoMedioSettimanale: '',
  dataInizio: '',
  dataFine: '',
  note: '',
})

const canCreate = computed(() => hosts.value.length > 0 && drugs.value.length > 0)

const normalizedFilter = computed(() => filterQuery.value.trim().toLowerCase())

const filteredTherapies = computed(() => {
  const q = normalizedFilter.value
  if (!q) return therapies.value
  return therapies.value.filter((therapy) => {
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
  const fullName = [host.cognome, host.nome].filter(Boolean).join(' ').trim()
  const namePart = fullName || host.iniziali || host.codiceInterno || hostId
  const visibleId = host.codiceInterno || host.id
  return `[${visibleId}] - ${namePart}`
}

function drugLabel(drugId) {
  const drug = drugs.value.find(item => item.id === drugId)
  if (!drug) return drugId
  return drug.nomeFarmaco || drug.principioAttivo || 'Farmaco senza nome'
}

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
    const [rawHosts, rawDrugs, rawTherapies] = await Promise.all([
      db.hosts.toArray(),
      db.drugs.toArray(),
      db.therapies.toArray(),
    ])

    hosts.value = rawHosts
      .filter(row => !row.deletedAt)
      .sort((a, b) => (a.codiceInterno || a.id).localeCompare(b.codiceInterno || b.id))

    drugs.value = rawDrugs
      .filter(row => !row.deletedAt)
      .sort((a, b) => (a.principioAttivo || a.id).localeCompare(b.principioAttivo || b.id))

    therapies.value = rawTherapies
      .filter(row => !row.deletedAt)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  } catch (err) {
    errorMessage.value = `Errore caricamento terapie: ${err.message}`
  } finally {
    loading.value = false
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
    dosePerSomministrazione: therapy.dosePerSomministrazione ?? '',
    somministrazioniGiornaliere: therapy.somministrazioniGiornaliere ?? '',
    consumoMedioSettimanale: therapy.consumoMedioSettimanale ?? '',
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
    dosePerSomministrazione: '',
    somministrazioniGiornaliere: '',
    consumoMedioSettimanale: '',
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

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        <button @click="openAddForm">Aggiungi</button>
        <button :disabled="selectedCount !== 1" @click="openEditForm">Modifica</button>
        <button
          :disabled="selectedCount === 0"
          style="background:#d35f55"
          @click="deleteSelectedTherapies"
        >
          Elimina{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </button>
      </div>

      <p v-if="selectedCount > 0" class="muted" style="margin-top:.55rem">
        {{ selectedCount }} terapi{{ selectedCount > 1 ? 'e' : 'a' }} selezionat{{ selectedCount > 1 ? 'e' : 'a' }}.
        <button type="button" style="margin-left:.4rem" @click="clearSelection">Deseleziona tutto</button>
      </p>

      <p v-if="loading" class="muted" style="margin-top:.5rem">Caricamento...</p>

      <div class="dataset-frame" style="margin-top:.75rem">
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
            <th>Dose</th>
            <th>Freq./giorno</th>
            <th>Consumo sett.</th>
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
            <td>{{ therapy.dosePerSomministrazione ?? '—' }}</td>
            <td>{{ therapy.somministrazioniGiornaliere ?? '—' }}</td>
            <td>{{ therapy.consumoMedioSettimanale ?? '—' }}</td>
            <td>{{ formatDate(therapy.dataInizio) }}</td>
            <td>{{ formatDate(therapy.dataFine) }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditTherapy(therapy)">Modifica</button>
              <button style="background:#d35f55" @click="deleteTherapy(therapy)">Elimina</button>
            </td>
          </tr>
          <tr v-if="filteredTherapies.length === 0 && !loading">
            <td colspan="9" class="muted">Nessuna terapia attiva disponibile.</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>
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
              @validate="validateField"
            />

            <label>
              Consumo medio settimanale
              <input v-model="form.consumoMedioSettimanale" type="number" min="0" step="0.01" />
            </label>

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
              label="Note"
              :error="errors.note"
              placeholder="Indicazioni operative"
              @validate="validateField"
            />

            <button :disabled="saving || !canCreate || hasErrors" @click="saveTherapy">
              {{ saving ? 'Salvataggio...' : (editingTherapyId ? 'Salva modifica' : 'Salva terapia') }}
            </button>
            <button type="button" :disabled="saving" @click="() => { resetForm(); isFormOpen = false }">Annulla</button>
          </div>

          <p v-if="!canCreate" class="muted" style="margin-top:.5rem;font-size:.85rem">
            Per creare terapie servono almeno un ospite e un farmaco nel dataset locale.
          </p>
        </div>
      </details>
    </div>

    <div v-if="pendingUndo" class="undo-banner" role="status" aria-live="polite">
      <span>{{ pendingUndo.label }}</span>
      <button type="button" @click="executeUndo">Annulla eliminazione</button>
    </div>
  </div>
</template>
