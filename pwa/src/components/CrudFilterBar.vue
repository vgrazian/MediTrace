<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Cerca per nome, codice o note',
  },
  label: {
    type: String,
    default: 'Filtra risultati',
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  visibleCount: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update:modelValue'])

function updateValue(event) {
  emit('update:modelValue', event.target.value)
}

function clearValue() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="crud-filter-bar">
    <label>
      {{ label }}
      <input
        :value="modelValue"
        type="search"
        :placeholder="placeholder"
        @input="updateValue"
      />
    </label>

    <p class="count muted">
      {{ visibleCount }} risultati su {{ totalCount }}
    </p>

    <button v-if="modelValue" type="button" class="clear" @click="clearValue">Pulisci filtro</button>
  </div>
</template>

<style scoped>
.crud-filter-bar {
  margin-top: .75rem;
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: .5rem;
}

.crud-filter-bar label {
  flex: 1 1 260px;
}

.crud-filter-bar input {
  width: 100%;
  margin-top: .25rem;
}

.count {
  margin: 0;
  font-size: .85rem;
}

.clear {
  background: #64748b;
  font-size: .85rem;
  padding: .35rem .6rem;
}
</style>
