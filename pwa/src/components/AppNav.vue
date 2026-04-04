<script setup>
import { useAuth } from '../services/auth'

const { currentUser } = useAuth()
</script>

<template>
  <nav class="app-nav">
    <RouterLink to="/" class="brand" aria-label="MediTrace home">
      <img class="brand-mark" src="/branding/santegidio-logo-header.svg" alt="Comunità di Sant'Egidio" />
      <span class="brand-title">MediTrace</span>
    </RouterLink>

    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/farmaci">Farmaci</RouterLink>
    <RouterLink to="/scorte">Scorte</RouterLink>
    <RouterLink to="/terapie">Terapie</RouterLink>
    <RouterLink to="/promemoria">Promemoria</RouterLink>

    <div class="user-area">
      <span class="user-name">{{ currentUser?.name }}</span>
      <RouterLink to="/impostazioni">⚙</RouterLink>
    </div>
  </nav>
</template>
