<script setup>
import { computed } from 'vue'
import { useHelp } from '../composables/useHelp'
import { helpContent } from '../data/helpContent'

const { isOpen, currentSection, closeHelp } = useHelp()

const content = computed(() => currentSection.value ? helpContent[currentSection.value] : null)
</script>

<template>
  <Teleport to="body">
    <Transition name="help-overlay">
      <div
        v-if="isOpen"
        class="help-backdrop"
        aria-hidden="true"
        @click="closeHelp"
      />
    </Transition>

    <Transition name="help-drawer">
      <aside
        v-if="isOpen"
        class="help-drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="content?.titolo ?? 'Guida in linea'"
      >
        <header class="help-drawer-header">
          <h3 class="help-drawer-title">{{ content?.titolo ?? 'Guida in linea' }}</h3>
          <button class="help-close-btn" aria-label="Chiudi guida" @click="closeHelp">✕</button>
        </header>

        <div class="help-drawer-body">
          <p v-if="content?.intro" class="help-intro">{{ content.intro }}</p>

          <template v-if="content?.sezioni">
            <details
              v-for="(sezione, idx) in content.sezioni"
              :key="idx"
              class="help-section"
              :open="idx === 0"
            >
              <summary class="help-section-title">{{ sezione.titolo }}</summary>
              <p class="help-section-text">{{ sezione.testo }}</p>
            </details>
          </template>
        </div>

        <footer class="help-drawer-footer">
          <RouterLink to="/manuale" class="help-manual-link" @click="closeHelp">
            📖 Apri manuale completo
          </RouterLink>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>
