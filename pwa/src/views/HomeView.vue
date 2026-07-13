<script setup>
import { useAuth } from '../services/auth'
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { buildHomeDashboardKpis } from '../services/homeDashboard'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { useSyncState } from '../composables/useSyncState'
import { formatBuildTimestamp, getBuildTimestampIso, getDeployLabel } from '../services/buildInfo'
import { db } from '../db'


const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const { statoSync, dettagli, pendingCount } = useSyncState()
const datasetVersion = ref(null)
const homeKpi = ref(null)
const operatorStats = ref([])
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
  // Pending conflicts
  if (homeKpi.value.pendingConflicts > 0) {
    items.push({
      type: 'conflict',
      label: `${homeKpi.value.pendingConflicts} conflitti da risolvere`,
      to: '/impostazioni',
      tooltip: 'Risolvi i conflitti di sincronizzazione',
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
}

async function loadOperatorStats() {
  try {
    const reminders = await db.reminders.toArray()
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    const todayReminders = reminders.filter(r => {
      if (r.deletedAt) return false
      const when = new Date(r.scheduledAt)
      return !Number.isNaN(when.getTime()) && when >= dayStart && when <= dayEnd
    })

    const byOperator = new Map()
    for (const r of todayReminders) {
      const op = (r.operatore || 'n.d.').trim()
      if (!byOperator.has(op)) byOperator.set(op, { operator: op, total: 0, eseguiti: 0, daEseguire: 0, saltati: 0 })
      const stats = byOperator.get(op)
      stats.total++
      if (r.stato === 'ESEGUITO') stats.eseguiti++
      else if (r.stato === 'SALTATO') stats.saltati++
      else stats.daEseguire++
    }

    operatorStats.value = [...byOperator.values()].sort((a, b) => b.total - a.total)
  } catch {
    operatorStats.value = []
  }
}

onMounted(async () => {
  await refreshHomeKpi()
  await loadOperatorStats()
})
</script>

<template>
  <div class="view home-view">
    <p class="muted" style="text-align:center;margin-bottom:.25rem;font-size:.85rem">
      Monitoraggio scorte, terapie e promemoria con controllo operativo continuo.
    </p>
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

    <!-- Row 1: Riepilogo + Benvenuto -->
    <div class="card-grid">
      <div class="card">
        <p><strong>Riepilogo turno di oggi</strong></p>
        <div v-if="homeKpi && homeKpi.remindersToday > 0" style="display:flex;gap:.6em;flex-wrap:wrap;margin-top:.5rem">
          <span class="kpi-badge kpi-done">Eseguiti: {{ homeKpi.remindersDone }}</span>
          <span class="kpi-badge kpi-pending">Da eseguire: {{ homeKpi.remindersPending }}</span>
          <span v-if="homeKpi.remindersPostponed > 0" class="kpi-badge kpi-postponed">Posticipati: {{ homeKpi.remindersPostponed }}</span>
          <span v-if="homeKpi.remindersSkipped > 0" class="kpi-badge kpi-skipped">Saltati: {{ homeKpi.remindersSkipped }}</span>
        </div>
        <p v-else class="muted" style="margin-top:.5rem">Nessun promemoria pianificato per oggi.</p>
        <div v-if="homeKpi && homeKpi.remindersToday > 0" style="margin-top:.5rem">
          <RouterLink to="/promemoria" class="attention-link">Vai ai promemoria →</RouterLink>
        </div>
      </div>

      <div class="card">
        <p>Benvenuto/a, <strong>{{ currentUser?.name }}</strong></p>
        <p class="muted">Ruolo attivo: {{ currentUser?.role === 'admin' ? 'amministratore' : 'operatore' }}</p>
        <div v-if="currentUser?.role === 'admin'" class="card attention-panel" style="margin-top:.75rem;padding:.6rem .9rem">
          <p style="font-size:.75rem;margin:0">🔑 <strong>Gestione password:</strong> se un operatore dimentica la password, vai su <RouterLink to="/operatori">Operatori →</RouterLink> per assegnarne una nuova.</p>
        </div>
        <div style="margin-top:.75rem">
          <p><strong>Stato sincronizzazione</strong></p>
          <p class="muted" style="margin-top:.25rem">
            {{ dettagli }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="operatorStats.length > 0" class="card">
      <p><strong>👥 Attività operatori di oggi</strong></p>
      <div class="dataset-frame" style="margin-top:.5rem;max-height:12rem;overflow:auto">
        <table class="conflict-table" style="font-size:.9em">
          <thead>
            <tr>
              <th>Operatore</th>
              <th>Eseguiti</th>
              <th>Da fare</th>
              <th>Saltati</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="op in operatorStats" :key="op.operator">
              <td>{{ op.operator }}</td>
              <td style="text-align:center;color:#2e7d32">{{ op.eseguiti }}</td>
              <td style="text-align:center;color:#d97706">{{ op.daEseguire }}</td>
              <td style="text-align:center;color:#991b1b">{{ op.saltati }}</td>
              <td style="text-align:center;font-weight:600">{{ op.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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

    <!-- Versione build (compact footer) -->
    <p class="muted" style="text-align:center;font-size:.78rem;margin-top:.5rem" :title="`Build ISO: ${buildTimestampIso}`">
      Build: {{ buildTimestampLabel }}
      <span v-if="deployLabel"> · {{ deployLabel }}</span>
    </p>
  </div>
</template>
