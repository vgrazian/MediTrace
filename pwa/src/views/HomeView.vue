<script setup>
import { useAuth } from '../services/auth'
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { buildHomeDashboardKpis } from '../services/homeDashboard'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { formatBuildTimestamp, getBuildTimestampIso } from '../services/buildInfo'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const datasetVersion = ref(null)
const syncStatus = ref('—')
const homeKpi = ref(null)
const buildTimestampLabel = formatBuildTimestamp('it-IT')
const buildTimestampIso = getBuildTimestampIso()

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
          <RouterLink class="quick-link" to="/farmaci" aria-label="Shortcut cruscotto 1">Farmaci</RouterLink>
          <p class="muted">Catalogo principi attivi, classi terapeutiche e schede farmaco.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/ospiti" aria-label="Shortcut cruscotto 2">Ospiti</RouterLink>
          <p class="muted">Registro ospiti con assegnazione stanze, letti e terapie attive.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/stanze" aria-label="Shortcut cruscotto 3">Stanze e Letti</RouterLink>
          <p class="muted">Struttura della residenza: stanze, letti e occupazione corrente.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/terapie" aria-label="Shortcut cruscotto 4">Terapie</RouterLink>
          <p class="muted">Piani terapici attivi per ospite: dosaggi, frequenze e storico.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/scorte" aria-label="Shortcut cruscotto 5">Scorte</RouterLink>
          <p class="muted">Monitoraggio scorte, KPI operativi e report consumi farmaci.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/promemoria" aria-label="Shortcut cruscotto 6">Promemoria</RouterLink>
          <p class="muted">Promemoria somministrazioni e notifiche pendenti.</p>
        </div>
        <div class="dashboard-nav-item">
          <RouterLink class="quick-link" to="/movimenti" aria-label="Shortcut cruscotto 7">Movimenti</RouterLink>
          <p class="muted">Storico movimenti di magazzino: carichi, scarichi e rettifiche.</p>
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
          <RouterLink class="quick-link" to="/manuale" aria-label="Shortcut cruscotto 10">Manuale</RouterLink>
          <p class="muted">Guida utente con istruzioni su ogni sezione dell'applicazione.</p>
        </div>
      </div>
    </div>

    <div class="card">
      <p><strong>Versione build</strong></p>
      <p class="muted" :title="`Build ISO: ${buildTimestampIso}`">
        Data/ora build: {{ buildTimestampLabel }}
      </p>
    </div>
  </div>
</template>
