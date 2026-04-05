<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuth } from '../services/auth'
import { buildHostRows, createHost, deleteHost, formatHostDisplay, updateHost } from '../services/ospiti'
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
const editingHostId = ref(null)

const form = ref({
    id: '',
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
}))

const canCreate = computed(() => form.value.id.trim() && ((form.value.nome || '').trim() || (form.value.cognome || '').trim() || form.value.codiceInterno.trim() || form.value.iniziali.trim()))
const canSave = computed(() => (editingHostId.value ? true : form.value.id.trim()) && ((form.value.nome || '').trim() || (form.value.cognome || '').trim() || form.value.codiceInterno.trim() || form.value.iniziali.trim()))

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

async function handleSave() {
    message.value = ''
    errorMessage.value = ''
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
          await createHost({
            id: form.value.id,
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
          message.value = `Ospite "${form.value.id}" creato.`
        }
        resetForm()
        await loadData()
    } catch (err) {
        errorMessage.value = `Errore: ${err.message}`
    } finally {
        saving.value = false
    }
}

async function handleDeactivate(hostId) {
  if (!confirm(`Eliminare l'ospite "${hostId}"?`)) return
    message.value = ''
    errorMessage.value = ''
    try {
        await deleteHost({ hostId, operatorId: currentUser.value?.login ?? null })
        message.value = `Ospite "${hostId}" eliminato.`
        await loadData()
    } catch (err) {
        errorMessage.value = `Errore: ${err.message}`
    }
}

function startEdit(host) {
  editingHostId.value = host.id
  form.value = {
    id: host.id,
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
}

function resetForm() {
  editingHostId.value = null
    form.value = {
      id: '',
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
          <tr v-for="host in rows" :key="host.id">
            <td>{{ host.id }}</td>
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
                style="padding:.2rem .55rem;font-size:.8rem;background:#c0392b"
                @click="handleDeactivate(host.id)"
              >
                Elimina
              </button>
            </td>
          </tr>
          <tr v-if="rows.length === 0 && !loading">
            <td colspan="9" class="muted">Nessun ospite disponibile.</td>
          </tr>
        </tbody>
      </table>
      <p v-if="loading" class="muted" style="margin-top:.55rem">Caricamento...</p>
    </div>

    <div class="card">
      <details>
        <summary><strong>Gestione Ospiti</strong></summary>

        <div style="margin-top:.75rem">
          <p><strong>{{ editingHostId ? 'Modifica ospite' : 'Aggiungi nuovo ospite' }}</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              ID <span class="muted">(es. OSP-01)</span>
              <input v-model="form.id" type="text" placeholder="OSP-01" :disabled="Boolean(editingHostId)" />
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
              Nome
              <input v-model="form.nome" type="text" placeholder="Mario" />
            </label>
            <label>
              Cognome
              <input v-model="form.cognome" type="text" placeholder="Rossi" />
            </label>
            <label>
              Luogo di nascita
              <input v-model="form.luogoNascita" type="text" placeholder="Roma" />
            </label>
            <label>
              Data di nascita
              <input v-model="form.dataNascita" type="date" />
            </label>
            <label>
              Sesso
              <select v-model="form.sesso">
                <option value="">Seleziona</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Altro">Altro</option>
              </select>
            </label>
            <label>
              Codice fiscale
              <input v-model="form.codiceFiscale" type="text" maxlength="16" placeholder="RSSMRA80A01H501U" />
            </label>
            <label>
              Patologie
              <input v-model="form.patologie" type="text" placeholder="Patologie o note cliniche" />
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
            <button :disabled="saving || !canSave" @click="handleSave">
              {{ saving ? 'Salvataggio...' : (editingHostId ? 'Salva modifica' : 'Salva ospite') }}
            </button>
            <button type="button" :disabled="saving" @click="resetForm">
              Annulla
            </button>
          </div>
        </div>
      </details>
    </div>

    <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
    <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>
  </div>
</template>
