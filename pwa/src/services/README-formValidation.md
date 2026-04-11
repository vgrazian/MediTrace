# Form Validation Service

Servizio di validazione form reattivo con feedback inline per campo.

## Caratteristiche

- ✅ Validazione reattiva con Vue 3 Composition API
- ✅ 11 regole di validazione predefinite
- ✅ Supporto per validatori personalizzati
- ✅ Feedback inline su blur/input
- ✅ Attributi ARIA per accessibilità
- ✅ Tracking dello stato "touched" per UX ottimale
- ✅ Messaggi di errore localizzati in italiano

## Utilizzo Base

### 1. Importare il servizio

```javascript
import { useFormValidation } from '@/services/formValidation'
```

### 2. Definire regole di validazione

```javascript
const { errors, validateField, validateForm, hasErrors } = useFormValidation(
  // Regole per campo
  {
    nomeFarmaco: { 
      required: true, 
      minLength: 2, 
      maxLength: 100 
    },
    email: { 
      required: true, 
      email: true 
    },
    eta: { 
      numeric: true, 
      positiveNumber: true, 
      integer: true 
    },
    scadenza: { 
      date: true, 
      futureDate: true 
    }
  },
  // Label leggibili per messaggi di errore
  {
    nomeFarmaco: 'Nome farmaco',
    email: 'Email',
    eta: 'Età',
    scadenza: 'Data di scadenza'
  }
)
```

### 3. Validare campi

```javascript
// Validazione singolo campo
function handleBlur(fieldName, value) {
  validateField(fieldName, value)
}

// Validazione intero form
function handleSubmit() {
  if (!validateForm(formData.value)) {
    // Ci sono errori, non procedere
    return
  }
  // Form valido, procedi con il salvataggio
  saveData()
}
```

### 4. Mostrare errori nel template

```vue
<template>
  <div class="form-field" :class="{ 'has-error': errors.nomeFarmaco }">
    <label for="nomeFarmaco">Nome farmaco *</label>
    <input
      id="nomeFarmaco"
      v-model="form.nomeFarmaco"
      @blur="validateField('nomeFarmaco', form.nomeFarmaco)"
      :aria-invalid="!!errors.nomeFarmaco"
      :aria-describedby="errors.nomeFarmaco ? 'nomeFarmaco-error' : null"
    />
    <span v-if="errors.nomeFarmaco" id="nomeFarmaco-error" class="error-message">
      {{ errors.nomeFarmaco }}
    </span>
  </div>
</template>
```

## Utilizzo con ValidatedInput Component

Per semplificare l'integrazione, usa il componente `ValidatedInput`:

```vue
<script setup>
import { useFormValidation } from '@/services/formValidation'
import ValidatedInput from '@/components/ValidatedInput.vue'

const form = ref({
  nomeFarmaco: '',
  principioAttivo: ''
})

const { errors, validateField, validateForm } = useFormValidation({
  nomeFarmaco: { required: true, minLength: 2 },
  principioAttivo: { required: true }
}, {
  nomeFarmaco: 'Nome farmaco',
  principioAttivo: 'Principio attivo'
})

function handleValidate(fieldName, value) {
  validateField(fieldName, value)
}

async function handleSubmit() {
  if (!validateForm(form.value)) {
    return
  }
  await saveData(form.value)
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <ValidatedInput
      v-model="form.nomeFarmaco"
      field-name="nomeFarmaco"
      label="Nome farmaco"
      :error="errors.nomeFarmaco"
      :required="true"
      placeholder="Es: Tachipirina"
      @validate="handleValidate"
    />
    
    <ValidatedInput
      v-model="form.principioAttivo"
      field-name="principioAttivo"
      label="Principio attivo"
      :error="errors.principioAttivo"
      :required="true"
      placeholder="Es: Paracetamolo"
      @validate="handleValidate"
    />
    
    <button type="submit" :disabled="hasErrors">Salva</button>
  </form>
</template>
```

## Regole di Validazione Disponibili

### `required`
Campo obbligatorio (non vuoto dopo trim).

```javascript
{ required: true }
```

### `minLength`
Lunghezza minima stringa.

```javascript
{ minLength: 5 }  // Almeno 5 caratteri
```

### `maxLength`
Lunghezza massima stringa.

```javascript
{ maxLength: 100 }  // Massimo 100 caratteri
```

### `email`
Formato email valido.

```javascript
{ email: true }
```

### `numeric`
Valore numerico.

```javascript
{ numeric: true }
```

### `positiveNumber`
Numero positivo (>= 0).

```javascript
{ positiveNumber: true }
```

### `integer`
Numero intero.

```javascript
{ integer: true }
```

### `date`
Data valida.

```javascript
{ date: true }
```

### `futureDate`
Data futura (>= oggi).

```javascript
{ futureDate: true }
```

### `pattern`
Regex personalizzato.

```javascript
{ pattern: '^https?://' }  // URL che inizia con http:// o https://
```

### `custom`
Validatore personalizzato.

```javascript
{
  custom: (value, fieldName) => {
    if (!value) return 'Campo obbligatorio'
    if (value.length < 8) return 'Minimo 8 caratteri'
    if (!/[A-Z]/.test(value)) return 'Deve contenere almeno una maiuscola'
    return null  // Nessun errore
  }
}
```

## API Completa

### `useFormValidation(fieldRules, fieldLabels)`

Crea un'istanza di validazione form.

**Parametri:**
- `fieldRules`: Oggetto con regole per campo
- `fieldLabels`: Oggetto con label leggibili per campo

**Ritorna:**
- `errors`: Ref reattivo con errori per campo
- `touched`: Ref reattivo con campi toccati
- `validateField(fieldName, value)`: Valida singolo campo
- `validateForm(formData)`: Valida intero form
- `touchField(fieldName)`: Marca campo come toccato
- `isFieldTouched(fieldName)`: Verifica se campo è toccato
- `clearErrors()`: Pulisce tutti gli errori
- `clearFieldError(fieldName)`: Pulisce errore specifico
- `reset()`: Reset completo stato validazione
- `hasErrors`: Computed che indica se ci sono errori
- `getFieldError(fieldName)`: Ottiene errore per campo
- `hasFieldError(fieldName)`: Verifica se campo ha errore

### `getFieldAriaAttributes(fieldName, error)`

Genera attributi ARIA per accessibilità.

**Parametri:**
- `fieldName`: Nome del campo
- `error`: Messaggio di errore (o null)

**Ritorna:**
```javascript
{
  'aria-invalid': 'true' | 'false',
  'aria-describedby': 'fieldName-error' | undefined
}
```

## Esempi Completi

### Form Farmaco

```vue
<script setup>
import { ref } from 'vue'
import { useFormValidation } from '@/services/formValidation'
import ValidatedInput from '@/components/ValidatedInput.vue'

const form = ref({
  nomeFarmaco: '',
  principioAttivo: '',
  classeTerapeutica: '',
  scortaMinima: 0
})

const { errors, validateField, validateForm, hasErrors } = useFormValidation({
  nomeFarmaco: { required: true, minLength: 2, maxLength: 100 },
  principioAttivo: { required: true, minLength: 2, maxLength: 100 },
  classeTerapeutica: { maxLength: 50 },
  scortaMinima: { numeric: true, positiveNumber: true, integer: true }
}, {
  nomeFarmaco: 'Nome farmaco',
  principioAttivo: 'Principio attivo',
  classeTerapeutica: 'Classe terapeutica',
  scortaMinima: 'Scorta minima'
})

function handleValidate(fieldName, value) {
  validateField(fieldName, value)
}

async function handleSubmit() {
  if (!validateForm(form.value)) {
    return
  }
  
  try {
    await saveDrug(form.value)
    // Reset form dopo salvataggio
    form.value = {
      nomeFarmaco: '',
      principioAttivo: '',
      classeTerapeutica: '',
      scortaMinima: 0
    }
  } catch (error) {
    console.error('Errore salvataggio:', error)
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <ValidatedInput
      v-model="form.nomeFarmaco"
      field-name="nomeFarmaco"
      label="Nome farmaco"
      :error="errors.nomeFarmaco"
      :required="true"
      placeholder="Es: Tachipirina"
      hint="Nome commerciale del farmaco"
      @validate="handleValidate"
    />
    
    <ValidatedInput
      v-model="form.principioAttivo"
      field-name="principioAttivo"
      label="Principio attivo"
      :error="errors.principioAttivo"
      :required="true"
      placeholder="Es: Paracetamolo"
      @validate="handleValidate"
    />
    
    <ValidatedInput
      v-model="form.classeTerapeutica"
      field-name="classeTerapeutica"
      label="Classe terapeutica"
      :error="errors.classeTerapeutica"
      placeholder="Es: Analgesici"
      @validate="handleValidate"
    />
    
    <ValidatedInput
      v-model="form.scortaMinima"
      field-name="scortaMinima"
      label="Scorta minima"
      type="number"
      :error="errors.scortaMinima"
      placeholder="0"
      @validate="handleValidate"
    />
    
    <button type="submit" :disabled="hasErrors">
      Salva farmaco
    </button>
  </form>
</template>
```

## Testing

Il servizio include una suite completa di test:

```bash
npm run test:unit -- formValidation.spec.js
```

**Coverage**: 94.52% statements, 100% functions

## Best Practices

1. **Valida su blur per UX ottimale**: Gli utenti vedono errori dopo aver completato il campo
2. **Usa label descrittive**: Messaggi di errore più chiari
3. **Combina regole**: `{ required: true, email: true }` per email obbligatoria
4. **Disabilita submit se ci sono errori**: `<button :disabled="hasErrors">`
5. **Reset dopo salvataggio**: Pulisci form e errori dopo operazione riuscita
6. **Validatori custom per logica complessa**: Usa `custom` per regole specifiche del dominio

## Accessibilità

Il servizio supporta completamente ARIA:

- `aria-invalid`: Indica se campo ha errore
- `aria-describedby`: Collega campo a messaggio di errore
- `role="alert"`: Messaggio di errore annunciato da screen reader
- Label con indicatore `*` per campi obbligatori

## Migrazione da Validazione Manuale

**Prima:**
```javascript
if (!nomeFarmaco || !principioAttivo) {
  errorMessage.value = 'Inserisci nome farmaco e principio attivo.'
  return
}
```

**Dopo:**
```javascript
if (!validateForm(form.value)) {
  // Errori mostrati automaticamente per campo
  return
}
```

## Supporto

Per domande o problemi, consulta:
- Test: `pwa/tests/unit/formValidation.spec.js`
- Esempi: Questo README
- Codice sorgente: `pwa/src/services/formValidation.js`