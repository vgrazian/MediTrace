<script setup>
const appInfo = {
  name: 'MediTrace',
  version: 'Week 5',
  mission: 'Supportare la gestione quotidiana di terapie, scorte e promemoria in modo semplice e affidabile.',
}
</script>

<template>
  <div class="view">
    <h2>Informazioni</h2>

    <div class="card info-panel">
      <p><strong>{{ appInfo.name }}</strong></p>
      <p class="muted" style="margin-top:.3rem">Versione operativa: {{ appInfo.version }}</p>
      <p style="margin-top:.75rem">{{ appInfo.mission }}</p>
    </div>

    <div class="card info-panel">
      <p><strong>Cosa include l'applicazione</strong></p>
      <ul class="info-list">
        <li>Gestione catalogo farmaci e scorte con KPI operativi.</li>
        <li>Terapie attive per ospite con tracciamento locale e sincronizzazione.</li>
        <li>Promemoria con flusso notifiche e controlli di sicurezza sessione.</li>
      </ul>
    </div>

    <div class="card info-panel">
      <p><strong>Supporto operativo</strong></p>
      <p class="muted" style="margin-top:.35rem">
        Per assistenza interna, aprire una issue nel repository MediTrace indicando dispositivo, passaggi e orario evento.
      </p>
    </div>
  </div>
</template>
