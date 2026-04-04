<script setup>
import { useAuth } from '../services/auth'

const { currentUser } = useAuth()
</script>

<template>
  <nav class="app-nav">
    <div class="brand" aria-label="MediTrace">
      <img class="brand-mark" src="/branding/logo-header.svg" alt="Comunità di Sant'Egidio" />
      <span class="brand-title">MediTrace</span>
    </div>

    <RouterLink to="/">Cruscotto</RouterLink>
    <RouterLink to="/farmaci">Farmaci</RouterLink>
    <RouterLink to="/stanze">Stanze</RouterLink>
    <RouterLink to="/ospiti">Ospiti</RouterLink>
    <RouterLink to="/scorte">Scorte</RouterLink>
    <RouterLink to="/movimenti">Movimenti</RouterLink>
    <RouterLink to="/terapie">Terapie</RouterLink>
    <RouterLink to="/promemoria">Promemoria</RouterLink>
    <RouterLink to="/informazioni">Informazioni</RouterLink>

    <div class="user-area">
      <RouterLink to="/impostazioni" class="user-name user-name-link">{{ currentUser?.name }}</RouterLink>
      <RouterLink to="/impostazioni">⚙</RouterLink>
    </div>
  </nav>
</template>
