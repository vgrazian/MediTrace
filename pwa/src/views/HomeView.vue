<script setup>
import { useAuth } from '../services/auth'
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { buildHomeDashboardKpis } from '../services/homeDashboard'

const { currentUser } = useAuth()
const datasetVersion = ref(null)
const syncStatus = ref('—')
const homeKpi = ref(null)

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString()
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
    <div class="card">
      <h2>MediTrace Dashboard</h2>
      <p class="muted" style="margin-top:.35rem">
        Monitoraggio scorte, terapie e promemoria con controllo operativo continuo.
      </p>
    </div>

    <h2>Dashboard Operativa</h2>

    <div class="card">
      <p>Benvenuto/a, <strong>{{ currentUser?.name }}</strong></p>
      <p class="muted">Ruolo attivo: {{ currentUser?.role === 'admin' ? 'admin' : 'operatore' }}</p>
    </div>

    <div class="card">
      <p><strong>Stato sync</strong></p>
      <p class="muted">
        Dataset version locale: {{ datasetVersion ?? '—' }}<br />
        Stato: {{ syncStatus }}<br />
        Ultima sincronizzazione: {{ formatDateTime(homeKpi?.lastSyncAt) }}
      </p>
    </div>

    <div class="card-grid">
      <div class="card">
        <p><strong>Alert scorte</strong></p>
        <p class="muted" style="margin-top:.3rem">
          Critiche: {{ homeKpi?.stockCritical ?? 0 }} · Alte: {{ homeKpi?.stockHigh ?? 0 }}<br />
          Farmaci monitorati: {{ homeKpi?.monitoredDrugs ?? 0 }}
        </p>
        <RouterLink class="quick-link" to="/scorte">Magazzino KPI</RouterLink>
      </div>

      <div class="card">
        <p><strong>Promemoria oggi</strong></p>
        <p class="muted" style="margin-top:.3rem">
          Totale oggi: {{ homeKpi?.remindersToday ?? 0 }}<br />
          Da eseguire: {{ homeKpi?.remindersPending ?? 0 }} · Eseguiti: {{ homeKpi?.remindersDone ?? 0 }}
        </p>
        <RouterLink class="quick-link" to="/promemoria">Agenda Giornaliera</RouterLink>
      </div>
    </div>

    <div class="card">
      <p><strong>Azioni rapide</strong></p>
      <div class="quick-actions" style="margin-top:.65rem">
        <RouterLink class="quick-link" to="/farmaci">Catalogo</RouterLink>
        <RouterLink class="quick-link" to="/terapie">Piani Terapici</RouterLink>
        <RouterLink class="quick-link" to="/impostazioni">Configura</RouterLink>
      </div>
    </div>
  </div>
</template>
