<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuth } from '../services/auth'
import { createRoom, createBed, updateRoom, updateBed, deactivateRoom, deactivateBed, getRoomsWithBeds, restoreRoom, restoreBed } from '../services/stanze'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { openConfirmDialog } from '../services/confirmDialog'
import { useUndoDelete } from '../composables/useUndoDelete'
import CrudFilterBar from '../components/CrudFilterBar.vue'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const { pendingUndo, scheduleUndo, executeUndo } = useUndoDelete(10_000)

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const roomsData = ref([])
const showInactive = ref(false)
const isFormOpen = ref(false)
const filterQuery = ref('')
const panelMode = ref('list')

const roomForm = ref({
  codice: '',
  note: '',
})

const roomEditForm = ref({
  id: '',
  codice: '',
  note: '',
})

const bedForm = ref({
  roomId: '',
  numero: '',
  note: '',
})

const bedEditForm = ref({
  id: '',
  roomId: '',
  numero: '',
  note: '',
})

const activeRooms = computed(() => {
  const base = roomsData.value.filter(r => !showInactive.value ? !r.deletedAt : true)
  const q = filterQuery.value.trim().toLowerCase()
  if (!q) return base
  return base.filter(r => {
    const haystack = [r.codice, r.note, ...(r.beds ?? []).map(b => String(b.numero))].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const canCreateRoom = computed(() => roomForm.value.codice.trim())

const canCreateBed = computed(() => bedForm.value.roomId && Number(bedForm.value.numero) > 0)

const canSaveRoomEdit = computed(() => roomEditForm.value.id && roomEditForm.value.codice.trim())

const canSaveBedEdit = computed(() => bedEditForm.value.id && bedEditForm.value.roomId && Number(bedEditForm.value.numero) > 0)

function formatHostLabel(host) {
  if (!host) return '—'
  const fullName = [host.cognome, host.nome].filter(Boolean).join(' ').trim()
  const displayName = fullName || host.iniziali || host.codiceInterno || host.id
  const visibleId = host.codiceInterno || host.id
  return `[${visibleId}] - ${displayName}`
}

function roomLabel(room) {
  const code = String(room?.codice || '').trim()
  return code || 'Stanza senza codice'
}

function bedLabel(bed) {
  const number = Number(bed?.numero)
  if (Number.isFinite(number) && number > 0) return `Letto ${number}`
  return 'Letto'
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    roomsData.value = await getRoomsWithBeds()
  } catch (err) {
    errorMessage.value = `Errore caricamento: ${err.message}`
  } finally {
    loading.value = false
  }
}

async function handleCreateRoom() {
  message.value = ''
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await createRoom({
      codice: roomForm.value.codice.trim(),
      note: roomForm.value.note,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = `Stanza "${created.id}" creata.`
    roomForm.value = { codice: '', note: '' }
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  } finally {
    saving.value = false
  }
}

async function handleCreateBed() {
  message.value = ''
  errorMessage.value = ''
  saving.value = true
  try {
    await createBed({
      roomId: bedForm.value.roomId,
      numero: bedForm.value.numero,
      note: bedForm.value.note,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = `Letto creato.`
    bedForm.value = { roomId: '', numero: '', note: '' }
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  } finally {
    saving.value = false
  }
}

async function handleSaveRoomEdit() {
  if (!canSaveRoomEdit.value) return
  message.value = ''
  errorMessage.value = ''
  saving.value = true
  try {
    await updateRoom({
      roomId: roomEditForm.value.id,
      codice: roomEditForm.value.codice.trim(),
      note: roomEditForm.value.note,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = 'Stanza modificata.'
    cancelRoomEdit()
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  } finally {
    saving.value = false
  }
}

async function handleSaveBedEdit() {
  if (!canSaveBedEdit.value) return
  message.value = ''
  errorMessage.value = ''
  saving.value = true
  try {
    await updateBed({
      bedId: bedEditForm.value.id,
      roomId: bedEditForm.value.roomId,
      numero: bedEditForm.value.numero,
      note: bedEditForm.value.note,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = 'Letto modificato.'
    cancelBedEdit()
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  } finally {
    saving.value = false
  }
}

async function handleDeactivateRoom(roomId) {
  const room = roomsData.value.find(item => item.id === roomId)
  const activeBeds = (room?.beds || []).filter(bed => !bed.deletedAt)
  if (activeBeds.length > 0) {
    const containedBeds = activeBeds
      .map(bed => `${bedLabel(bed)} (${bed.id})`)
      .join(', ')
    message.value = ''
    errorMessage.value = `Non e' possibile eliminare la stanza "${roomLabel(room || { codice: roomId })}" in quanto contiene ancora oggetti di tipo letto: ${containedBeds}.`
    return
  }
  const confirmed = await openConfirmDialog({
    title: 'Conferma eliminazione stanza',
    message: `Eliminare la stanza "${roomId}"?`,
    details: 'La stanza verrà disattivata e non sarà più selezionabile nelle nuove assegnazioni.',
    confirmText: 'Elimina stanza',
    cancelText: 'Annulla',
    tone: 'danger',
  })
  if (!confirmed) return
  message.value = ''
  errorMessage.value = ''
  try {
    const deletedRoom = await deactivateRoom({ roomId, operatorId: currentUser.value?.login ?? null })
    message.value = 'Stanza eliminata.'
    await loadData()
    scheduleUndo({
      label: `Stanza "${roomLabel(room || { codice: roomId })}" eliminata.`,
      undoAction: async () => {
        await restoreRoom({
          roomId: deletedRoom.id,
          existing: deletedRoom,
          operatorId: currentUser.value?.login ?? null,
        })
        message.value = 'Eliminazione annullata: stanza ripristinata.'
        await loadData()
      },
    })
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  }
}

async function handleDeactivateBed(bedId) {
  const room = roomsData.value.find(item => item.beds.some(bed => bed.id === bedId))
  const bedToDelete = room?.beds.find(bed => bed.id === bedId)
  const confirmed = await openConfirmDialog({
    title: 'Conferma eliminazione letto',
    message: `Eliminare il letto "${bedId}"?`,
    details: 'Il letto verrà disattivato e rimosso dalle assegnazioni future.',
    confirmText: 'Elimina letto',
    cancelText: 'Annulla',
    tone: 'danger',
  })
  if (!confirmed) return
  message.value = ''
  errorMessage.value = ''
  try {
    const deletedBed = await deactivateBed({ bedId, operatorId: currentUser.value?.login ?? null })
    message.value = 'Letto eliminato.'
    await loadData()
    scheduleUndo({
      label: `Letto "${bedLabel(bedToDelete || { numero: bedId })}" eliminato.`,
      undoAction: async () => {
        await restoreBed({
          bedId: deletedBed.id,
          existing: deletedBed,
          operatorId: currentUser.value?.login ?? null,
        })
        message.value = 'Eliminazione annullata: letto ripristinato.'
        await loadData()
      },
    })
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  }
}

function openAddRoomForm() {
  roomForm.value = {
    codice: '',
    note: '',
  }
  panelMode.value = 'create-room'
  isFormOpen.value = true
}

function openAddBedForm() {
  bedForm.value = {
    roomId: '',
    numero: '',
    note: '',
  }
  panelMode.value = 'create-bed'
  isFormOpen.value = true
}

function startEditRoom(room) {
  roomEditForm.value = {
    id: room.id,
    codice: room.codice || '',
    note: room.note || '',
  }
  panelMode.value = 'edit-room'
  isFormOpen.value = true
}

function startEditBed(bed) {
  bedEditForm.value = {
    id: bed.id,
    roomId: bed.roomId || '',
    numero: String(bed.numero || ''),
    note: bed.note || '',
  }
  panelMode.value = 'edit-bed'
  isFormOpen.value = true
}

function cancelRoomEdit() {
  roomEditForm.value = {
    id: '',
    codice: '',
    note: '',
  }
}

function cancelBedEdit() {
  bedEditForm.value = {
    id: '',
    roomId: '',
    numero: '',
    note: '',
  }
}

onMounted(() => void loadData())
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Stanze e Letti</h2>
      <button class="help-btn" @click="goToHelpSection('stanze')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Elenco stanze</strong></p>
      <CrudFilterBar
        v-model="filterQuery"
        label="Filtra stanze"
        placeholder="Cerca per codice stanza o note"
        :visible-count="activeRooms.length"
        :total-count="roomsData.filter(r => !showInactive ? !r.deletedAt : true).length"
      />
      <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem">
        <input v-model="showInactive" type="checkbox" />
        Mostra anche disattivate
      </label>

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        <button @click="openAddRoomForm">Aggiungi</button>
        <button @click="openAddBedForm">Aggiungi letto</button>
      </div>

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table">
        <thead>
          <tr>
            <th>Stanza</th>
            <th>Letti</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in activeRooms" :key="room.id">
            <td>{{ roomLabel(room) }}</td>
            <td>{{ room.beds.length }}</td>
            <td>
              <button
                v-if="!room.deletedAt"
                style="padding:.2rem .55rem;font-size:.8rem;margin-right:.35rem"
                @click="startEditRoom(room)"
              >
                Modifica
              </button>
              <button
                v-if="!room.deletedAt"
                style="padding:.2rem .55rem;font-size:.8rem;background:#d35f55"
                @click="handleDeactivateRoom(room.id)"
              >
                Elimina
              </button>
            </td>
          </tr>
          <tr v-if="activeRooms.length === 0 && !loading">
            <td colspan="3" class="muted">Nessuna stanza disponibile.</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p v-if="loading" class="muted" style="margin-top:.55rem">Caricamento...</p>
    </div>

    <div class="card">
      <details class="deep-panel" :open="isFormOpen" @toggle="isFormOpen = $event.target.open">
        <summary><strong>Gestione Stanze e Letti</strong></summary>

        <div style="margin-top:.75rem">
          <div class="panel-breadcrumb">
            <button type="button" class="panel-breadcrumb-link" @click="isFormOpen = false">Stanze</button>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">
              {{ panelMode.includes('bed') ? 'Letti' : 'Stanze' }}
            </span>
            <span class="panel-breadcrumb-current">/</span>
            <span class="panel-breadcrumb-current">
              {{ panelMode.startsWith('edit') ? 'Modifica' : 'Aggiungi' }}
            </span>
            <button type="button" class="panel-close-btn" @click="isFormOpen = false">Chiudi</button>
          </div>
          <p><strong>Aggiungi stanza</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Codice
              <input v-model="roomForm.codice" type="text" placeholder="Piano 1 - Lato A" />
            </label>
            <label>
              Note
              <input v-model="roomForm.note" type="text" placeholder="Note opzionali" />
            </label>
            <button :disabled="saving || !canCreateRoom" @click="handleCreateRoom">
              {{ saving ? 'Salvataggio...' : 'Salva stanza' }}
            </button>
          </div>
        </div>

        <div style="margin-top:1rem">
          <p><strong>Aggiungi letto a stanza</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Stanza
              <select v-model="bedForm.roomId" :disabled="!roomsData.length || saving">
                <option value="">Seleziona stanza</option>
                <option v-for="room in roomsData.filter(r => !r.deletedAt)" :key="room.id" :value="room.id">
                  {{ roomLabel(room) }}
                </option>
              </select>
            </label>
            <label>
              Numero letto
              <input v-model="bedForm.numero" type="number" min="1" step="1" placeholder="1" />
            </label>
            <label>
              Note
              <input v-model="bedForm.note" type="text" placeholder="Note opzionali" />
            </label>
            <button :disabled="saving || !canCreateBed" @click="handleCreateBed">
              {{ saving ? 'Salvataggio...' : 'Salva letto' }}
            </button>
          </div>
          <p v-if="!roomsData.filter(r => !r.deletedAt).length" class="muted" style="margin-top:.5rem;font-size:.85rem">
            Prima crea almeno una stanza.
          </p>
        </div>

        <div style="margin-top:1rem">
          <p><strong>Modifica stanza</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Stanza da modificare
              <input :value="roomEditForm.id || 'Nessuna stanza selezionata'" type="text" readonly />
            </label>
            <label>
              ID stanza (modifica)
              <input v-model="roomEditForm.codice" type="text" :disabled="!roomEditForm.id || saving" placeholder="Piano 1 - Lato A" />
            </label>
            <label>
              Dettagli stanza (modifica)
              <input v-model="roomEditForm.note" type="text" :disabled="!roomEditForm.id || saving" placeholder="Note opzionali" />
            </label>
            <button :disabled="saving || !canSaveRoomEdit" @click="handleSaveRoomEdit">
              {{ saving ? 'Salvataggio...' : 'Salva modifica stanza' }}
            </button>
            <button type="button" :disabled="saving" @click="cancelRoomEdit">Annulla modifica stanza</button>
          </div>
        </div>

        <div style="margin-top:1rem">
          <p><strong>Modifica letto</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Letto da modificare
              <input :value="bedEditForm.id || 'Nessun letto selezionato'" type="text" readonly />
            </label>
            <label>
              Stanza (modifica letto)
              <select v-model="bedEditForm.roomId" :disabled="!bedEditForm.id || !roomsData.length || saving">
                <option value="">Seleziona stanza</option>
                <option v-for="room in roomsData.filter(r => !r.deletedAt)" :key="room.id" :value="room.id">
                  {{ roomLabel(room) }}
                </option>
              </select>
            </label>
            <label>
              N. letto (modifica)
              <input v-model="bedEditForm.numero" type="number" min="1" step="1" :disabled="!bedEditForm.id || saving" placeholder="1" />
            </label>
            <label>
              Dettagli letto (modifica)
              <input v-model="bedEditForm.note" type="text" :disabled="!bedEditForm.id || saving" placeholder="Note opzionali" />
            </label>
            <button :disabled="saving || !canSaveBedEdit" @click="handleSaveBedEdit">
              {{ saving ? 'Salvataggio...' : 'Salva modifica letto' }}
            </button>
            <button type="button" :disabled="saving" @click="cancelBedEdit">Annulla modifica letto</button>
          </div>
        </div>
      </details>
    </div>

    <div class="card" style="margin-top:1rem">
      <p><strong>Dettaglio stanze e letti</strong></p>
      <div v-if="loading" class="muted" style="margin-top:.5rem">Caricamento...</div>
      <div v-else class="dataset-frame" style="margin-top:.75rem;max-height:24rem;padding:.75rem">
        <div v-for="room in activeRooms" :key="room.id" style="margin-bottom:1.5rem;padding:1rem;border:1px solid #e0e0e0;border-radius:.4rem">
          <p style="margin-bottom:.5rem">
            <strong>{{ roomLabel(room) }}</strong>
            <span v-if="room.note" class="muted"> · {{ room.note }}</span>
          </p>
          <table class="conflict-table" style="font-size:.9rem">
            <thead>
              <tr>
                <th>Letto</th>
                <th>Ospite</th>
                <th>Note</th>
                <th>Azione</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bed in room.beds" :key="bed.id">
                <td>{{ bedLabel(bed) }}</td>
                <td>{{ formatHostLabel(bed.host) }}</td>
                <td>{{ bed.note || '—' }}</td>
                <td>
                  <button
                    v-if="!bed.deletedAt"
                    style="padding:.2rem .35rem;font-size:.75rem;margin-right:.35rem"
                    @click="startEditBed(bed)"
                  >
                    Modifica
                  </button>
                  <button
                    v-if="!bed.deletedAt"
                    style="padding:.2rem .35rem;font-size:.75rem;background:#d35f55"
                    @click="handleDeactivateBed(bed.id)"
                  >
                    Elimina
                  </button>
                </td>
              </tr>
              <tr v-if="room.beds.length === 0">
                <td colspan="4" class="muted">Nessun letto.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="activeRooms.length === 0" class="muted">Nessuna stanza.</p>
      </div>
    </div>

    <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
    <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>

    <div v-if="pendingUndo" class="undo-banner" role="status" aria-live="polite">
      <span>{{ pendingUndo.label }}</span>
      <button type="button" @click="executeUndo">Annulla eliminazione</button>
    </div>
  </div>
</template>
