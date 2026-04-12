<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import {
  registerConfirmDialogHost,
  resolveConfirmDialog,
  unregisterConfirmDialogHost,
  useConfirmDialogState,
} from '../services/confirmDialog'

const state = useConfirmDialogState()

const isOpen = computed(() => state.value.isOpen)
const options = computed(() => state.value.options)

function onCancel() {
  resolveConfirmDialog(false)
}

function onConfirm() {
  resolveConfirmDialog(true)
}

onMounted(() => {
  registerConfirmDialogHost()
})

onUnmounted(() => {
  unregisterConfirmDialogHost()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="confirm-dialog-backdrop" @click="onCancel">
      <div class="confirm-dialog" role="dialog" aria-modal="true" :aria-label="options.title" @click.stop>
        <h3>{{ options.title }}</h3>
        <p>{{ options.message }}</p>
        <p v-if="options.details" class="details">{{ options.details }}</p>

        <div class="actions">
          <button type="button" class="cancel" @click="onCancel">{{ options.cancelText }}</button>
          <button type="button" :class="options.tone === 'danger' ? 'danger' : 'primary'" @click="onConfirm">{{ options.confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: grid;
  place-items: center;
  z-index: 1200;
  padding: 1rem;
}

.confirm-dialog {
  width: min(560px, 100%);
  background: #fff;
  border: 1px solid #d7dee9;
  border-radius: .75rem;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.25);
  padding: 1rem;
}

.confirm-dialog h3 {
  margin: 0;
  font-size: 1.05rem;
}

.confirm-dialog p {
  margin: .75rem 0 0;
}

.details {
  white-space: pre-line;
  color: #475569;
  font-size: .92rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: .5rem;
  margin-top: 1rem;
}

.actions .cancel {
  background: #e5e7eb;
  color: #111827;
}

.actions .primary {
  background: #2563eb;
}

.actions .danger {
  background: #c0392b;
}
</style>
