<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../services/auth'
import { fullSync, exportBackupJson, listPendingConflicts, resolveConflict } from '../services/sync'
import { getSetting } from '../db'

const { accessToken, currentUser, signOut } = useAuth()
const deviceId = ref(null)
const datasetVersion = ref(null)
const syncMessage = ref('')
const gistId = ref(null)
const pendingConflicts = ref([])
const resolvingConflictId = ref(null)

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function formatEntityLabel(conflict) {
  return `${conflict.table} / ${conflict.entityId}`
}

async function refreshPendingConflicts() {
  pendingConflicts.value = await listPendingConflicts()
}

onMounted(async () => {
  deviceId.value = await getSetting('deviceId')
  datasetVersion.value = await getSetting('datasetVersion')
  gistId.value = await getSetting('gistId')
  await refreshPendingConflicts()
})

async function runSync() {
  syncMessage.value = 'Sincronizzazione in corso…'
  try {
    const result = await fullSync(accessToken.value)
    datasetVersion.value = await getSetting('datasetVersion')
    gistId.value = await getSetting('gistId')
    await refreshPendingConflicts()
    syncMessage.value = JSON.stringify(result)
  } catch (err) {
    syncMessage.value = `Errore: ${err.message}`
  }
}

async function applyResolution(conflictId, choice) {
  resolvingConflictId.value = conflictId
  syncMessage.value = 'Risoluzione conflitto in corso…'

  try {
    const result = await resolveConflict({
      conflictId,
      choice,
      operatorId: currentUser.value?.login ?? null,
    })
    await refreshPendingConflicts()
    syncMessage.value = `Conflitto risolto (${result.choice}). Restanti: ${result.remaining}`
  } catch (err) {
    syncMessage.value = `Errore risoluzione: ${err.message}`
  } finally {
    resolvingConflictId.value = null
  }
}

async function downloadBackup() {
  const json = await exportBackupJson()
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = `meditrace-backup-${date}.json`
  a.click()
}
</script>

<template>
  <div class="view">
    <h2>Impostazioni</h2>

    <div class="card">
      <p><strong>Account GitHub</strong></p>
      <p class="muted">@{{ currentUser?.login }}<span v-if="currentUser?.name !== currentUser?.login"> ({{ currentUser?.name }})</span></p>
      <p class="muted" style="font-size:.8rem;margin-top:.25rem">
        Gist ID: <code v-if="gistId"><a :href="'https://gist.github.com/' + gistId" target="_blank" rel="noopener">{{ gistId.slice(0, 12) }}…</a></code>
        <span v-else>— (nessun gist ancora creato)</span>
      </p>
      <button style="margin-top:.75rem" @click="signOut">Esci</button>
    </div>

    <div class="card">
      <p><strong>Dispositivo</strong></p>
      <p class="muted">Device ID: {{ deviceId ?? '— (non ancora assegnato)' }}</p>
      <p class="muted">Dataset version locale: {{ datasetVersion ?? '—' }}</p>
    </div>

    <div class="card">
      <p><strong>Sincronizzazione manuale</strong></p>
      <button style="margin-top:.75rem" @click="runSync">Sincronizza ora</button>
      <p v-if="syncMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ syncMessage }}</p>
    </div>

    <div class="card">
      <p><strong>Conflitti sincronizzazione</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Conflitti aperti: {{ pendingConflicts.length }}
      </p>

      <p v-if="pendingConflicts.length === 0" class="muted" style="margin-top:.5rem">
        Nessun conflitto aperto.
      </p>

      <div v-for="conflict in pendingConflicts" :key="conflict.conflictId" class="conflict-item">
        <p><strong>{{ formatEntityLabel(conflict) }}</strong></p>
        <p class="muted" style="font-size:.8rem">Rilevato: {{ conflict.detectedAt }}</p>

        <table class="conflict-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Locale</th>
              <th>Remoto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in conflict.fields" :key="field.field">
              <td>{{ field.field }}</td>
              <td>{{ formatValue(field.local) }}</td>
              <td>{{ formatValue(field.remote) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="conflict-actions">
          <button
            :disabled="resolvingConflictId === conflict.conflictId"
            @click="applyResolution(conflict.conflictId, 'local')"
          >
            Mantieni locale
          </button>
          <button
            :disabled="resolvingConflictId === conflict.conflictId"
            @click="applyResolution(conflict.conflictId, 'remote')"
          >
            Accetta remota
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <p><strong>Backup locale</strong></p>
      <p class="muted">Scarica tutti i dati come file JSON.</p>
      <button style="margin-top:.75rem" @click="downloadBackup">Scarica backup JSON</button>
    </div>
  </div>
</template>
