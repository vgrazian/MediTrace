<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuth } from '../services/auth'
import { buildHostRows, createHost, deactivateHost } from '../services/ospiti'
import { db } from '../db'

const { currentUser } = useAuth()

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const allHosts = ref([])
const therapies = ref([])
const showAll = ref(false)

const form = ref({
    id: '',
    codiceInterno: '',
    iniziali: '',
    casaAlloggio: '',
    note: '',
})

const rows = computed(() => buildHostRows({
    hosts: allHosts.value,
    therapies: therapies.value,
    showAll: showAll.value,
}))

const canCreate = computed(() => form.value.id.trim() && (form.value.codiceInterno.trim() || form.value.iniziali.trim()))

async function loadData() {
    loading.value = true
    errorMessage.value = ''
    try {
        const [rawHosts, rawTherapies] = await Promise.all([
            db.hosts.toArray(),
            db.therapies.toArray(),
        ])
        allHosts.value = rawHosts
        therapies.value = rawTherapies
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
        await createHost({
            id: form.value.id,
            codiceInterno: form.value.codiceInterno,
            iniziali: form.value.iniziali,
            casaAlloggio: form.value.casaAlloggio,
            note: form.value.note,
            operatorId: currentUser.value?.login ?? null,
        })
        message.value = `Ospite "${form.value.id}" creato.`
        form.value = { id: '', codiceInterno: '', iniziali: '', casaAlloggio: '', note: '' }
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

onMounted(() => void loadData())
</script>

<template>
  <div class="view">
    <h2>Ospiti</h2>

    <div class="card">
      <p><strong>Nuovo ospite</strong></p>
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
          Casa alloggio
          <input v-model="form.casaAlloggio" type="text" placeholder="Casa Nord" />
        </label>
        <label>
          Note
          <input v-model="form.note" type="text" placeholder="Note opzionali" />
        </label>
        <button :disabled="saving || !canCreate" @click="handleCreate">
          {{ saving ? 'Salvataggio...' : 'Salva ospite' }}
        </button>
      </div>
      <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>
    </div>

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
            <th>Casa alloggio</th>
            <th>Terapie attive</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="host in rows" :key="host.id">
            <td>{{ host.id }}</td>
            <td>{{ host.codiceInterno || '—' }}</td>
            <td>{{ host.iniziali || '—' }}</td>
            <td>{{ host.casaAlloggio || '—' }}</td>
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
  </div>
</template>
