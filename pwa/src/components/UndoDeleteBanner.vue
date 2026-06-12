<template>
  <transition name="fade">
    <div v-if="visible" class="undo-banner" role="status" aria-live="polite">
      <span class="undo-message">{{ label }}</span>
      <button class="undo-btn" @click="onUndo" aria-label="Annulla eliminazione">Annulla</button>
      <button class="close-btn" @click="onClose" aria-label="Chiudi">×</button>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  timeout: { type: Number, default: 10000 },
})
const emits = defineEmits(['undo', 'close'])

const visible = ref(true)
let timer = null

function onUndo() {
  emits('undo')
  visible.value = false
}
function onClose() {
  emits('close')
  visible.value = false
}

watch(visible, v => {
  if (!v && timer) clearTimeout(timer)
})

timer = setTimeout(() => {
  visible.value = false
  emits('close')
}, props.timeout)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.undo-banner {
  background: #f8fafc;
  border: 1px solid #e0e7ef;
  color: #1e293b;
  padding: 0.75em 1.5em;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(30,41,59,0.07);
  display: flex;
  align-items: center;
  gap: 1em;
  margin: 1em 0;
  font-size: 1rem;
}
.undo-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.4em 1em;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.undo-btn:hover {
  background: #1d4ed8;
}
.close-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.2em;
  cursor: pointer;
  margin-left: auto;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
