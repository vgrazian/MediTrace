<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useAuth } from '../services/auth'
import { canRole } from '../services/rbac'
import { fullSync, exportBackupJson, importBackupJson, listPendingConflicts, resolveConflict } from '../services/sync'
import { formatUserError } from '../services/errorHandling'
import { confirmDeleteUser } from '../services/confirmations'
import {
  getNotificationStatusSnapshot,
  requestNotificationPermission,
  sendTestNotification,
  triggerReminderNotificationsCheck,
  getPushSubscriptionStatusSnapshot,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  listUpcomingReminderNotifications24h,
} from '../services/notifications'
import { listSupportedImportSources, importCsv } from '../services/csvImport'
import { db, getSetting, enqueue, setSetting } from '../db'
import { BED_SEQUENCE_SETTING_KEY, buildBedSequenceIndex } from '../services/promemoria'
import {
  loadSeedData,
  clearSeedData,
  isSeedDataLoaded,
  getSeedStats,
  loadRealisticSeedData,
  clearRealisticSeedData,
  isRealisticSeedDataLoaded,
} from '../services/seedData'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { openConfirmDialog } from '../services/confirmDialog'

const {
  accessToken,
  currentUser,
  signOut,
  changePassword,
  updateCurrentProfile,
  getSessionInfo,
  getCredentialPolicyStatus,
  listRecentAuthEvents,
  getPasswordPolicy,
  disableCurrentTestUser,
  listUsers,
  listInvitedProfiles,
  sendInviteLink,
  reactivateSeededUser,
  deleteSeededUser,
} = useAuth()
const { goToHelpSection } = useHelpNavigation()
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
const profileFirstName = ref('')
const profileLastName = ref('')
const profilePhone = ref('')
const profileEmail = ref('')
const profileBusy = ref(false)
const profileMessage = ref('')
const testUserBusy = ref(false)
const testUserMessage = ref('')
const users = ref([])
const usersBusy = ref(false)
const usersMessage = ref('')
const invitedProfiles = ref([])
const invitedProfilesMessage = ref('')
const inviteFirstName = ref('')
const inviteLastName = ref('')
const inviteEmail = ref('')
const inviteBusy = ref(false)
const inviteMessage = ref('')
const sessionInfo = ref(null)
const credentialPolicy = ref(null)
const authEvents = ref([])
const authEventFilter = ref('')
const notificationStatus = ref(getNotificationStatusSnapshot())
const pushStatus = ref({
  supported: false,
  hasVapidKey: false,
  subscribed: false,
  endpoint: null,
  reason: 'api-unsupported',
})
const upcomingReminderRows = ref([])
const notificationMessage = ref('')
const notificationBusy = ref(false)
const seedLoaded = ref(false)
const seedActionMode = ref('load')
const seedBusy = ref(false)
const seedMessage = ref('')
const seedStats = getSeedStats()
const backupRestoreBusy = ref(false)
const backupRestoreMessage = ref('')
const selectedBackupFile = ref(null)
const bedSequenceRows = ref([])
const bedSequenceBusy = ref(false)
const bedSequenceMessage = ref('')

const passwordPolicyState = computed(() => getPasswordPolicy(pwdNext.value))
const canManageUsers = computed(() => canRole(currentUser.value?.role, 'users:read'))
const canManageInvites = computed(() => canRole(currentUser.value?.role, 'invites:send'))
const canManageProfiles = computed(() => canRole(currentUser.value?.role, 'profiles:read'))
const canManageTestData = computed(() => canRole(currentUser.value?.role, 'testData:manage'))
const testDataActionLabel = computed(() => {
  if (seedBusy.value) return seedActionMode.value === 'clear' ? 'Rimozione in corso…' : 'Generazione in corso…'
  return seedActionMode.value === 'clear' ? 'Rimuovi dati di test' : 'Genera dati di test'
})

function hydrateProfileForm() {
  profileFirstName.value = currentUser.value?.firstName ?? ''
  profileLastName.value = currentUser.value?.lastName ?? ''
  profilePhone.value = currentUser.value?.phone ?? ''
  profileEmail.value = currentUser.value?.email ?? ''
}

async function refreshSeedStatus() {
  const [legacySeedLoaded, realisticSeedLoaded] = await Promise.all([
    isSeedDataLoaded(),
    isRealisticSeedDataLoaded(),
  ])
  seedLoaded.value = legacySeedLoaded || realisticSeedLoaded
  seedActionMode.value = seedLoaded.value ? 'clear' : 'load'
}

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
  if (!canManageUsers.value) {
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

async function refreshInvitedProfiles() {
  invitedProfilesMessage.value = ''
  if (!canManageProfiles.value) {
    invitedProfiles.value = []
    return
  }

  try {
    invitedProfiles.value = await listInvitedProfiles()
  } catch (err) {
    invitedProfiles.value = []
    invitedProfilesMessage.value = `Errore profili invitati: ${err.message}`
  }
}

function formatScheduledAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('it-IT', { hour12: false })
}

function formatBedSequenceLabel(item) {
  const roomLabel = item.roomCode || item.roomId || '—'
  const bedLabel = item.bedNumber || item.bedId || '—'
  const hostLabel = item.hostLabel ? ` · ${item.hostLabel}` : ''
  return `${roomLabel}/${bedLabel}${hostLabel}`
}

async function refreshBedSequenceSettings() {
  bedSequenceBusy.value = true
  bedSequenceMessage.value = ''
  try {
    const [rawBeds, rawRooms, rawHosts, savedSequence] = await Promise.all([
      db.beds.toArray(),
      db.rooms.toArray(),
      db.hosts.toArray(),
      getSetting(BED_SEQUENCE_SETTING_KEY, []),
    ])

    const beds = rawBeds.filter(item => !item.deletedAt)
    const rooms = rawRooms.filter(item => !item.deletedAt)
    const hosts = rawHosts.filter(item => !item.deletedAt)
    const roomById = new Map(rooms.map(room => [room.id, room]))
    const hostByBedId = new Map(hosts.filter(host => host.bedId).map(host => [host.bedId, host]))
    const bedSequenceIndex = buildBedSequenceIndex({ beds, rooms, bedSequence: savedSequence })

    bedSequenceRows.value = [...beds]
      .sort((a, b) => (bedSequenceIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (bedSequenceIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER))
      .map((bed, index) => {
        const room = roomById.get(bed.roomId)
        const host = hostByBedId.get(bed.id)
        const hostFullName = host ? [host.cognome, host.nome].filter(Boolean).join(' ').trim() : ''
        return {
          order: index,
          bedId: bed.id,
          bedNumber: bed.numero,
          roomId: bed.roomId,
          roomCode: room?.codice || '',
          hostLabel: hostFullName || host?.codiceInterno || host?.iniziali || '',
        }
      })
  } catch (err) {
    bedSequenceRows.value = []
    bedSequenceMessage.value = `Errore sequenza letti: ${err.message}`
  } finally {
    bedSequenceBusy.value = false
  }
}

async function persistBedSequenceRows(nextRows, messageText = 'Sequenza letti aggiornata.') {
  bedSequenceRows.value = nextRows.map((row, index) => ({ ...row, order: index }))
  await setSetting(BED_SEQUENCE_SETTING_KEY, bedSequenceRows.value.map(item => item.bedId))
  bedSequenceMessage.value = messageText
}

async function moveBedSequence(index, direction) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= bedSequenceRows.value.length) return
  const nextRows = [...bedSequenceRows.value]
  const [item] = nextRows.splice(index, 1)
  nextRows.splice(targetIndex, 0, item)
  await persistBedSequenceRows(nextRows)
}

async function resetBedSequence() {
  await setSetting(BED_SEQUENCE_SETTING_KEY, [])
  bedSequenceMessage.value = 'Sequenza letti ripristinata all’ordinamento predefinito.'
  await refreshBedSequenceSettings()
}

async function refreshSecurityInfo() {
  sessionInfo.value = await getSessionInfo()
  credentialPolicy.value = await getCredentialPolicyStatus()
  authEvents.value = await listRecentAuthEvents(20, authEventFilter.value)
}

function refreshNotificationStatus() {
  notificationStatus.value = getNotificationStatusSnapshot()
}

async function refreshPushStatus() {
  pushStatus.value = await getPushSubscriptionStatusSnapshot()
}

function pushReasonLabel() {
  if (pushStatus.value.reason === 'subscribed') return 'Sottoscrizione push attiva su questo device.'
  if (pushStatus.value.reason === 'subscription-required') return 'Sottoscrizione non ancora attiva.'
  if (pushStatus.value.reason === 'missing-vapid-public-key') {
    return 'Manca VITE_VAPID_PUBLIC_KEY: configurala in pwa/.env.local e nelle GitHub Variables (deploy) con pwa/scripts/setup-production-deploy.sh --set-gh.'
  }
  return 'Push API non supportata in questo ambiente.'
}

async function refreshUpcomingReminderRows() {
  upcomingReminderRows.value = await listUpcomingReminderNotifications24h()
}

function notificationReasonLabel() {
  if (notificationStatus.value.reason === 'ready') return 'Pronte per promemoria e test.'
  if (notificationStatus.value.reason === 'blocked-by-browser') return 'Bloccate dal browser/dispositivo.'
  if (notificationStatus.value.reason === 'permission-required') return 'Richiedono consenso utente.'
  return 'Notification API non supportata su questo ambiente.'
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

async function runReminderNotificationCheck() {
  notificationBusy.value = true
  notificationMessage.value = ''
  try {
    await triggerReminderNotificationsCheck()
    notificationMessage.value = 'Controllo promemoria imminenti eseguito.'
  } catch (err) {
    notificationMessage.value = `Errore controllo promemoria: ${err.message}`
  } finally {
    notificationBusy.value = false
  }
}

async function enablePushSubscription() {
  notificationBusy.value = true
  notificationMessage.value = ''
  try {
    pushStatus.value = await subscribeToPushNotifications()
    notificationMessage.value = pushStatus.value.subscribed
      ? 'Sottoscrizione Push API attiva.'
      : 'Sottoscrizione push non attivata.'
  } catch (err) {
    notificationMessage.value = `Errore sottoscrizione push: ${err.message}`
  } finally {
    notificationBusy.value = false
  }
}

async function disablePushSubscription() {
  notificationBusy.value = true
  notificationMessage.value = ''
  try {
    pushStatus.value = await unsubscribeFromPushNotifications()
    notificationMessage.value = 'Sottoscrizione push rimossa da questo dispositivo.'
  } catch (err) {
    notificationMessage.value = `Errore disattivazione push: ${err.message}`
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
  await refreshInvitedProfiles()
  await refreshSecurityInfo()
  refreshNotificationStatus()
  await refreshPushStatus()
  await refreshUpcomingReminderRows()
  await refreshBedSequenceSettings()
  await refreshSeedStatus()
  hydrateProfileForm()
})

watch(currentUser, () => {
  hydrateProfileForm()
})

async function handleToggleTestData() {
  if (!canManageTestData.value) return

  const shouldClear = seedActionMode.value === 'clear'
  
  // First confirmation dialog: operation to perform
  const confirmed1 = shouldClear
    ? await openConfirmDialog({
      title: 'Conferma rimozione dati di test',
      message: 'Rimuovere tutti i dati di test dal database locale?',
      details: 'Questa operazione elimina i dataset demo locali per ripartire da uno stato pulito.',
      confirmText: 'Rimuovi dati',
      cancelText: 'Annulla',
      tone: 'danger',
    })
    : await openConfirmDialog({
      title: 'Conferma import dati di test',
      message: 'Generare e importare dati di test nel database locale?',
      details: 'I dati demo esistenti verranno prima rimossi, poi ricreati con il pacchetto realistico.',
      confirmText: 'Importa dati',
      cancelText: 'Annulla',
      tone: 'primary',
    })
  if (!confirmed1) return

  // Second confirmation dialog: production environment warning (only if loading data)
  if (!shouldClear) {
    const confirmed2 = await openConfirmDialog({
      title: '⚠️ ATTENZIONE: Ambiente di produzione?',
      message: 'I dati archiviati verranno danneggiati se si procede in produzione.',
      details: 'I dati di test sostituiranno i dati effettivi. Utilizzare SOLO in ambiente di sviluppo/test. I dati di produzione saranno PERDUTI.',
      confirmText: 'Proceedi comunque (Sviluppo)',
      cancelText: 'Annulla (Salva produzione)',
      tone: 'danger',
    })
    if (!confirmed2) return
  }

  seedBusy.value = true
  seedMessage.value = ''

  try {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    if (shouldClear) {
      const [legacyResult, realisticResult] = await Promise.all([
        clearSeedData({ allowInProduction: true }),
        clearRealisticSeedData({ allowInProduction: true }),
      ])
      const cleared = Boolean(legacyResult?.cleared || realisticResult?.cleared)
      seedLoaded.value = false
      seedActionMode.value = 'load'
      seedMessage.value = cleared
        ? 'Dati di test rimossi.'
        : 'Nessun dato di test presente da rimuovere.'
      if (!cleared) await refreshSeedStatus()
      
      // Log the removal to audit log
      if (cleared) {
        await db.activityLog.add({
          entityType: 'seeds',
          entityId: 'seed_data',
          action: 'seed_data_cleared',
          deviceId,
          operatorId: currentUser.value?.login ?? null,
          ts: now,
          details: 'Dati di test rimossi manualmente',
        })
      }
    } else {
      await Promise.all([
        clearSeedData({ allowInProduction: true }),
        clearRealisticSeedData({ allowInProduction: true }),
      ])
      const stats = await loadRealisticSeedData({ allowInProduction: true })
      seedLoaded.value = true
      seedActionMode.value = 'clear'
      seedMessage.value = `Importati dati di test: ${stats.drugs} farmaci, ${stats.hosts} ospiti, ${stats.stockBatches} confezioni, ${stats.therapies} terapie, ${stats.movements ?? 0} movimenti, ${stats.reminders ?? 0} promemoria, ${stats.activityLog ?? 0} eventi audit, ${stats.rooms} stanze, ${stats.beds} letti, ${stats.operators ?? 0} operatori demo.`
      
      // Log the generation to audit log
      await db.activityLog.add({
        entityType: 'seeds',
        entityId: 'seed_data',
        action: 'seed_data_loaded',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
        details: `Dati di test caricati: ${stats.drugs} farmaci, ${stats.hosts} ospiti, ${stats.stockBatches} confezioni, ${stats.therapies} terapie, ${stats.reminders ?? 0} promemoria`,
      })
    }
  } catch (err) {
    seedMessage.value = `Errore gestione dati di test: ${err.message}`
  } finally {
    seedBusy.value = false
  }
}

async function applyAuthEventFilter() {
  await refreshSecurityInfo()
}

async function runSync() {
  syncMessage.value = 'Sincronizzazione in corso…'
  try {
    const result = await fullSync(accessToken.value)
    datasetVersion.value = await getSetting('datasetVersion')
    gistId.value = await getSetting('gistId')
    await refreshPendingConflicts()
    
    // Format success message based on result
    if (result.bootstrapped) {
      syncMessage.value = 'Sincronizzazione inizializzata con successo'
    } else if (result.downloaded) {
      syncMessage.value = `Dati scaricati (versione ${result.datasetVersion})`
      if (result.conflicts && result.conflicts.length > 0) {
        syncMessage.value += ` - ${result.conflicts.length} conflitti rilevati`
      }
    } else if (result.uploaded) {
      syncMessage.value = `Dati caricati (versione ${result.datasetVersion})`
    } else if (result.upToDate) {
      syncMessage.value = 'Dati già sincronizzati'
    } else if (result.blocked) {
      syncMessage.value = `Sincronizzazione bloccata: ${result.conflicts} conflitti da risolvere`
    } else {
      syncMessage.value = JSON.stringify(result)
    }
  } catch (err) {
    const formatted = formatUserError('sincronizzazione', err)
    syncMessage.value = `${formatted.title}: ${formatted.message}`
    
    // Add suggested actions if available
    if (formatted.actions && formatted.actions.length > 0) {
      syncMessage.value += '\n\nAzioni suggerite:\n' + formatted.actions.map(a => `• ${a}`).join('\n')
    }
    
    console.error('[ImpostazioniView] Sync error:', formatted)
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
    const choiceLabel = result.choice === 'remote' ? 'remota' : 'locale'
    syncMessage.value = `Conflitto risolto (${choiceLabel}). Restanti: ${result.remaining}`
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

function onBackupFileChange(event) {
  selectedBackupFile.value = event.target?.files?.[0] ?? null
}

async function restoreBackup() {
  backupRestoreMessage.value = ''
  if (!selectedBackupFile.value) {
    backupRestoreMessage.value = 'Seleziona prima un file backup JSON.'
    return
  }

  const confirmed = await openConfirmDialog({
    title: 'Conferma restore backup',
    message: 'Il restore sovrascrive i dati locali correnti. Procedere?',
    details: 'Usa questa funzione solo per recovery o upgrade controllato. Dopo il restore esegui una sincronizzazione manuale.',
    confirmText: 'Ripristina backup',
    cancelText: 'Annulla',
    tone: 'danger',
  })
  if (!confirmed) return

  backupRestoreBusy.value = true
  try {
    const jsonText = await selectedBackupFile.value.text()
    const result = await importBackupJson(jsonText, {
      operatorId: currentUser.value?.login ?? null,
    })
    await Promise.all([
      refreshPendingConflicts(),
      refreshUsers(),
      refreshInvitedProfiles(),
      refreshUpcomingReminderRows(),
    ])
    datasetVersion.value = await getSetting('datasetVersion')
    backupRestoreMessage.value = `Restore completato: versione ${result.sourceDatasetVersion}, record ripristinati ${Object.values(result.restoredRows).reduce((a, b) => a + b, 0)}.`
    selectedBackupFile.value = null
  } catch (err) {
    backupRestoreMessage.value = `Errore restore: ${err.message}`
  } finally {
    backupRestoreBusy.value = false
  }
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

async function submitProfileUpdate() {
  profileBusy.value = true
  profileMessage.value = ''

  try {
    await updateCurrentProfile({
      firstName: profileFirstName.value,
      lastName: profileLastName.value,
      phone: profilePhone.value,
      email: profileEmail.value,
    })
    await refreshUsers()
    profileMessage.value = 'Profilo aggiornato con successo.'
  } catch (err) {
    profileMessage.value = `Errore profilo: ${err.message}`
  } finally {
    profileBusy.value = false
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
  const confirmed = await confirmDeleteUser(username)
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

async function handleInviteUser() {
  if (!canManageInvites.value) return
  if (!inviteFirstName.value.trim() || !inviteLastName.value.trim() || !inviteEmail.value.trim()) return

  inviteBusy.value = true
  inviteMessage.value = ''
  try {
    await sendInviteLink({
      firstName: inviteFirstName.value.trim(),
      lastName: inviteLastName.value.trim(),
      email: inviteEmail.value.trim(),
    })
    await refreshInvitedProfiles()
    inviteMessage.value = `Invito inviato a ${inviteEmail.value.trim()}.`
    inviteFirstName.value = ''
    inviteLastName.value = ''
    inviteEmail.value = ''
  } catch (err) {
    inviteMessage.value = `Errore invito: ${err.message}`
  } finally {
    inviteBusy.value = false
  }
}
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Impostazioni</h2>
      <button class="help-btn" @click="goToHelpSection('impostazioni')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Account operatore</strong></p>
      <p class="muted">Username: {{ currentUser?.username }}</p>
      <p class="muted">Nome: {{ currentUser?.firstName || '—' }} {{ currentUser?.lastName || '' }}</p>
      <p class="muted">Telefono: {{ currentUser?.phone || '—' }}</p>
      <p class="muted">Email: {{ currentUser?.email || '—' }}</p>
      <p class="muted">Ruolo: {{ currentUser?.role === 'admin' ? 'amministratore' : 'operatore' }}</p>
      <p class="muted">Sincronizzazione GitHub: @{{ currentUser?.login }}<span v-if="currentUser?.name !== currentUser?.login"> ({{ currentUser?.name }})</span></p>
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
      <p><strong>Profilo personale</strong></p>
      <div class="import-form" style="margin-top:.5rem">
        <label>
          Nome profilo
          <input v-model="profileFirstName" type="text" autocomplete="given-name" />
        </label>

        <label>
          Cognome profilo
          <input v-model="profileLastName" type="text" autocomplete="family-name" />
        </label>

        <label>
          Telefono profilo
          <input v-model="profilePhone" type="tel" autocomplete="tel" placeholder="+39 333 1234567" />
        </label>

        <label>
          Email profilo
          <input v-model="profileEmail" type="email" autocomplete="email" />
        </label>

        <button :disabled="profileBusy || !profileFirstName || !profileLastName || !profileEmail" @click="submitProfileUpdate">
          {{ profileBusy ? 'Aggiornamento profilo...' : 'Aggiorna profilo' }}
        </button>
      </div>
      <p v-if="profileMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ profileMessage }}</p>
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

        <p class="muted" style="font-size:.8rem">
          Regole: 10+ caratteri, maiuscola, minuscola, numero e simbolo.<br />
          Verifica: {{ passwordPolicyState.minLength ? 'ok' : 'no' }} lunghezza ·
          {{ passwordPolicyState.hasUppercase ? 'ok' : 'no' }} maiuscola ·
          {{ passwordPolicyState.hasLowercase ? 'ok' : 'no' }} minuscola ·
          {{ passwordPolicyState.hasDigit ? 'ok' : 'no' }} numero ·
          {{ passwordPolicyState.hasSymbol ? 'ok' : 'no' }} simbolo
        </p>

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
      <p class="muted" style="margin-top:.25rem">Gestione utenti consentita solo ad account amministratore. Azioni disponibili per utenti di prova.</p>

      <p v-if="!canManageUsers" class="muted" style="margin-top:.5rem">
        Il tuo account non ha privilegi amministratore: puoi visualizzare solo il tuo profilo.
      </p>

      <div v-if="canManageUsers" class="dataset-frame" style="margin-top:.75rem;max-height:18rem">
        <table class="conflict-table" style="min-width:980px">
          <thead>
            <tr>
              <th>Username</th>
              <th>Nome</th>
              <th>Cognome</th>
              <th>Telefono</th>
              <th>Email</th>
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
              <td>{{ user.firstName || '—' }}</td>
              <td>{{ user.lastName || '—' }}</td>
              <td>{{ user.phone || '—' }}</td>
              <td>{{ user.email || '—' }}</td>
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
      </div>

      <div v-if="canManageInvites" class="import-form" style="margin-top:.75rem">
        <p><strong>Invita nuovo utente via email</strong></p>
        <label>
          Nome
          <input v-model="inviteFirstName" type="text" autocomplete="given-name" />
        </label>
        <label>
          Cognome
          <input v-model="inviteLastName" type="text" autocomplete="family-name" />
        </label>
        <label>
          Email
          <input v-model="inviteEmail" type="email" autocomplete="email" />
        </label>
        <button :disabled="inviteBusy || !inviteFirstName || !inviteLastName || !inviteEmail" @click="handleInviteUser">
          {{ inviteBusy ? 'Invio invito…' : 'Invia link di invito' }}
        </button>
        <p v-if="inviteMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ inviteMessage }}</p>
      </div>

      <div v-if="canManageProfiles" style="margin-top:.85rem">
        <p><strong>Profili invitati (Supabase)</strong></p>
        <p class="muted" style="margin-top:.25rem;font-size:.85rem">
          Elenco profili acquisiti dal session recovery/invite flow e salvati localmente.
        </p>

        <table class="conflict-table" style="margin-top:.5rem">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nome</th>
              <th>Cognome</th>
              <th>Invitato da</th>
              <th>Ultimo accesso</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="profile in invitedProfiles" :key="profile.email">
              <td>{{ profile.email }}</td>
              <td>{{ profile.firstName || '—' }}</td>
              <td>{{ profile.lastName || '—' }}</td>
              <td>{{ profile.invitedBy || '—' }}</td>
              <td>{{ profile.lastSeenAt || profile.acceptedAt || '—' }}</td>
            </tr>
            <tr v-if="invitedProfiles.length === 0">
              <td colspan="5" class="muted">Nessun profilo invitato acquisito localmente.</td>
            </tr>
          </tbody>
        </table>
        <button style="margin-top:.5rem" :disabled="usersBusy || inviteBusy" @click="refreshInvitedProfiles">
          Aggiorna profili invitati
        </button>
        <p v-if="invitedProfilesMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ invitedProfilesMessage }}</p>
      </div>

      <div v-if="canManageTestData" style="margin-top:.85rem;padding:.75rem;border:1px dashed #d8b154;border-radius:.55rem">
        <p><strong>Dati di test (live)</strong></p>
        <p class="muted" style="margin-top:.25rem">
          Usa questo pulsante per importare rapidamente dati di test o per ripulirli.
          Il testo del pulsante cambia automaticamente in base allo stato corrente.
        </p>
        <p class="muted" style="margin-top:.25rem;font-size:.85rem">
          Pacchetto: {{ seedStats.drugs }} farmaci · {{ seedStats.hosts }} ospiti ·
          {{ seedStats.stockBatches }} confezioni · {{ seedStats.therapies }} terapie ·
          {{ seedStats.movements }} movimenti · {{ seedStats.reminders }} promemoria
        </p>
        <button style="margin-top:.65rem" :disabled="seedBusy" @click="handleToggleTestData">
          {{ testDataActionLabel }}
        </button>
        <p v-if="seedLoaded && !seedMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">
          Stato: dati di test presenti nel database locale.
        </p>
        <p v-if="seedMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ seedMessage }}</p>
      </div>

      <p v-if="usersMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ usersMessage }}</p>
    </div>

    <div class="card">
      <p><strong>Notifiche promemoria</strong></p>
      <p class="muted" style="margin-top:.25rem">Supporto browser: {{ notificationStatus.supported ? 'si' : 'no' }}</p>
      <p class="muted">Permesso: {{ notificationStatus.permission }}</p>
      <p class="muted">Stato: {{ notificationStatus.enabled ? 'abilitate' : 'non abilitate' }}</p>
      <p class="muted">Dettaglio: {{ notificationReasonLabel() }}</p>

      <p v-if="!notificationStatus.supported" class="muted" style="margin-top:.5rem;font-size:.8rem">
        Fallback operativo: usa la vista Promemoria come agenda locale e abilita notifiche da un browser compatibile su desktop o Android.
      </p>

      <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button :disabled="notificationBusy || !notificationStatus.supported" @click="enableNotifications">
          {{ notificationBusy ? 'Richiesta...' : 'Abilita notifiche' }}
        </button>
        <button :disabled="notificationBusy || !notificationStatus.enabled" @click="runNotificationTest">
          Invia notifica test
        </button>
        <button :disabled="notificationBusy || !notificationStatus.enabled" @click="runReminderNotificationCheck">
          Verifica promemoria imminenti
        </button>
        <button :disabled="notificationBusy" @click="refreshNotificationStatus">
          Aggiorna stato
        </button>
      </div>

      <p style="margin-top:.95rem"><strong>Web Push API (base)</strong></p>
      <p class="muted" style="margin-top:.25rem">Supporto Push API: {{ pushStatus.supported ? 'si' : 'no' }}</p>
      <p class="muted">VAPID public key: {{ pushStatus.hasVapidKey ? 'configurata' : 'mancante' }}</p>
      <p class="muted">Stato sottoscrizione: {{ pushStatus.subscribed ? 'attiva' : 'non attiva' }}</p>
      <p class="muted">Dettaglio: {{ pushReasonLabel() }}</p>

      <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button :disabled="notificationBusy || !pushStatus.supported || !pushStatus.hasVapidKey" @click="enablePushSubscription">
          Attiva sottoscrizione push
        </button>
        <button :disabled="notificationBusy || !pushStatus.subscribed" @click="disablePushSubscription">
          Disattiva sottoscrizione push
        </button>
        <button :disabled="notificationBusy" @click="refreshPushStatus">
          Aggiorna stato push
        </button>
      </div>

      <p style="margin-top:.95rem"><strong>Promemoria prossime 24h (pending)</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Questa lista supporta il controllo operativo dei reminder candidati alla notifica nelle prossime 24 ore.
      </p>
      <button style="margin-top:.5rem" :disabled="notificationBusy" @click="refreshUpcomingReminderRows">
        Aggiorna lista 24h
      </button>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Orario</th>
            <th>Ospite</th>
            <th>Farmaco</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="reminder in upcomingReminderRows" :key="reminder.id">
            <td>{{ formatScheduledAt(reminder.scheduledAt) }}</td>
            <td>{{ reminder.hostLabel }}</td>
            <td>{{ reminder.drugLabel }}</td>
            <td>{{ reminder.stato }}</td>
          </tr>
          <tr v-if="upcomingReminderRows.length === 0">
            <td colspan="4" class="muted">Nessun promemoria pending nelle prossime 24 ore.</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top:.95rem"><strong>Sequenza letti per Promemoria</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Ordina il giro operativo: Promemoria usa prima l’orario, poi questa sequenza letti.
      </p>
      <div style="margin-top:.5rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button :disabled="bedSequenceBusy" @click="refreshBedSequenceSettings">Aggiorna letti</button>
        <button :disabled="bedSequenceBusy || bedSequenceRows.length === 0" @click="resetBedSequence">Ripristina default</button>
      </div>

      <div class="dataset-frame" style="margin-top:.75rem;max-height:18rem">
        <table class="conflict-table" style="min-width:700px">
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Letto</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in bedSequenceRows" :key="item.bedId">
              <td>{{ index + 1 }}</td>
              <td>{{ formatBedSequenceLabel(item) }}</td>
              <td>
                <button type="button" style="margin-right:.35rem" :disabled="index === 0" @click="moveBedSequence(index, -1)">Su</button>
                <button type="button" :disabled="index === bedSequenceRows.length - 1" @click="moveBedSequence(index, 1)">Giù</button>
              </td>
            </tr>
            <tr v-if="bedSequenceRows.length === 0">
              <td colspan="3" class="muted">Nessun letto attivo disponibile per la sequenza.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="notificationMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ notificationMessage }}</p>
      <p v-if="bedSequenceMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ bedSequenceMessage }}</p>
    </div>

    <div class="card">
      <p><strong>Sicurezza sessione</strong></p>
      <p class="muted" style="margin-top:.25rem">TTL sessione: {{ sessionInfo?.ttlMinutes ?? '—' }} minuti</p>
      <p class="muted">Scadenza: {{ sessionInfo?.expiresAt ?? '—' }}</p>
      <p class="muted">Ultima attivita': {{ sessionInfo?.lastActivityAt ?? '—' }}</p>
      <p class="muted">Stato: {{ sessionInfo?.isExpired ? 'scaduta' : 'attiva' }}</p>
      <p class="muted">Credenziali: {{ credentialPolicy?.warning ?? '—' }}</p>
      <p class="muted">Scadenza credenziali: {{ credentialPolicy?.expiresAt ?? '—' }}</p>

      <button style="margin-top:.75rem" @click="refreshSecurityInfo">Aggiorna stato sicurezza</button>

      <div class="import-form" style="margin-top:.75rem">
        <label>
          Filtro audit accessi
          <input v-model="authEventFilter" type="text" placeholder="es. accesso, scadenza, amministratore" />
        </label>
        <button @click="applyAuthEventFilter">Applica filtro</button>
      </div>

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
            <td>{{ event.operatorId ?? 'anonimo' }}</td>
          </tr>
          <tr v-if="authEvents.length === 0">
            <td colspan="3" class="muted">Nessun evento accessi disponibile.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <p><strong>Dispositivo</strong></p>
      <p class="muted">Device ID: {{ deviceId ?? '— (non ancora assegnato)' }}</p>
      <p class="muted">Versione dataset locale: {{ datasetVersion ?? '—' }}</p>
    </div>

    <div class="card">
      <p><strong>Sincronizzazione manuale</strong></p>
      <button style="margin-top:.75rem" @click="runSync">Sincronizza ora</button>
      <p v-if="syncMessage" class="muted" style="margin-top:.5rem;font-size:.8rem;white-space:pre-line">{{ syncMessage }}</p>
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
      <p class="muted">Scarica tutti i dati come file JSON oppure ripristina un backup per upgrade sicuri.</p>
      <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button @click="downloadBackup">Scarica backup JSON</button>
        <input type="file" accept="application/json,.json" @change="onBackupFileChange" />
        <button :disabled="backupRestoreBusy || !selectedBackupFile" @click="restoreBackup">
          {{ backupRestoreBusy ? 'Restore in corso…' : 'Ripristina backup da file' }}
        </button>
      </div>
      <p class="muted" style="margin-top:.5rem;font-size:.8rem">
        Best practice: esegui prima "Scarica backup JSON", poi restore, poi "Sincronizza ora".
      </p>
      <p v-if="backupRestoreMessage" class="muted" style="margin-top:.5rem;font-size:.8rem">{{ backupRestoreMessage }}</p>
    </div>

    <div class="card">
      <p><strong>Import CSV guidato</strong></p>
      <p class="muted" style="margin-top:.25rem">Supporta simulazione senza scrittura con report righe scartate secondo mapping v1.</p>

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
          Esegui simulazione (nessuna scrittura)
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
          Modalita': {{ importReport.dryRun ? 'simulazione' : 'scrittura applicata' }}
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
