<script setup>
import { useAuth } from '../services/auth'
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { buildHomeDashboardKpis } from '../services/homeDashboard'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { formatBuildTimestamp, getBuildTimestampIso, getDeployLabel } from '../services/buildInfo'


const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const datasetVersion = ref(null)
const syncStatus = ref('—')
const homeKpi = ref(null)
const buildTimestampLabel = formatBuildTimestamp('it-IT')
const buildTimestampIso = getBuildTimestampIso()
const deployLabel = getDeployLabel()

import { computed } from 'vue'
const attentionItems = computed(() => {
  if (!homeKpi.value) return []
  const items = []
  // Overdue reminders
  if (homeKpi.value.remindersPending > 0) {
    items.push({
      type: 'reminder',
      label: `${homeKpi.value.remindersPending} promemoria da eseguire oggi`,
      to: '/promemoria',
      tooltip: 'Vai ai promemoria da eseguire',
    })
  }
  // Low/critical stock
  if (homeKpi.value.stockCritical > 0) {
    items.push({
      type: 'stock',
      label: `${homeKpi.value.stockCritical} farmaci in scorta critica`,
      to: '/scorte',
      tooltip: 'Vai a scorte critiche',
    })
  } else if (homeKpi.value.stockHigh > 0) {
    items.push({
      type: 'stock',
      label: `${homeKpi.value.stockHigh} farmaci in scorta bassa`,
      to: '/scorte',
      tooltip: 'Vai a scorte basse',
    })
  }
  // Pending sync
  if (homeKpi.value.pendingSync > 0) {
    items.push({
      type: 'sync',
      label: `Sincronizzazione in attesa (${homeKpi.value.pendingSync})`,
      to: '/impostazioni',
      tooltip: 'Visualizza dettagli sincronizzazione',
    })
  }
  return items
})

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString('it-IT', { hour12: false })
}

async function refreshHomeKpi() {
  homeKpi.value = await buildHomeDashboardKpis()
  datasetVersion.value = homeKpi.value.datasetVersion
  syncStatus.value = homeKpi.value.pendingSync > 0
    ? `In coda ${homeKpi.value.pendingSync} operazioni`
    : 'Allineato (nessuna operazione in coda)'
}

onMounted(async () => {
  await refreshHomeKpi()
})
</script>

<template>
  <div class="view home-view">
    <div class="card home-intro">
      <div class="view-heading">
        <h2>Cruscotto MediTrace</h2>
        <button class="help-btn" @click="goToHelpSection('home')">Aiuto</button>
      </div>
      <p class="muted" style="margin-top:.35rem">
        Monitoraggio scorte, terapie e promemoria con controllo operativo continuo.
      </p>
    </div>

    <div class="card attention-panel" v-if="attentionItems.length">
      <p><strong>⚠️ Attenzione</strong></p>
      <ul class="attention-list">
        <li v-for="item in attentionItems" :key="item.type" style="margin-bottom:.3rem">
          <RouterLink :to="item.to" :title="item.tooltip" class="attention-link">
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </div>

    <div class="card">
      <p><strong>📋 Riepilogo turno di oggi</strong></p>
      <div v-if="homeKpi && homeKpi.remindersToday > 0" style="display:flex;gap:1.5em;flex-wrap:wrap;margin-top:.5rem">
        <span style="color:#22c55e;font-weight:600">✅ Eseguiti: {{ homeKpi.remindersDone }}</span>
        <span style="color:#f59e42;font-weight:600">⏳ Da eseguire: {{ homeKpi.remindersPending }}</span>
        <span v-if="homeKpi.remindersPostponed > 0" style="color:#3b82f6;font-weight:600">🔄 Posticipati: {{ homeKpi.remindersPostponed }}</span>
        <span v-if="homeKpi.remindersSkipped > 0" style="color:#ef4444;font-weight:600">❌ Saltati: {{ homeKpi.remindersSkipped }}</span>
      </div>
      <p v-else class="muted" style="margin-top:.5rem">Nessun promemoria pianificato per oggi.</p>
      <div v-if="homeKpi && homeKpi.remindersToday > 0" style="margin-top:.5rem">
        <RouterLink to="/promemoria" class="attention-link">Vai ai promemoria →</RouterLink>
      </div>
    </div>

    <div class="card">
      <p>Benvenuto/a, <strong>{{ currentUser?.name }}</strong></p>
      <p class="muted">Ruolo attivo: {{ currentUser?.role === 'admin' ? 'amministratore' : 'operatore' }}</p>
    </div>

    <div class="card">
      <p><strong>Stato sincronizzazione</strong></p>
      <p class="muted">
        Versione dataset locale: {{ datasetVersion ?? '—' }}<br />
        Stato: {{ syncStatus }}<br />
        Ultima sincronizzazione: {{ formatDateTime(homeKpi?.lastSyncAt) }}
      </p>
    </div>

    <div class="card">
      <p><strong>Navigazione rapida</strong></p>
      <div class="dashboard-nav">
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/promemoria" aria-label="Shortcut cruscotto 1">Promemoria</RouterLink>
          <p class="muted">Promemoria somministrazioni e notifiche pendenti.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/terapie" aria-label="Shortcut cruscotto 2">Terapie</RouterLink>
          <p class="muted">Piani terapici attivi per ospite: dosaggi, frequenze e storico.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/scorte" aria-label="Shortcut cruscotto 3">Scorte</RouterLink>
          <p class="muted">Monitoraggio scorte, KPI operativi e report consumi farmaci.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/movimenti" aria-label="Shortcut cruscotto 4">Movimenti</RouterLink>
          <p class="muted">Storico movimenti di magazzino: carichi, scarichi e rettifiche.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/ospiti" aria-label="Shortcut cruscotto 5">Ospiti</RouterLink>
          <p class="muted">Registro ospiti con assegnazione residenza e terapie attive.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/farmaci" aria-label="Shortcut cruscotto 6">Farmaci</RouterLink>
          <p class="muted">Catalogo principi attivi, classi terapeutiche e schede farmaco.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/residenze" aria-label="Shortcut cruscotto 7">Residenze</RouterLink>
          <p class="muted">Gestione residenze operative e capienza ospiti per sede.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/impostazioni" aria-label="Shortcut cruscotto 8">Impostazioni</RouterLink>
          <p class="muted">Configurazione utenti, import dati, notifiche e gestione sistema.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/audit" aria-label="Shortcut cruscotto 9">Audit</RouterLink>
          <p class="muted">Registro completo delle attività e operazioni di sistema.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/manuale" aria-label="Shortcut cruscotto 10">Guida</RouterLink>
          <p class="muted">Guida utente con istruzioni su ogni sezione dell'applicazione.</p>
        </div>
      </div>
    </div>

    <div class="card">
      <p><strong>Versione build</strong></p>
      <p class="muted" :title="`Build ISO: ${buildTimestampIso}`">
        Data/ora build: {{ buildTimestampLabel }}
        <span v-if="deployLabel"><br/>Deploy: {{ deployLabel }}</span>
      </p>
    </div>
  </div>
</template>
