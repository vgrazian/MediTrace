<script setup>
import { ref } from 'vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { helpContent, manualeSezioni } from '../data/helpContent'
import pkg from '../../package.json'

const appVersion = pkg.version

const route = useRoute()
const router = useRouter()
const baseUrl = String(import.meta.env.BASE_URL || '/')

const csvImportSamples = [
  { label: '01_CatalogoFarmaci.sample.csv', file: '01_CatalogoFarmaci.sample.csv' },
  { label: '02_ConfezioniMagazzino.sample.csv', file: '02_ConfezioniMagazzino.sample.csv' },
  { label: '03_Ospiti.sample.csv', file: '03_Ospiti.sample.csv' },
  { label: '04_TerapieAttive.sample.csv', file: '04_TerapieAttive.sample.csv' },
  { label: '05_Movimenti.sample.csv', file: '05_Movimenti.sample.csv' },
  { label: '09_PromemoriaSomministrazioni.sample.csv', file: '09_PromemoriaSomministrazioni.sample.csv' },
]

function csvSampleHref(fileName) {
  return `${baseUrl}csv-samples/${fileName}`
}

const returnPath = computed(() => {
  const from = route.query.from
  if (!from || typeof from !== 'string') return ''
  return from
})

const fromSection = computed(() => {
  const key = route.query.helpFrom
  if (!key || typeof key !== 'string') return ''
  const section = manualeSezioni.find(item => item.key === key)
  return section?.etichetta || key
})

async function goBackToSource() {
  if (!returnPath.value) return
  await router.push(returnPath.value)
}

// Track which sections are expanded
const expanded = ref(Object.fromEntries(manualeSezioni.map((s, i) => [s.key, i === 0])))

function toggle(key) {
  expanded.value[key] = !expanded.value[key]
}
</script>

<template>
  <div class="view manuale-view">
    <h2>Manuale Utente</h2>

    <div v-if="returnPath" class="card" style="padding:.65rem .85rem">
      <div class="panel-breadcrumb" style="margin:0;padding:0;border:none">
        <button type="button" class="panel-breadcrumb-link" @click="goBackToSource">Torna alla pagina precedente</button>
        <span class="panel-breadcrumb-current">/</span>
        <span class="panel-breadcrumb-current">{{ fromSection || 'Aiuto contestuale' }}</span>
      </div>
    </div>

    <div class="card manuale-intro">
      <p><strong>MediTrace</strong> <span class="muted">v{{ appVersion }}</span></p>
      <p style="margin-top:.45rem">
        Supporta la gestione quotidiana di terapie, scorte e promemoria in strutture di cura, con controllo operativo continuo anche offline.
      </p>
      <ul class="info-list" style="margin-top:.6rem">
        <li>Gestione catalogo farmaci e scorte con KPI operativi.</li>
        <li>Terapie attive per ospite con tracciamento locale e sincronizzazione.</li>
        <li>Promemoria con flusso notifiche e controlli di sicurezza sessione.</li>
        <li>Stanze e letti con assegnazione ospiti e storico completo.</li>
      </ul>
      <p class="muted" style="margin-top:.65rem;font-size:.85rem">
        Per assistenza interna aprire una issue nel repository MediTrace indicando dispositivo, passaggi e orario evento.
      </p>
    </div>

    <nav class="manuale-toc card" aria-label="Indice del manuale">
      <p><strong>Indice</strong></p>
      <ol class="manuale-toc-list">
        <li v-for="sezione in manualeSezioni" :key="sezione.key">
          <a :href="'#' + sezione.key">{{ sezione.etichetta }}</a>
        </li>
      </ol>
    </nav>

    <section
      v-for="sezione in manualeSezioni"
      :key="sezione.key"
      :id="sezione.key"
      class="card manuale-section"
    >
      <button
        class="manuale-section-toggle"
        :aria-expanded="expanded[sezione.key]"
        :aria-controls="'ms-body-' + sezione.key"
        @click="toggle(sezione.key)"
      >
        <span class="manuale-section-heading">{{ helpContent[sezione.key].titolo }}</span>
        <span class="manuale-toggle-icon" aria-hidden="true">{{ expanded[sezione.key] ? '▲' : '▼' }}</span>
      </button>

      <div
        v-show="expanded[sezione.key]"
        :id="'ms-body-' + sezione.key"
        class="manuale-section-body"
      >
        <p class="help-intro">{{ helpContent[sezione.key].intro }}</p>

        <dl class="manuale-dl">
          <template v-for="(item, idx) in helpContent[sezione.key].sezioni" :key="idx">
            <dt class="manuale-dt">{{ item.titolo }}</dt>
            <dd class="manuale-dd">{{ item.testo }}</dd>
          </template>
        </dl>

        <div v-if="sezione.key === 'impostazioni'" style="margin-top:1rem">
          <p><strong>CSV di esempio per Import CSV guidato</strong></p>
          <p class="muted" style="margin-top:.25rem">Scarica i file campione e usali come base per compilare i tuoi dataset.</p>
          <ul class="info-list" style="margin-top:.5rem">
            <li v-for="sample in csvImportSamples" :key="sample.file">
              <a :href="csvSampleHref(sample.file)" :download="sample.file">{{ sample.label }}</a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
