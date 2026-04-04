<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../services/auth'
import { fullSync, exportBackupJson, listPendingConflicts, resolveConflict } from '../services/sync'
import { getNotificationStatusSnapshot, requestNotificationPermission, sendTestNotification } from '../services/notifications'
import { listSupportedImportSources, importCsv } from '../services/csvImport'
import { getSetting } from '../db'

const {
  accessToken,
  currentUser,
  signOut,
  changePassword,
  getSessionInfo,
  listRecentAuthEvents,
  disableCurrentTestUser,
  listUsers,
  reactivateSeededUser,
  deleteSeededUser,
} = useAuth()
const deviceId = ref(null)
const datasetVersion = ref(null)
const syncMessage = ref('')
const gistId = ref(null)
const pendingConflicts = ref([])
const resolvingConflictId = ref(null)
const importSources = listSupportedImportSources()
const selectedImportSource = ref(importSources[0] ?? '')
const selectedImportFile = ref(null)
const importDryRun = ref(true)
const importRunning = ref(false)
const importReport = ref(null)
const importError = ref('')
const pwdCurrent = ref('')
const pwdNext = ref('')
const pwdConfirm = ref('')
const passwordMessage = ref('')
const passwordBusy = ref(false)
const testUserBusy = ref(false)
const testUserMessage = ref('')
const users = ref([])
const usersBusy = ref(false)
const usersMessage = ref('')
const sessionInfo = ref(null)
const authEvents = ref([])
const notificationStatus = ref(getNotificationStatusSnapshot())
const notificationMessage = ref('')
const notificationBusy = ref(false)

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

async function refreshUsers() {
  usersMessage.value = ''
  if (currentUser.value?.role !== 'admin') {
    users.value = []
    return
  }

  try {
    users.value = await listUsers()
  } catch (err) {
    users.value = []
    usersMessage.value = `Errore utenti: ${err.message}`
  }
}

async function refreshSecurityInfo() {
  sessionInfo.value = await getSessionInfo()
  authEvents.value = await listRecentAuthEvents(8)
}

function refreshNotificationStatus() {
  notificationStatus.value = getNotificationStatusSnapshot()
}

async function enableNotifications() {
  notificationBusy.value = true
  notificationMessage.value = ''
  try {
    notificationStatus.value = await requestNotificationPermission()
    if (notificationStatus.value.enabled) {
      notificationMessage.value = 'Notifiche abilitate su questo dispositivo.'
    } else if (notificationStatus.value.permission === 'denied') {
      notificationMessage.value = 'Permesso negato: abilita le notifiche dalle impostazioni del browser/dispositivo.'
    } else {
      notificationMessage.value = 'Permesso non ancora concesso.'
    }
  } catch (err) {
    notificationMessage.value = `Errore notifiche: ${err.message}`
  } finally {
    notificationBusy.value = false
  }
}

async function runNotificationTest() {
  notificationBusy.value = true
  notificationMessage.value = ''
  try {
    await sendTestNotification()
    notificationMessage.value = 'Notifica di test inviata.'
  } catch (err) {
    notificationMessage.value = `Errore test notifica: ${err.message}`
  } finally {
    notificationBusy.value = false
  }
}

function onImportFileChange(event) {
  const file = event.target?.files?.[0] ?? null
  selectedImportFile.value = file
}

async function runCsvImport() {
  importError.value = ''
  importReport.value = null

  if (!selectedImportSource.value) {
    importError.value = 'Seleziona una sorgente CSV.'
    return
  }
  if (!selectedImportFile.value) {
    importError.value = 'Seleziona un file CSV.'
    return
  }

  importRunning.value = true
  try {
    const csvText = await selectedImportFile.value.text()
    importReport.value = await importCsv({
      sourceName: selectedImportSource.value,
      csvText,
      dryRun: importDryRun.value,
      operatorId: currentUser.value?.login ?? null,
    })
  } catch (err) {
    importError.value = err.message
  } finally {
    importRunning.value = false
  }
}

onMounted(async () => {
  deviceId.value = await getSetting('deviceId')
  datasetVersion.value = await getSetting('datasetVersion')
  gistId.value = await getSetting('gistId')
  await refreshPendingConflicts()
  await refreshUsers()
  await refreshSecurityInfo()
  refreshNotificationStatus()
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

async function submitPasswordChange() {
  passwordBusy.value = true
  passwordMessage.value = ''

  try {
    await changePassword({
      currentPassword: pwdCurrent.value,
      newPassword: pwdNext.value,
      confirmPassword: pwdConfirm.value,
    })

    pwdCurrent.value = ''
    pwdNext.value = ''
    pwdConfirm.value = ''
    passwordMessage.value = 'Password aggiornata. Sessione invalidata: esegui nuovo accesso.'
  } catch (err) {
    passwordMessage.value = `Errore password: ${err.message}`
  } finally {
    passwordBusy.value = false
  }
}

async function disableTestUser() {
  testUserBusy.value = true
  testUserMessage.value = ''

  try {
    await disableCurrentTestUser()
    await refreshUsers()
  } catch (err) {
    testUserMessage.value = `Errore disattivazione: ${err.message}`
  } finally {
    testUserBusy.value = false
  }
}

async function handleReactivateSeeded(username) {
  usersBusy.value = true
  usersMessage.value = ''
  try {
    await reactivateSeededUser(username)
    await refreshUsers()
    usersMessage.value = `Utente ${username} riattivato.`
  } catch (err) {
    usersMessage.value = `Errore riattivazione: ${err.message}`
  } finally {
    usersBusy.value = false
  }
}

async function handleDeleteSeeded(username) {
  const confirmed = window.confirm(`Confermi eliminazione definitiva dell'utente di prova "${username}"?`)
  if (!confirmed) return

  usersBusy.value = true
  usersMessage.value = ''
  try {
    await deleteSeededUser(username)
    await refreshUsers()
    usersMessage.value = `Utente ${username} eliminato definitivamente.`
  } catch (err) {
    usersMessage.value = `Errore eliminazione: ${err.message}`
  } finally {
    usersBusy.value = false
  }
}
</script>

<template>
  <div class="view">
    <h2>Impostazioni</h2>

    <div class="card">
      <p><strong>Account operatore</strong></p>
      <p class="muted">Username: {{ currentUser?.username }}</p>
      <p class="muted">Ruolo: {{ currentUser?.role === 'admin' ? 'admin' : 'operatore' }}</p>
      <p class="muted">GitHub sync: @{{ currentUser?.login }}<span v-if="currentUser?.name !== currentUser?.login"> ({{ currentUser?.name }})</span></p>
      <p class="muted" style="font-size:.8rem;margin-top:.25rem">
        Gist ID: <code v-if="gistId"><a :href="'https://gist.github.com/' + gistId" target="_blank" rel="noopener">{{ gistId.slice(0, 12) }}…</a></code>
        <span v-else>— (nessun gist ancora creato)</span>
      </p>
      <button style="margin-top:.75rem" @click="signOut">Esci</button>

      <template v-if="currentUser?.isSeeded">
        <button
          style="margin-top:.5rem;background:#dc2626"
          :disabled="testUserBusy"
          @click="disableTestUser"
        >
          {{ testUserBusy ? 'Disattivazione...' : 'Disattiva utente di prova' }}
        </button>
        <p v-if="testUserMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ testUserMessage }}</p>
      </template>
    </div>

    <div class="card">
      <p><strong>Gestione password</strong></p>
      <div class="import-form" style="margin-top:.5rem">
        <label>
          Password corrente
          <input v-model="pwdCurrent" type="password" autocomplete="current-password" />
        </label>

        <label>
          Nuova password
          <input v-model="pwdNext" type="password" autocomplete="new-password" />
        </label>

        <label>
          Conferma nuova password
          <input v-model="pwdConfirm" type="password" autocomplete="new-password" />
        </label>

        <button :disabled="passwordBusy || !pwdCurrent || !pwdNext || !pwdConfirm" @click="submitPasswordChange">
          {{ passwordBusy ? 'Aggiornamento...' : 'Aggiorna password' }}
        </button>
      </div>
      <p v-if="passwordMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ passwordMessage }}</p>
    </div>

    <div class="card">
      <p><strong>Utenti</strong></p>
      <p class="muted" style="margin-top:.25rem">Gestione utenti consentita solo ad account admin. Azioni disponibili per utenti di prova (seeded).</p>

      <p v-if="currentUser?.role !== 'admin'" class="muted" style="margin-top:.5rem">
        Il tuo account non ha privilegi admin: puoi visualizzare solo il tuo profilo.
      </p>

      <table v-if="currentUser?.role === 'admin'" class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Username</th>
            <th>GitHub</th>
            <th>Ruolo</th>
            <th>Tipo</th>
            <th>Stato</th>
            <th>Azione</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.username">
            <td>{{ user.username }}<span v-if="user.isCurrent"> (sessione attiva)</span></td>
            <td>@{{ user.login }}</td>
            <td>{{ user.role }}</td>
            <td>{{ user.isSeeded ? 'prova' : 'standard' }}</td>
            <td>{{ user.disabled ? 'disattivato' : 'attivo' }}</td>
            <td>
              <template v-if="user.isSeeded">
                <button
                  v-if="user.disabled"
                  :disabled="usersBusy"
                  @click="handleReactivateSeeded(user.username)"
                >
                  Riattiva
                </button>
                <button
                  style="margin-left:.35rem;background:#dc2626"
                  :disabled="usersBusy"
                  @click="handleDeleteSeeded(user.username)"
                >
                  Elimina
                </button>
              </template>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="usersMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ usersMessage }}</p>
    </div>

    <div class="card">
      <p><strong>Notifiche promemoria</strong></p>
      <p class="muted" style="margin-top:.25rem">Supporto browser: {{ notificationStatus.supported ? 'si' : 'no' }}</p>
      <p class="muted">Permesso: {{ notificationStatus.permission }}</p>
      <p class="muted">Stato: {{ notificationStatus.enabled ? 'abilitate' : 'non abilitate' }}</p>

      <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button :disabled="notificationBusy || !notificationStatus.supported" @click="enableNotifications">
          {{ notificationBusy ? 'Richiesta...' : 'Abilita notifiche' }}
        </button>
        <button :disabled="notificationBusy || !notificationStatus.enabled" @click="runNotificationTest">
          Invia notifica test
        </button>
        <button :disabled="notificationBusy" @click="refreshNotificationStatus">
          Aggiorna stato
        </button>
      </div>

      <p v-if="notificationMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ notificationMessage }}</p>
    </div>

    <div class="card">
      <p><strong>Sicurezza sessione</strong></p>
      <p class="muted" style="margin-top:.25rem">TTL sessione: {{ sessionInfo?.ttlMinutes ?? '—' }} minuti</p>
      <p class="muted">Scadenza: {{ sessionInfo?.expiresAt ?? '—' }}</p>
      <p class="muted">Ultima attivita': {{ sessionInfo?.lastActivityAt ?? '—' }}</p>
      <p class="muted">Stato: {{ sessionInfo?.isExpired ? 'scaduta' : 'attiva' }}</p>

      <button style="margin-top:.75rem" @click="refreshSecurityInfo">Aggiorna stato sicurezza</button>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Azione</th>
            <th>Operatore</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in authEvents" :key="event.id">
            <td>{{ event.ts }}</td>
            <td>{{ event.action }}</td>
            <td>{{ event.operatorId ?? 'anonymous' }}</td>
          </tr>
          <tr v-if="authEvents.length === 0">
            <td colspan="3" class="muted">Nessun evento auth disponibile.</td>
          </tr>
        </tbody>
      </table>
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

    <div class="card">
      <p><strong>Import CSV guidato</strong></p>
      <p class="muted" style="margin-top:.25rem">Supporta dry-run con report righe scartate secondo mapping v1.</p>

      <div class="import-form">
        <label>
          Sorgente
          <select v-model="selectedImportSource">
            <option v-for="source in importSources" :key="source" :value="source">{{ source }}</option>
          </select>
        </label>

        <label>
          File CSV
          <input type="file" accept=".csv,text/csv" @change="onImportFileChange" />
        </label>

        <label class="checkbox-label">
          <input v-model="importDryRun" type="checkbox" />
          Esegui dry-run (nessuna scrittura)
        </label>

        <button :disabled="importRunning" @click="runCsvImport">
          {{ importRunning ? 'Import in corso...' : 'Avvia import CSV' }}
        </button>
      </div>

      <p v-if="importError" class="import-error">{{ importError }}</p>

      <div v-if="importReport" class="import-report">
        <p><strong>Esito import</strong></p>
        <p class="muted">
          Tabella: {{ importReport.table }}<br />
          Righe lette: {{ importReport.totalRows }}<br />
          Accettate: {{ importReport.acceptedRows }}<br />
          Scartate: {{ importReport.rejectedRows }}<br />
          Modalita': {{ importReport.dryRun ? 'dry-run' : 'scrittura applicata' }}
        </p>

        <table v-if="importReport.rejectedRows > 0" class="conflict-table" style="margin-top:.75rem">
          <thead>
            <tr>
              <th>Riga</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="reject in importReport.rejects" :key="`${reject.rowNumber}-${reject.reason}`">
              <td>{{ reject.rowNumber }}</td>
              <td>{{ reject.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
