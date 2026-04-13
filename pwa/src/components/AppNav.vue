<script setup>
import { useAuth } from '../services/auth'

const { currentUser, signOut } = useAuth()
const logoSrc = `${import.meta.env.BASE_URL}branding/logo-header.svg`

async function handleSignOut() {
  await signOut()
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
    <RouterLink to="/stanze">Stanze</RouterLink>
    <RouterLink to="/ospiti">Ospiti</RouterLink>
    <RouterLink to="/scorte">Scorte</RouterLink>
    <RouterLink to="/movimenti">Movimenti Magazzino</RouterLink>
    <RouterLink to="/terapie">Terapie</RouterLink>
    <RouterLink to="/promemoria">Promemoria</RouterLink>
    <RouterLink to="/audit">Audit</RouterLink>
    <RouterLink to="/manuale">Manuale</RouterLink>

    <div class="user-area">
      <RouterLink to="/impostazioni" class="user-name user-name-link">{{ currentUser?.name }}</RouterLink>
      <RouterLink to="/impostazioni">⚙</RouterLink>
      <button type="button" @click="handleSignOut">Logout</button>
    </div>
  </nav>
</template>
