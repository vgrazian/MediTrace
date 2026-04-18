<script setup>
import { useAuth } from '../services/auth'
import { fullSync } from '../services/sync'

const { currentUser, signOut } = useAuth()
const logoSrc = `${import.meta.env.BASE_URL}branding/logo-header.svg`

async function handleSignOut() {
  await signOut()
}

async function handleSync() {
  try {
    await fullSync()
  } catch (e) {
    // opzionale: mostra errore
  } finally {
    window.location.reload()
  }
}
</script>

<template>
  <nav class="app-nav">
    <div class="brand" aria-label="MediTrace">
      <img class="brand-mark" :src="logoSrc" alt="Comunità di Sant'Egidio" />
      <span class="brand-title">MediTrace</span>
    </div>

    <RouterLink to="/">Cruscotto</RouterLink>
    <RouterLink to="/farmaci">Farmaci</RouterLink>
    <RouterLink to="/residenze">Residenze</RouterLink>
    <RouterLink to="/ospiti">Ospiti</RouterLink>
    <RouterLink to="/scorte">Scorte</RouterLink>
    <RouterLink to="/movimenti">Movimenti</RouterLink>
    <RouterLink to="/terapie">Terapie</RouterLink>
    <RouterLink to="/promemoria">Promemoria</RouterLink>
    <RouterLink to="/audit">Audit</RouterLink>
    <RouterLink to="/manuale">Manuale</RouterLink>

    <div class="user-area">
      <button class="sync-btn" @click="handleSync" title="Sincronizza dati e aggiorna app" aria-label="Sincronizza">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">
          <path d="M11 2v2.5M11 17.5V20M4.22 4.22l1.77 1.77M16.01 16.01l1.77 1.77M2 11h2.5M17.5 11H20M4.22 17.78l1.77-1.77M16.01 5.99l1.77-1.77" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
          <circle cx="11" cy="11" r="7" stroke="#2563eb" stroke-width="2"/>
        </svg>
      </button>
      <RouterLink to="/impostazioni" class="user-name user-name-link">{{ currentUser?.name }}</RouterLink>
      <RouterLink to="/impostazioni">⚙</RouterLink>
      <button type="button" @click="handleSignOut">Logout</button>
    </div>
  </nav>
</template>

<style scoped>
.sync-btn {
  background: none;
  border: none;
  padding: 0 0.5em;
  cursor: pointer;
  outline: none;
  transition: background .2s;
}
.sync-btn:hover {
  background: #e0e7ff;
  border-radius: 6px;
}
</style>
