<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuth } from '../services/auth'
import { buildHostRows, createHost, deactivateHost } from '../services/ospiti'
import { getRoomsWithBeds } from '../services/stanze'
import { db } from '../db'

const { currentUser } = useAuth()

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const allHosts = ref([])
const therapies = ref([])
const roomsData = ref([])
const showAll = ref(false)

const form = ref({
    id: '',
    codiceInterno: '',
    iniziali: '',
    roomId: '',
    bedId: '',
    note: '',
})

const rows = computed(() => buildHostRows({
    hosts: allHosts.value,
    therapies: therapies.value,
    showAll: showAll.value,
}))

const canCreate = computed(() => form.value.id.trim() && (form.value.codiceInterno.trim() || form.value.iniziali.trim()))

const availableBeds = computed(() => {
    const room = roomsData.value.find(r => r.id === form.value.roomId)
    return room?.beds ?? []
})

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

async function handleCreate() {
    message.value = ''
    errorMessage.value = ''
    saving.value = true
    try {
        const roomId = form.value.roomId || null
        const bedId = form.value.bedId || null
        const room = roomId ? roomsData.value.find(r => r.id === roomId) : null
        const bed = bedId ? room?.beds.find(b => b.id === bedId) : null

        await createHost({
            id: form.value.id,
            codiceInterno: form.value.codiceInterno,
            iniziali: form.value.iniziali,
            roomId,
            bedId,
            stanza: room?.codice || '',
            letto: bed?.numero || '',
            note: form.value.note,
            operatorId: currentUser.value?.login ?? null,
        })
        message.value = `Ospite "${form.value.id}" creato.`
        form.value = { id: '', codiceInterno: '', iniziali: '', roomId: '', bedId: '', note: '' }
        await loadData()
    } catch (err) {
        errorMessage.value = `Errore: ${err.message}`
    } finally {
        saving.value = false
    }
}

async function handleDeactivate(hostId) {
    if (!confirm(`Disattivare l'ospite "${hostId}"?`)) return
    message.value = ''
    errorMessage.value = ''
    try {
        await deactivateHost({ hostId, operatorId: currentUser.value?.login ?? null })
        message.value = `Ospite "${hostId}" disattivato.`
        await loadData()
    } catch (err) {
        errorMessage.value = `Errore: ${err.message}`
    }
}

function resetForm() {
    form.value = { id: '', codiceInterno: '', iniziali: '', roomId: '', bedId: '', note: '' }
}

onMounted(() => void loadData())
</script>

<template>
  <div class="view">
    <h2>Ospiti</h2>

    <div class="card">
      <p><strong>Lista ospiti</strong></p>
      <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem">
        <input v-model="showAll" type="checkbox" />
        Mostra anche disattivati
      </label>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>ID</th>
            <th>Codice</th>
            <th>Iniziali</th>
            <th>Stanza/Letto</th>
            <th>Terapie attive</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="host in rows" :key="host.id">
            <td>{{ host.id }}</td>
            <td>{{ host.codiceInterno || '—' }}</td>
            <td>{{ host.iniziali || '—' }}</td>
            <td>{{ host.stanza }}{{ host.letto ? '/' + host.letto : '' }}</td>
            <td>{{ host.activeTherapies }}</td>
            <td>
              <button
                style="padding:.2rem .55rem;font-size:.8rem;background:#c0392b"
                @click="handleDeactivate(host.id)"
              >
                Disattiva
              </button>
            </td>
          </tr>
          <tr v-if="rows.length === 0 && !loading">
            <td colspan="6" class="muted">Nessun ospite disponibile.</td>
          </tr>
        </tbody>
      </table>
      <p v-if="loading" class="muted" style="margin-top:.55rem">Caricamento...</p>
    </div>

    <div class="card">
      <details>
        <summary><strong>Gestione Ospiti</strong></summary>

        <div style="margin-top:.75rem">
          <p><strong>Aggiungi nuovo ospite</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              ID <span class="muted">(es. OSP-01)</span>
              <input v-model="form.id" type="text" placeholder="OSP-01" />
            </label>
            <label>
              Codice interno
              <input v-model="form.codiceInterno" type="text" placeholder="Codice operativo" />
            </label>
            <label>
              Iniziali
              <input v-model="form.iniziali" type="text" placeholder="M.R." />
            </label>
            <label>
              Stanza
              <select v-model="form.roomId" :disabled="!roomsData.length || saving">
                <option value="">Seleziona stanza (opzionale)</option>
                <option v-for="room in roomsData.filter(r => !r.deletedAt)" :key="room.id" :value="room.id">
                  {{ room.codice }}
                </option>
              </select>
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
            <button :disabled="saving || !canCreate" @click="handleCreate">
              {{ saving ? 'Salvataggio...' : 'Salva ospite' }}
            </button>
          </div>
        </div>
      </details>
    </div>

    <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
    <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>
  </div>
</template>
