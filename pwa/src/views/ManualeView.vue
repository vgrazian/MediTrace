<script setup>
import { ref } from 'vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { helpContent, manualeSezioni } from '../data/helpContent'

const route = useRoute()
const router = useRouter()

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
      <p>
        Benvenuto nella guida di <strong>MediTrace</strong>.
        Qui trovi spiegazioni semplici su come usare ogni sezione dell'applicazione.
      </p>
      <p class="muted" style="margin-top:.5rem">
        Puoi anche aprire la guida contestuale di ciascuna sezione premendo il pulsante
        <span class="help-btn-preview" aria-hidden="true">Aiuto</span> in alto nella pagina corrispondente.
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
      </div>
    </section>
  </div>
</template>
