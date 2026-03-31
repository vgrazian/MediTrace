<script setup>
import { useAuth } from '../services/auth'

const { currentUser, signOut } = useAuth()
</script>

<template>
  <nav class="app-nav">
    <span class="brand">MediTrace</span>

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
