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
    <div class="card home-intro">
      <h2>Cruscotto MediTrace</h2>
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

    <div class="card-grid">
      <div class="card">
        <p><strong>Azioni rapide</strong></p>
        <div class="quick-actions" style="margin-top:.65rem">
          <RouterLink class="quick-link" to="/farmaci">Catalogo</RouterLink>
          <RouterLink class="quick-link" to="/terapie">Piani Terapici</RouterLink>
          <RouterLink class="quick-link" to="/impostazioni">Impostazioni</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
