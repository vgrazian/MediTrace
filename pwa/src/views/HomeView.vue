<script setup>
import { useAuth } from '../services/auth'
import { getSetting } from '../db'
import { ref, onMounted } from 'vue'

const { currentUser } = useAuth()
const datasetVersion = ref(null)
const syncStatus = ref('—')

onMounted(async () => {
  datasetVersion.value = await getSetting('datasetVersion')
})
</script>

<template>
  <div class="view home-view">
    <section class="hero-banner">
      <img src="/branding/meditrace-banner.svg" alt="MediTrace banner" />
      <div class="hero-copy">
        <h1>MediTrace Dashboard</h1>
        <p>Monitoraggio scorte, terapie e promemoria con controllo operativo continuo.</p>
      </div>
    </section>

    <h2>Dashboard</h2>

    <div class="card">
      <p>Benvenuto/a, <strong>{{ currentUser?.name }}</strong></p>
      <p class="muted">Ruolo attivo: {{ currentUser?.role === 'admin' ? 'admin' : 'operatore' }}</p>
    </div>

    <div class="card">
      <p><strong>Stato sync</strong></p>
      <p class="muted">
        Dataset version locale: {{ datasetVersion ?? '—' }}<br />
        Ultima sincronizzazione: — (da implementare)
      </p>
    </div>

    <div class="card-grid">
      <div class="card">
        <p><strong>Alert scorte</strong></p>
        <p class="placeholder-note">Riepilogo scorte in esaurimento — MVP Fase 2</p>
      </div>

      <div class="card">
        <p><strong>Promemoria oggi</strong></p>
        <p class="placeholder-note">Riepilogo promemoria somministrazione — MVP Fase 2</p>
      </div>
    </div>
  </div>
</template>
