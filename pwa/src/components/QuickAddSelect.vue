<template>
  <div class="quick-add-select">
    <select
      :value="modelValue"
      :disabled="disabled"
      :aria-label="label"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
    <button
      v-if="quickAddLabel"
      type="button"
      class="quick-add-btn"
      :title="quickAddTitle || `Aggiungi nuovo ${quickAddLabel}`"
      :disabled="disabled"
      @click="$emit('quick-add')"
    >
      + {{ quickAddLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  quickAddLabel: { type: String, default: '' },
  quickAddTitle: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'quick-add'])
</script>

<style scoped>
.quick-add-select {
  display: flex;
  gap: .35rem;
  align-items: center;
}

.quick-add-select select {
  flex: 1;
  min-width: 0;
}

.quick-add-btn {
  white-space: nowrap;
  font-size: .82rem;
  padding: .35rem .55rem;
  background: #e8f0fe;
  color: #1a56db;
  border: 1px solid #bfd6f6;
  border-radius: 4px;
  cursor: pointer;
  transition: background .15s;
  flex-shrink: 0;
}

.quick-add-btn:hover {
  background: #d3e3fd;
}

.quick-add-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}
</style>
