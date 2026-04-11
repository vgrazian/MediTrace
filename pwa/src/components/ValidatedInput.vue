<template>
  <div class="form-field" :class="{ 'has-error': showError }">
    <label v-if="label" :for="inputId">
      {{ label }}
      <span v-if="required" class="required-indicator" aria-label="obbligatorio">*</span>
    </label>
    
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      v-bind="ariaAttributes"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    
    <span
      v-if="showError"
      :id="`${inputId}-error`"
      class="error-message"
      role="alert"
    >
      {{ error }}
    </span>
    
    <span
      v-else-if="hint"
      :id="`${inputId}-hint`"
      class="field-hint"
    >
      {{ hint }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getFieldAriaAttributes } from '../services/formValidation'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: null
  },
  hint: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  validateOnBlur: {
    type: Boolean,
    default: true
  },
  validateOnInput: {
    type: Boolean,
    default: false
  },
  fieldName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'validate'])

const inputId = computed(() => `input-${props.fieldName}`)

const showError = computed(() => !!props.error)

const ariaAttributes = computed(() => {
  const attrs = getFieldAriaAttributes(props.fieldName, props.error)
  
  if (props.hint && !props.error) {
    attrs['aria-describedby'] = `${inputId.value}-hint`
  }
  
  return attrs
})

function handleInput(event) {
  const value = event.target.value
  emit('update:modelValue', value)
  
  if (props.validateOnInput) {
    emit('validate', props.fieldName, value)
  }
}

function handleBlur(event) {
  const value = event.target.value
  emit('blur', event)
  
  if (props.validateOnBlur) {
    emit('validate', props.fieldName, value)
  }
}

function handleFocus(event) {
  emit('focus', event)
}
</script>

<style scoped>
.form-field {
  margin-bottom: 1rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.required-indicator {
  color: #c0392b;
  margin-left: 0.25rem;
}

.form-field input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-field input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-field.has-error input {
  border-color: #c0392b;
}

.form-field.has-error input:focus {
  border-color: #c0392b;
  box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.1);
}

.error-message {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #c0392b;
}

.field-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #7f8c8d;
}

.form-field input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}
</style>