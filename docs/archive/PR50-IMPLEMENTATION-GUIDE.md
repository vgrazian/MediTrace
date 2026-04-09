# PR #50: Form Validation Feedback - Implementation Guide

**Status**: Foundation Complete (60%), View Updates Pending  
**Branch**: `feat/form-validation-feedback`  
**Issue**: 4.2 - Form Validation Feedback (P0 Critical)  
**Estimated Remaining Time**: 6-8 hours

## ✅ Completed Work

### 1. Core Service (`formValidation.js`)
- ✅ 254 lines of code
- ✅ 11 validation rules (required, minLength, maxLength, email, numeric, positiveNumber, integer, date, futureDate, pattern, custom)
- ✅ `useFormValidation()` composable with reactive state
- ✅ ARIA attribute generation
- ✅ Italian error messages

### 2. Test Suite (`formValidation.spec.js`)
- ✅ 43 comprehensive tests
- ✅ 94.52% statement coverage
- ✅ 100% function coverage
- ✅ All validation rules tested
- ✅ Edge cases covered

### 3. Reusable Component (`ValidatedInput.vue`)
- ✅ 165 lines of code
- ✅ Props: modelValue, fieldName, label, error, type, required, placeholder, hint, disabled
- ✅ Events: update:modelValue, validate, blur, focus
- ✅ ARIA support (aria-invalid, aria-describedby, aria-required)
- ✅ Visual error states
- ✅ Accessibility compliant

### 4. Documentation
- ✅ Comprehensive README with examples
- ✅ API documentation
- ✅ Migration guide
- ✅ Best practices

## 🔄 Pending Work

### Phase 1: Update Views (4-5 hours)

#### 1.1 FarmaciView.vue (1 hour)
**Fields to validate:**
- `nomeFarmaco`: required, minLength: 2, maxLength: 100
- `principioAttivo`: required, minLength: 2, maxLength: 100
- `classeTerapeutica`: maxLength: 50
- `scortaMinima`: numeric, positiveNumber, integer

**Implementation steps:**
1. Import `useFormValidation` and `ValidatedInput`
2. Define validation rules
3. Replace standard inputs with `ValidatedInput`
4. Add validation on blur
5. Validate form before save
6. Test manually

**Code template:**
```vue
<script setup>
import { useFormValidation } from '@/services/formValidation'
import ValidatedInput from '@/components/ValidatedInput.vue'

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

async function saveFarmaco() {
  if (!validateForm(editingFarmaco.value)) {
    return
  }
  // Existing save logic...
}
</script>

<template>
  <!-- Replace inputs with ValidatedInput -->
  <ValidatedInput
    v-model="editingFarmaco.nomeFarmaco"
    field-name="nomeFarmaco"
    label="Nome farmaco"
    :error="errors.nomeFarmaco"
    :required="true"
    placeholder="Es: Tachipirina"
    @validate="handleValidate"
  />
</template>
```

#### 1.2 OspitiView.vue (1 hour)
**Fields to validate:**
- `nome`: required, minLength: 2, maxLength: 50
- `cognome`: required, minLength: 2, maxLength: 50
- `dataNascita`: date
- `codiceFiscale`: pattern (Italian CF format)
- `stanzaId`: required

**Validation rules:**
```javascript
{
  nome: { required: true, minLength: 2, maxLength: 50 },
  cognome: { required: true, minLength: 2, maxLength: 50 },
  dataNascita: { date: true },
  codiceFiscale: { 
    pattern: '^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$' 
  },
  stanzaId: { required: true }
}
```

#### 1.3 TerapieView.vue (1 hour)
**Fields to validate:**
- `ospiteId`: required
- `farmacoId`: required
- `dosaggio`: required, minLength: 1, maxLength: 50
- `frequenza`: required, minLength: 1, maxLength: 100
- `dataInizio`: required, date
- `dataFine`: date, futureDate (if present)
- `note`: maxLength: 500

**Validation rules:**
```javascript
{
  ospiteId: { required: true },
  farmacoId: { required: true },
  dosaggio: { required: true, minLength: 1, maxLength: 50 },
  frequenza: { required: true, minLength: 1, maxLength: 100 },
  dataInizio: { required: true, date: true },
  dataFine: { date: true, futureDate: true },
  note: { maxLength: 500 }
}
```

#### 1.4 PromemoriaView.vue (45 min)
**Fields to validate:**
- `terapiaId`: required
- `dataOraProgrammata`: required, date, futureDate
- `note`: maxLength: 500

**Validation rules:**
```javascript
{
  terapiaId: { required: true },
  dataOraProgrammata: { required: true, date: true, futureDate: true },
  note: { maxLength: 500 }
}
```

#### 1.5 MovimentiView.vue (45 min)
**Fields to validate:**
- `farmacoId`: required
- `tipo`: required (enum: 'carico', 'scarico')
- `quantita`: required, numeric, positiveNumber, integer
- `note`: maxLength: 500

**Validation rules:**
```javascript
{
  farmacoId: { required: true },
  tipo: { required: true },
  quantita: { required: true, numeric: true, positiveNumber: true, integer: true },
  note: { maxLength: 500 }
}
```

#### 1.6 ImpostazioniView.vue (30 min)
**Fields to validate:**
- `gistId`: pattern (GitHub Gist ID format)
- `gistToken`: minLength: 40, maxLength: 40 (GitHub token)

**Validation rules:**
```javascript
{
  gistId: { 
    pattern: '^[a-f0-9]{32}$',
    custom: (value) => {
      if (!value) return null
      if (!/^[a-f0-9]{32}$/.test(value)) {
        return 'Formato Gist ID non valido (32 caratteri esadecimali)'
      }
      return null
    }
  },
  gistToken: { 
    minLength: 40, 
    maxLength: 40,
    custom: (value) => {
      if (!value) return null
      if (value.length !== 40) {
        return 'Token GitHub deve essere di 40 caratteri'
      }
      return null
    }
  }
}
```

### Phase 2: E2E Tests (2-3 hours)

Create `pwa/tests/e2e/form-validation.spec.js`:

```javascript
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/login'

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('FarmaciView - validates required fields', async ({ page }) => {
    await page.goto('http://localhost:5173/farmaci')
    
    // Click "Aggiungi farmaco"
    await page.click('button:has-text("Aggiungi farmaco")')
    
    // Try to save without filling required fields
    await page.click('button:has-text("Salva")')
    
    // Should show validation errors
    await expect(page.locator('.error-message:has-text("Nome farmaco è obbligatorio")')).toBeVisible()
    await expect(page.locator('.error-message:has-text("Principio attivo è obbligatorio")')).toBeVisible()
  })

  test('FarmaciView - validates minLength', async ({ page }) => {
    await page.goto('http://localhost:5173/farmaci')
    await page.click('button:has-text("Aggiungi farmaco")')
    
    // Enter too short value
    await page.fill('input[name="nomeFarmaco"]', 'A')
    await page.blur('input[name="nomeFarmaco"]')
    
    // Should show minLength error
    await expect(page.locator('.error-message:has-text("Nome farmaco deve essere di almeno 2 caratteri")')).toBeVisible()
  })

  test('FarmaciView - validates numeric fields', async ({ page }) => {
    await page.goto('http://localhost:5173/farmaci')
    await page.click('button:has-text("Aggiungi farmaco")')
    
    // Enter non-numeric value
    await page.fill('input[name="scortaMinima"]', 'abc')
    await page.blur('input[name="scortaMinima"]')
    
    // Should show numeric error
    await expect(page.locator('.error-message:has-text("Scorta minima deve essere un numero")')).toBeVisible()
  })

  test('OspitiView - validates codice fiscale format', async ({ page }) => {
    await page.goto('http://localhost:5173/ospiti')
    await page.click('button:has-text("Aggiungi ospite")')
    
    // Enter invalid CF
    await page.fill('input[name="codiceFiscale"]', 'INVALID')
    await page.blur('input[name="codiceFiscale"]')
    
    // Should show pattern error
    await expect(page.locator('.error-message')).toContainText('formato non valido')
  })

  test('TerapieView - validates date fields', async ({ page }) => {
    await page.goto('http://localhost:5173/terapie')
    await page.click('button:has-text("Aggiungi terapia")')
    
    // Enter invalid date
    await page.fill('input[name="dataInizio"]', 'invalid-date')
    await page.blur('input[name="dataInizio"]')
    
    // Should show date error
    await expect(page.locator('.error-message:has-text("Data inizio deve essere una data valida")')).toBeVisible()
  })

  test('PromemoriaView - validates future date', async ({ page }) => {
    await page.goto('http://localhost:5173/promemoria')
    await page.click('button:has-text("Aggiungi promemoria")')
    
    // Enter past date
    const pastDate = '2020-01-01T10:00'
    await page.fill('input[name="dataOraProgrammata"]', pastDate)
    await page.blur('input[name="dataOraProgrammata"]')
    
    // Should show future date error
    await expect(page.locator('.error-message:has-text("deve essere una data futura")')).toBeVisible()
  })

  test('MovimentiView - validates positive numbers', async ({ page }) => {
    await page.goto('http://localhost:5173/movimenti')
    await page.click('button:has-text("Registra movimento")')
    
    // Enter negative number
    await page.fill('input[name="quantita"]', '-5')
    await page.blur('input[name="quantita"]')
    
    // Should show positive number error
    await expect(page.locator('.error-message:has-text("Quantità deve essere un numero positivo")')).toBeVisible()
  })

  test('Form submission disabled when errors present', async ({ page }) => {
    await page.goto('http://localhost:5173/farmaci')
    await page.click('button:has-text("Aggiungi farmaco")')
    
    // Submit button should be disabled initially
    const submitButton = page.locator('button:has-text("Salva")')
    await expect(submitButton).toBeDisabled()
    
    // Fill required fields
    await page.fill('input[name="nomeFarmaco"]', 'Tachipirina')
    await page.fill('input[name="principioAttivo"]', 'Paracetamolo')
    
    // Submit button should be enabled
    await expect(submitButton).toBeEnabled()
  })

  test('ARIA attributes present for accessibility', async ({ page }) => {
    await page.goto('http://localhost:5173/farmaci')
    await page.click('button:has-text("Aggiungi farmaco")')
    
    const input = page.locator('input[name="nomeFarmaco"]')
    
    // Should have aria-required
    await expect(input).toHaveAttribute('aria-required', 'true')
    
    // Trigger validation error
    await input.fill('A')
    await input.blur()
    
    // Should have aria-invalid
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    
    // Should have aria-describedby pointing to error
    const ariaDescribedBy = await input.getAttribute('aria-describedby')
    expect(ariaDescribedBy).toContain('error')
  })
})
```

### Phase 3: Documentation Update (30 min)

Update `docs/comprehensive-review-2026-04-06.md`:

```markdown
## Issue 4.2: Form Validation Feedback (P0 Critical)

**Status**: ✅ COMPLETED  
**PR**: #50  
**Merged**: 2026-04-06  

### Implementation Summary

Created comprehensive form validation system with:
- `formValidation.js` service (254 lines, 11 validation rules)
- `ValidatedInput.vue` reusable component (165 lines)
- 43 unit tests (94.52% coverage)
- E2E tests for all views
- Complete documentation

### Views Updated
- ✅ FarmaciView.vue
- ✅ OspitiView.vue
- ✅ TerapieView.vue
- ✅ PromemoriaView.vue
- ✅ MovimentiView.vue
- ✅ ImpostazioniView.vue

### Validation Rules Implemented
1. required - Campo obbligatorio
2. minLength - Lunghezza minima
3. maxLength - Lunghezza massima
4. email - Formato email
5. numeric - Valore numerico
6. positiveNumber - Numero positivo
7. integer - Numero intero
8. date - Data valida
9. futureDate - Data futura
10. pattern - Regex personalizzato
11. custom - Validatore personalizzato

### Accessibility Features
- ARIA attributes (aria-invalid, aria-describedby, aria-required)
- Screen reader support
- Keyboard navigation
- Visual error indicators
- Error messages with role="alert"

### Testing
- Unit tests: 43 tests, 94.52% coverage
- E2E tests: 8 comprehensive scenarios
- Manual testing: All views validated

### Impact
- ✅ Prevents invalid data entry
- ✅ Improves user experience with inline feedback
- ✅ Reduces server-side validation errors
- ✅ Enhances accessibility
- ✅ Consistent validation across all forms
```

## 📋 Implementation Checklist

### Pre-Implementation
- [x] Create formValidation.js service
- [x] Create comprehensive unit tests
- [x] Create ValidatedInput.vue component
- [x] Create documentation (README)
- [x] Create implementation guide (this document)

### View Updates
- [ ] Update FarmaciView.vue
- [ ] Update OspitiView.vue
- [ ] Update TerapieView.vue
- [ ] Update PromemoriaView.vue
- [ ] Update MovimentiView.vue
- [ ] Update ImpostazioniView.vue

### Testing
- [ ] Create E2E test suite
- [ ] Run all unit tests
- [ ] Run all E2E tests
- [ ] Manual testing of each view
- [ ] Accessibility testing with screen reader

### Documentation
- [ ] Update comprehensive review document
- [ ] Add CHANGELOG entry
- [ ] Update README if needed

### Git Workflow
- [ ] Commit all changes
- [ ] Push to feat/form-validation-feedback
- [ ] Create PR #50
- [ ] Wait for CI/CD checks
- [ ] Request code review
- [ ] Address review feedback
- [ ] Merge to main

## 🎯 Success Criteria

1. ✅ All 6 views use ValidatedInput component
2. ✅ All form fields have appropriate validation rules
3. ✅ Validation errors shown inline on blur
4. ✅ Submit buttons disabled when errors present
5. ✅ ARIA attributes present for accessibility
6. ✅ All unit tests passing (>90% coverage)
7. ✅ All E2E tests passing
8. ✅ No console errors or warnings
9. ✅ Documentation complete and accurate
10. ✅ CI/CD checks passing

## 🚀 Next Steps After PR #50

After this PR is merged, proceed with:

**PR #51: ARIA Labels and Keyboard Navigation (Issue 6.1 - P1 High)**
- Add comprehensive ARIA labels to all interactive elements
- Implement keyboard shortcuts for common actions
- Add focus management for modals and dialogs
- Create keyboard navigation guide
- E2E tests for keyboard navigation

## 📝 Notes

- **Token Budget**: This implementation guide created to preserve context for next session
- **Estimated Time**: 6-8 hours remaining for full implementation
- **Priority**: P0 Critical - High impact on user experience
- **Dependencies**: None - can proceed immediately
- **Blockers**: None

## 🔗 Related Files

- Service: `pwa/src/services/formValidation.js`
- Tests: `pwa/tests/unit/formValidation.spec.js`
- Component: `pwa/src/components/ValidatedInput.vue`
- Documentation: `pwa/src/services/README-formValidation.md`
- Views to update: `pwa/src/views/*.vue`
- E2E tests: `pwa/tests/e2e/form-validation.spec.js` (to create)

---

**Created**: 2026-04-06 22:28 CET  
**Author**: Valerio Graziani  
**Status**: Foundation Complete, Ready for View Updates