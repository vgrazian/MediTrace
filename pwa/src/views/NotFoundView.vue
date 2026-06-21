<template>
  <div class="view not-found-view">
    <div class="card" style="text-align:center;padding:3rem 1.5rem">
      <div style="font-size:3rem;color:var(--brand-700);margin-bottom:.75rem;font-family:'Domine',Georgia,serif">404</div>
      <h2 style="margin-bottom:.5rem">Pagina non trovata</h2>
      <p class="muted">
        La pagina che stai cercando non esiste o è stata spostata.
      </p>
      <RouterLink to="/" class="btn btn-primary" style="margin-top:1.25rem;text-decoration:none">
        Torna al cruscotto
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
