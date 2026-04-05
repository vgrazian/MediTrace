<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, enqueue, getSetting } from '../db'
import { useAuth } from '../services/auth'

const { currentUser } = useAuth()

const hosts = ref([])
const drugs = ref([])
const therapies = ref([])
const editingTherapyId = ref(null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

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
  return drug.principioAttivo || drugId
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

  if (!form.value.hostId || !form.value.drugId) {
    errorMessage.value = 'Seleziona ospite e farmaco.'
    return
  }

  saving.value = true
  const now = new Date().toISOString()

  try {
    const therapyId = editingTherapyId.value || crypto.randomUUID()
    const existing = editingTherapyId.value ? therapies.value.find(t => t.id === editingTherapyId.value) : null
    const record = {
      ...(existing || {}),
      id: therapyId,
      hostId: form.value.hostId,
      drugId: form.value.drugId,
      dosePerSomministrazione: Number(form.value.dosePerSomministrazione || 0),
      somministrazioniGiornaliere: Number(form.value.somministrazioniGiornaliere || 0),
      consumoMedioSettimanale: Number(form.value.consumoMedioSettimanale || 0),
      dataInizio: form.value.dataInizio || now,
      dataFine: form.value.dataFine || null,
      note: form.value.note || '',
      attiva: true,
      updatedAt: now,
      deletedAt: existing?.deletedAt ?? null,
      syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.therapies, db.syncQueue, db.activityLog, async () => {
      await db.therapies.put(record)
      await enqueue('therapies', record.id, 'upsert')
      await db.activityLog.add({
        entityType: 'therapies',
        entityId: record.id,
        action: editingTherapyId.value ? 'therapy_updated' : 'therapy_created',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
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
    message.value = existing ? 'Terapia aggiornata.' : 'Terapia salvata.'
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore salvataggio: ${err.message}`
  } finally {
    saving.value = false
  }
}

function startEditTherapy(therapy) {
  editingTherapyId.value = therapy.id
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
}

function resetForm() {
  editingTherapyId.value = null
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
}

async function deactivateTherapy(therapy) {
  const confirmed = window.confirm('Confermi disattivazione terapia?')
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''
  const now = new Date().toISOString()

  try {
    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.therapies, db.syncQueue, db.activityLog, async () => {
      await db.therapies.put({
        ...therapy,
        attiva: false,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
      await enqueue('therapies', therapy.id, 'upsert')
      await db.activityLog.add({
        entityType: 'therapies',
        entityId: therapy.id,
        action: 'therapy_deactivated',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    message.value = 'Terapia disattivata.'
    if (editingTherapyId.value === therapy.id) resetForm()
    await loadData()
  } catch (err) {
    errorMessage.value = `Errore disattivazione: ${err.message}`
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="view">
    <h2>Terapie Attive</h2>

    <div class="card">
      <p><strong>Elenco terapie attive</strong></p>
      <p class="muted" style="margin-top:.25rem">Terapie non disattivate presenti nel dataset locale.</p>

      <p v-if="loading" class="muted" style="margin-top:.5rem">Caricamento...</p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
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
          <tr v-for="therapy in therapies" :key="therapy.id">
            <td>{{ hostLabel(therapy.hostId) }}</td>
            <td>{{ drugLabel(therapy.drugId) }}</td>
            <td>{{ therapy.dosePerSomministrazione ?? '—' }}</td>
            <td>{{ therapy.somministrazioniGiornaliere ?? '—' }}</td>
            <td>{{ therapy.consumoMedioSettimanale ?? '—' }}</td>
            <td>{{ formatDate(therapy.dataInizio) }}</td>
            <td>{{ formatDate(therapy.dataFine) }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditTherapy(therapy)">Modifica</button>
              <button style="background:#c0392b" @click="deactivateTherapy(therapy)">Disattiva</button>
            </td>
          </tr>
          <tr v-if="therapies.length === 0 && !loading">
            <td colspan="8" class="muted">Nessuna terapia attiva disponibile.</td>
          </tr>
        </tbody>
      </table>
      <p v-if="message" class="muted" style="margin-top:.5rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" style="margin-top:.5rem">{{ errorMessage }}</p>
    </div>

    <div class="card">
      <details>
        <summary><strong>Gestione Terapie</strong></summary>

        <div style="margin-top:.75rem">
          <p><strong>{{ editingTherapyId ? 'Modifica terapia' : 'Aggiungi nuova terapia' }}</strong></p>
          <p class="muted" style="margin-top:.25rem">Compila i campi minimi per registrare una terapia attiva per ospite.</p>

          <div class="import-form" style="margin-top:.65rem">
            <label>
              Ospite
              <select v-model="form.hostId" :disabled="saving || !hosts.length">
                <option value="">Seleziona ospite</option>
                <option v-for="host in hosts" :key="host.id" :value="host.id">
                  {{ hostLabel(host.id) }}
                </option>
              </select>
            </label>

            <label>
              Farmaco
              <select v-model="form.drugId" :disabled="saving || !drugs.length">
                <option value="">Seleziona farmaco</option>
                <option v-for="drug in drugs" :key="drug.id" :value="drug.id">
                  {{ drug.principioAttivo || drug.id }}
                </option>
              </select>
            </label>

            <label>
              Dose per somministrazione
              <input v-model="form.dosePerSomministrazione" type="number" min="0" step="0.01" />
            </label>

            <label>
              Somministrazioni giornaliere
              <input v-model="form.somministrazioniGiornaliere" type="number" min="0" step="1" />
            </label>

            <label>
              Consumo medio settimanale
              <input v-model="form.consumoMedioSettimanale" type="number" min="0" step="0.01" />
            </label>

            <label>
              Data inizio
              <input v-model="form.dataInizio" type="date" />
            </label>

            <label>
              Data fine (opzionale)
              <input v-model="form.dataFine" type="date" />
            </label>

            <label>
              Note
              <input v-model="form.note" type="text" placeholder="Indicazioni operative" />
            </label>

            <button :disabled="saving || !canCreate" @click="saveTherapy">
              {{ saving ? 'Salvataggio...' : (editingTherapyId ? 'Salva modifica' : 'Salva terapia') }}
            </button>
            <button type="button" :disabled="saving" @click="resetForm">Annulla</button>
          </div>

          <p v-if="!canCreate" class="muted" style="margin-top:.5rem;font-size:.85rem">
            Per creare terapie servono almeno un ospite e un farmaco nel dataset locale.
          </p>
        </div>
      </details>
    </div>
  </div>
</template>
