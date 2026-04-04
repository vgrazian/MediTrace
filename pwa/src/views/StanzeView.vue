<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuth } from '../services/auth'
import { createRoom, createBed, deactivateRoom, deactivateBed, getRoomsWithBeds } from '../services/stanze'

const { currentUser } = useAuth()

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const roomsData = ref([])
const showInactive = ref(false)

const roomForm = ref({
  id: '',
  codice: '',
  note: '',
})

const bedForm = ref({
  roomId: '',
  numero: '',
  note: '',
})

const activeRooms = computed(() => roomsData.value.filter(r => !showInactive.value ? !r.deletedAt : true))

const canCreateRoom = computed(() => roomForm.value.id.trim() || roomForm.value.codice.trim())

const canCreateBed = computed(() => bedForm.value.roomId && Number(bedForm.value.numero) > 0)

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
    const id = (roomForm.value.id || roomForm.value.codice).trim()
    const codice = roomForm.value.codice.trim() || id

    await createRoom({
      id,
      codice,
      note: roomForm.value.note,
      operatorId: currentUser.value?.login ?? null,
    })

    message.value = `Stanza "${id}" creata.`
    roomForm.value = { id: '', codice: '', note: '' }
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

async function handleDeactivateRoom(roomId) {
  if (!confirm(`Disattivare la stanza "${roomId}"?`)) return
  message.value = ''
  errorMessage.value = ''
  try {
    await deactivateRoom({ roomId, operatorId: currentUser.value?.login ?? null })
    message.value = `Stanza disattivata.`
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  }
}

async function handleDeactivateBed(bedId) {
  if (!confirm(`Disattivare il letto "${bedId}"?`)) return
  message.value = ''
  errorMessage.value = ''
  try {
    await deactivateBed({ bedId, operatorId: currentUser.value?.login ?? null })
    message.value = `Letto disattivato.`
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore: ${err.message}`
  }
}

onMounted(() => void loadData())
</script>

<template>
  <div class="view">
    <h2>Stanze e Letti</h2>

    <div class="card">
      <p><strong>Elenco stanze</strong></p>
      <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem">
        <input v-model="showInactive" type="checkbox" />
        Mostra anche disattivate
      </label>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>ID</th>
            <th>Codice</th>
            <th>Letti</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in activeRooms" :key="room.id">
            <td>{{ room.id }}</td>
            <td>{{ room.codice || '—' }}</td>
            <td>{{ room.beds.length }}</td>
            <td>
              <button
                v-if="!room.deletedAt"
                style="padding:.2rem .55rem;font-size:.8rem;background:#c0392b"
                @click="handleDeactivateRoom(room.id)"
              >
                Disattiva
              </button>
            </td>
          </tr>
          <tr v-if="activeRooms.length === 0 && !loading">
            <td colspan="4" class="muted">Nessuna stanza disponibile.</td>
          </tr>
        </tbody>
      </table>
      <p v-if="loading" class="muted" style="margin-top:.55rem">Caricamento...</p>
    </div>

    <div class="card">
      <details>
        <summary><strong>Gestione Stanze e Letti</strong></summary>

        <div style="margin-top:.75rem">
          <p><strong>Aggiungi stanza</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              ID stanza <span class="muted">(es. A, B, C)</span>
              <input v-model="roomForm.id" type="text" placeholder="A" />
            </label>
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
                  {{ room.id }} ({{ room.codice }})
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
      </details>
    </div>

    <div class="card" style="margin-top:1rem">
      <p><strong>Dettaglio stanze e letti</strong></p>
      <div v-if="loading" class="muted" style="margin-top:.5rem">Caricamento...</div>
      <div v-else style="margin-top:.75rem">
        <div v-for="room in activeRooms" :key="room.id" style="margin-bottom:1.5rem;padding:1rem;border:1px solid #e0e0e0;border-radius:.4rem">
          <p style="margin-bottom:.5rem">
            <strong>{{ room.id }} — {{ room.codice }}</strong>
            <span v-if="room.note" class="muted"> · {{ room.note }}</span>
          </p>
          <table class="conflict-table" style="font-size:.9rem;margin-top:.5rem">
            <thead>
              <tr>
                <th>Letto</th>
                <th>ID</th>
                <th>Note</th>
                <th>Azione</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bed in room.beds" :key="bed.id">
                <td>{{ bed.numero }}</td>
                <td>{{ bed.id }}</td>
                <td>{{ bed.note || '—' }}</td>
                <td>
                  <button
                    v-if="!bed.deletedAt"
                    style="padding:.2rem .35rem;font-size:.75rem;background:#c0392b"
                    @click="handleDeactivateBed(bed.id)"
                  >
                    Disattiva
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
  </div>
</template>
