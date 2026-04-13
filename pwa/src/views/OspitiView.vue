<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuth } from '../services/auth'
import { buildHostRows, createHost, deleteHost, formatHostDisplay, restoreHost, updateHost } from '../services/ospiti'
import { getRoomsWithBeds } from '../services/stanze'
import { confirmDeleteHost, confirmDeleteMultiple } from '../services/confirmations'
import { useFormValidation } from '../services/formValidation'
import ValidatedInput from '../components/ValidatedInput.vue'
import CrudFilterBar from '../components/CrudFilterBar.vue'
import { useSelection } from '../composables/useSelection'
import { db } from '../db'
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
  nome: { required: true, minLength: 2, maxLength: 50 },
  cognome: { required: true, minLength: 2, maxLength: 50 },
  dataNascita: { date: true },
  codiceFiscale: {
    pattern: '^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$',
  },
  roomId: { required: true },
}, {
  nome: 'Nome',
  cognome: 'Cognome',
  dataNascita: 'Data di nascita',
  codiceFiscale: 'Codice fiscale',
  roomId: 'Stanza',
})

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const allHosts = ref([])
const therapies = ref([])
const roomsData = ref([])
const showAll = ref(false)
const editingHostId = ref(null)
const isFormOpen = ref(false)
const panelMode = ref('list')
const filterQuery = ref('')
const formSnapshot = ref('')

const form = ref({
    codiceInterno: '',
    iniziali: '',
  nome: '',
  cognome: '',
  luogoNascita: '',
  dataNascita: '',
  sesso: '',
  codiceFiscale: '',
  patologie: '',
    roomId: '',
    bedId: '',
    note: '',
})

const rows = computed(() => buildHostRows({
    hosts: allHosts.value,
    therapies: therapies.value,
    showAll: showAll.value,
    rooms: roomsData.value,
}))

const normalizedFilter = computed(() => filterQuery.value.trim().toLowerCase())

const filteredRows = computed(() => {
  const q = normalizedFilter.value
  if (!q) return rows.value
  return rows.value.filter((host) => {
    const haystack = [
      host.id,
      host.codiceInterno,
      host.iniziali,
      host.nome,
      host.cognome,
      host.stanza,
      host.letto,
      formatHostDisplay(host),
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const isDirty = computed(() => {
  if (!isFormOpen.value) return false
  return formSnapshot.value !== JSON.stringify({
    panelMode: panelMode.value,
    editingHostId: editingHostId.value,
    form: form.value,
  })
})

useUnsavedChangesGuard(isDirty)

const canCreate = computed(() => ((form.value.nome || '').trim() || (form.value.cognome || '').trim() || form.value.codiceInterno.trim() || form.value.iniziali.trim()))
const canSave = computed(() => ((form.value.nome || '').trim() || (form.value.cognome || '').trim() || form.value.codiceInterno.trim() || form.value.iniziali.trim()))

const availableBeds = computed(() => {
    const room = roomsData.value.find(r => r.id === form.value.roomId)
    return room?.beds ?? []
})

const {
  selectedItems,
  allSelected,
  someSelected,
  selectedCount,
  toggleSelection,
  toggleSelectAll,
  clearSelection,
  isSelected,
  getSelectedItems,
} = useSelection(filteredRows)

function markFormSnapshot() {
  formSnapshot.value = JSON.stringify({
    panelMode: panelMode.value,
    editingHostId: editingHostId.value,
    form: form.value,
  })
}

async function loadData() {
    loading.value = true
    errorMessage.value = ''
    try {
        const [rawHosts, rawTherapies, rooms] = await Promise.all([
            db.hosts.toArray(),
            db.therapies.toArray(),
            getRoomsWithBeds(),
        ])
        allHosts.value = rawHosts
        therapies.value = rawTherapies
        roomsData.value = rooms
    } catch (err) {
        errorMessage.value = `Errore caricamento: ${err.message}`
    } finally {
        loading.value = false
    }
}

async function handleSave() {
    message.value = ''
    errorMessage.value = ''

    const formData = {
      ...form.value,
      roomId: roomsData.value.length ? form.value.roomId : 'room-not-required',
    }

    if (!validateForm(formData)) {
      errorMessage.value = 'Correggi gli errori nel form prima di salvare.'
      return
    }

    saving.value = true
    try {
        const roomId = form.value.roomId || null
        const bedId = form.value.bedId || null
        const room = roomId ? roomsData.value.find(r => r.id === roomId) : null
        const bed = bedId ? room?.beds.find(b => b.id === bedId) : null

        if (editingHostId.value) {
          await updateHost({
            hostId: editingHostId.value,
            codiceInterno: form.value.codiceInterno,
            iniziali: form.value.iniziali,
            nome: form.value.nome,
            cognome: form.value.cognome,
            luogoNascita: form.value.luogoNascita,
            dataNascita: form.value.dataNascita,
            sesso: form.value.sesso,
            codiceFiscale: form.value.codiceFiscale,
            patologie: form.value.patologie,
            roomId,
            bedId,
            stanza: room?.codice || '',
            letto: bed?.numero || '',
            note: form.value.note,
            operatorId: currentUser.value?.login ?? null,
          })
          message.value = `Ospite "${editingHostId.value}" aggiornato.`
        } else {
          const created = await createHost({
            codiceInterno: form.value.codiceInterno,
            iniziali: form.value.iniziali,
            nome: form.value.nome,
            cognome: form.value.cognome,
            luogoNascita: form.value.luogoNascita,
            dataNascita: form.value.dataNascita,
            sesso: form.value.sesso,
            codiceFiscale: form.value.codiceFiscale,
            patologie: form.value.patologie,
            roomId,
            bedId,
            stanza: room?.codice || '',
            letto: bed?.numero || '',
            note: form.value.note,
            operatorId: currentUser.value?.login ?? null,
          })
          message.value = `Ospite "${created.id}" creato.`
        }
        resetForm()
        isFormOpen.value = false
        markFormSnapshot()
        await loadData()
    } catch (err) {
        errorMessage.value = `Errore: ${err.message}`
    } finally {
        saving.value = false
    }
}

async function handleDeactivate(hostId) {
    const host = allHosts.value.find(h => h.id === hostId)
    const hostName = formatHostDisplay(host)
    
    const confirmed = await confirmDeleteHost(hostName)
    if (!confirmed) return
    
    message.value = ''
    errorMessage.value = ''
    try {
        const deletedHost = await deleteHost({ hostId, operatorId: currentUser.value?.login ?? null })
        if (editingHostId.value === hostId) {
          resetForm()
        }
        clearSelection()
        message.value = `Ospite "${hostId}" eliminato.`
        await loadData()
        scheduleUndo({
          label: `Ospite "${hostName}" eliminato.`,
          undoAction: async () => {
            await restoreHost({
              hostId: deletedHost.id,
              existing: deletedHost,
              operatorId: currentUser.value?.login ?? null,
            })
            message.value = 'Eliminazione annullata: ospite ripristinato.'
            await loadData()
          },
        })
    } catch (err) {
        errorMessage.value = `Errore: ${err.message}`
    }
}

function openAddForm() {
  resetForm()
  panelMode.value = 'create'
  isFormOpen.value = true
  markFormSnapshot()
}

function openEditForm() {
  if (selectedCount.value !== 1) return
  const selectedHost = getSelectedItems()[0]
  if (!selectedHost) return
  startEdit(selectedHost)
  isFormOpen.value = true
}

async function deleteSelectedHosts() {
  if (selectedCount.value === 0) return

  const selectedHosts = getSelectedItems()
  const confirmed = await confirmDeleteMultiple(
    selectedCount.value,
    selectedCount.value === 1 ? 'ospite' : 'ospiti',
  )
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    const deletedHosts = []
    for (const host of selectedHosts) {
      const deleted = await deleteHost({
        hostId: host.id,
        operatorId: currentUser.value?.login ?? null,
      })
      deletedHosts.push(deleted)
    }

    if (editingHostId.value && selectedHosts.some(host => host.id === editingHostId.value)) {
      resetForm()
    }

    clearSelection()
    message.value = selectedHosts.length === 1
      ? `Ospite "${selectedHosts[0].id}" eliminato.`
      : `${selectedHosts.length} ospiti eliminati.`
    await loadData()
    scheduleUndo({
      label: selectedHosts.length === 1
        ? `Ospite "${formatHostDisplay(selectedHosts[0])}" eliminato.`
        : `${selectedHosts.length} ospiti eliminati.`,
      undoAction: async () => {
        for (const deleted of deletedHosts) {
          await restoreHost({
            hostId: deleted.id,
            existing: deleted,
            operatorId: currentUser.value?.login ?? null,
          })
        }
        message.value = selectedHosts.length === 1
          ? 'Eliminazione annullata: ospite ripristinato.'
          : `Eliminazione annullata: ${selectedHosts.length} ospiti ripristinati.`
        await loadData()
      },
    })
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  }
}

function startEdit(host) {
  editingHostId.value = host.id
  panelMode.value = 'edit'
  form.value = {
    codiceInterno: host.codiceInterno || '',
    iniziali: host.iniziali || '',
    nome: host.nome || '',
    cognome: host.cognome || '',
    luogoNascita: host.luogoNascita || '',
    dataNascita: host.dataNascita || '',
    sesso: host.sesso || '',
    codiceFiscale: host.codiceFiscale || '',
    patologie: host.patologie || '',
    roomId: host.roomId || '',
    bedId: host.bedId || '',
    note: host.note || '',
  }
  isFormOpen.value = true
  markFormSnapshot()
}

function resetForm() {
  editingHostId.value = null
  panelMode.value = 'list'
    form.value = {
      codiceInterno: '',
      iniziali: '',
      nome: '',
      cognome: '',
      luogoNascita: '',
      dataNascita: '',
      sesso: '',
      codiceFiscale: '',
      patologie: '',
      roomId: '',
      bedId: '',
      note: '',
    }
  clearErrors()
  markFormSnapshot()
}

onMounted(() => {
  void loadData()
  markFormSnapshot()
})
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Ospiti</h2>
      <button class="help-btn" @click="goToHelpSection('ospiti')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Lista ospiti</strong></p>
      <CrudFilterBar
        v-model="filterQuery"
        label="Filtra ospiti"
        placeholder="Cerca per nome, cognome, codice, iniziali o stanza"
        :visible-count="filteredRows.length"
        :total-count="rows.length"
      />
      <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem">
        <input v-model="showAll" type="checkbox" />
        Mostra anche disattivati
      </label>

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        <button @click="openAddForm">Aggiungi</button>
        <button :disabled="selectedCount !== 1" @click="openEditForm">Modifica</button>
        <button
          :disabled="selectedCount === 0"
          style="background:#d35f55"
          @click="deleteSelectedHosts"
        >
          Elimina{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </button>
      </div>

      <p v-if="selectedCount > 0" class="muted" style="margin-top:.55rem">
        {{ selectedCount }} ospite{{ selectedCount > 1 ? 'i' : '' }} selezionat{{ selectedCount > 1 ? 'i' : 'o' }}.
        <button type="button" style="margin-left:.4rem" @click="clearSelection">Deseleziona tutto</button>
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
                aria-label="Seleziona tutti gli ospiti"
                @change="toggleSelectAll"
              />
            </th>
            <th>Ospite</th>
            <th>Codice</th>
            <th>Iniziali</th>
            <th>Nome</th>
            <th>Cognome</th>
            <th>Stanza/Letto</th>
            <th>Terapie attive</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="host in filteredRows"
            :key="host.id"
            :style="isSelected(host.id) ? 'background:rgba(52, 152, 219, 0.12)' : undefined"
          >
            <td>
              <input
                type="checkbox"
                :checked="isSelected(host.id)"
                :aria-label="`Seleziona ${formatHostDisplay(host)}`"
                @change="toggleSelection(host.id)"
              />
            </td>
            <td>{{ formatHostDisplay(host) }}</td>
            <td>{{ host.codiceInterno || '—' }}</td>
            <td>{{ host.iniziali || '—' }}</td>
            <td>{{ host.nome || '—' }}</td>
            <td>{{ host.cognome || '—' }}</td>
            <td>{{ host.stanza }}{{ host.letto ? '/' + host.letto : '' }}</td>
            <td>{{ host.activeTherapies }}</td>
            <td>
              <button
                style="padding:.2rem .55rem;font-size:.8rem;margin-right:.35rem"
                @click="startEdit(host)"
              >
                Modifica
              </button>
              <button
                style="padding:.2rem .55rem;font-size:.8rem;background:#d35f55"
                @click="handleDeactivate(host.id)"
              >
                Elimina
              </button>
            </td>
          </tr>
          <tr v-if="filteredRows.length === 0 && !loading">
            <td colspan="9" class="muted">Nessun ospite disponibile.</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p v-if="loading" class="muted" style="margin-top:.55rem">Caricamento...</p>
    </div>

    <div class="card">
      <details class="deep-panel add-panel" :open="isFormOpen" @toggle="isFormOpen = $event.target.open">
        <summary><strong>Gestione Ospiti</strong></summary>

        <div style="margin-top:.75rem">
          <div class="panel-breadcrumb">
            <button type="button" class="panel-breadcrumb-link" @click="isFormOpen = false">Ospiti</button>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">{{ panelMode === 'edit' ? 'Modifica' : 'Aggiungi' }}</span>
            <button type="button" class="panel-close-btn" @click="isFormOpen = false">Chiudi</button>
          </div>
          <p><strong>{{ editingHostId ? 'Modifica ospite' : 'Aggiungi nuovo ospite' }}</strong></p>
          <p class="muted" style="margin-top:.25rem">
            Pannello guidato: compila i dati essenziali e salva per tornare subito alla lista ospiti.
          </p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Codice interno
              <input v-model="form.codiceInterno" type="text" placeholder="Codice operativo" />
            </label>
            <label>
              Iniziali
              <input v-model="form.iniziali" type="text" placeholder="M.R." />
            </label>
            <ValidatedInput
              v-model="form.nome"
              field-name="nome"
              label="Nome"
              :error="errors.nome"
              :required="true"
              placeholder="Mario"
              @validate="validateField"
            />
            <ValidatedInput
              v-model="form.cognome"
              field-name="cognome"
              label="Cognome"
              :error="errors.cognome"
              :required="true"
              placeholder="Rossi"
              @validate="validateField"
            />
            <label>
              Luogo di nascita
              <input v-model="form.luogoNascita" type="text" placeholder="Roma" />
            </label>
            <ValidatedInput
              v-model="form.dataNascita"
              field-name="dataNascita"
              label="Data di nascita"
              type="date"
              :error="errors.dataNascita"
              @validate="validateField"
            />
            <label>
              Sesso
              <select v-model="form.sesso">
                <option value="">Seleziona</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Altro">Altro</option>
              </select>
            </label>
            <ValidatedInput
              v-model="form.codiceFiscale"
              field-name="codiceFiscale"
              label="Codice fiscale"
              :error="errors.codiceFiscale"
              placeholder="RSSMRA80A01H501U"
              @validate="(field, value) => validateField(field, String(value || '').toUpperCase())"
            />
            <label>
              Patologie
              <input v-model="form.patologie" type="text" placeholder="Patologie o note cliniche" />
            </label>
            <label>
              Stanza
              <select
                v-model="form.roomId"
                :disabled="!roomsData.length || saving"
                @blur="validateField('roomId', roomsData.length ? form.roomId : 'room-not-required')"
                :aria-invalid="!!errors.roomId"
                :aria-describedby="errors.roomId ? 'roomId-error' : undefined"
              >
                <option value="">Seleziona stanza</option>
                <option v-for="room in roomsData.filter(r => !r.deletedAt)" :key="room.id" :value="room.id">
                  {{ room.codice }}
                </option>
              </select>
              <span v-if="errors.roomId" id="roomId-error" class="error-message" role="alert">
                {{ errors.roomId }}
              </span>
            </label>
            <label>
              Letto
              <select v-model="form.bedId" :disabled="!form.roomId || !availableBeds.length || saving">
                <option value="">Seleziona letto (opzionale)</option>
                <option v-for="bed in availableBeds" :key="bed.id" :value="bed.id">
                  Letto {{ bed.numero }}
                </option>
              </select>
            </label>
            <label>
              Note
              <input v-model="form.note" type="text" placeholder="Note opzionali" />
            </label>
            <button :disabled="saving || !canSave || hasErrors" @click="handleSave">
              {{ saving ? 'Salvataggio...' : (editingHostId ? 'Salva modifica' : 'Salva ospite') }}
            </button>
            <button type="button" :disabled="saving" @click="() => { resetForm(); isFormOpen = false }">
              Annulla
            </button>
          </div>
        </div>
      </details>
    </div>

    <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
    <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>

    <div v-if="pendingUndo" class="undo-banner" role="status" aria-live="polite">
      <span>{{ pendingUndo.label }}</span>
      <button type="button" @click="executeUndo">Annulla eliminazione</button>
    </div>
  </div>
</template>
