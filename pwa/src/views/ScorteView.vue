<script setup>
// MVP Fase 2: scorte per confezione, consumo settimanale, alert esaurimento
// Store: db.stockBatches, db.movements
// Alert: residuo < consumoMedioSettimanale → warning; residuo = 0 → esaurita
</script>

<template>
  <div class="view">
    <h2>Scorte</h2>
    <div class="card">
      <p>Quantità residua per confezione con indicatore esaurimento.</p>
      <p class="placeholder-note">Implementazione — MVP Fase 2</p>
    </div>
  </div>
</template>
