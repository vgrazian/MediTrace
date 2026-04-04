<script setup>
import { useAuth } from '../services/auth'

const { currentUser } = useAuth()
</script>

<template>
  <nav class="app-nav">
    <RouterLink to="/" class="brand" aria-label="MediTrace home">
      <img class="brand-mark" src="/branding/logo-header.svg" alt="Comunità di Sant'Egidio" />
      <span class="brand-title">MediTrace</span>
    </RouterLink>

    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/farmaci">Farmaci</RouterLink>
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
