/**
 * Form Validation Service
 * 
 * Provides reactive form validation with field-level feedback.
 * Supports inline validation on blur/input events with ARIA attributes.
 * 
 * @example
 * import { useFormValidation } from '@/services/formValidation'
 * 
 * const { errors, validateField, validateForm, clearErrors } = useFormValidation({
 *   drugName: { required: true, minLength: 2 },
 *   activeIngredient: { required: true }
 * })
 */

import { ref, computed } from 'vue'

/**
 * Validation rules
 */
const validationRules = {
    required: (value, fieldName) => {
        const trimmed = String(value || '').trim()
        return trimmed.length > 0 ? null : `${fieldName} è obbligatorio`
    },

    minLength: (value, fieldName, minLength) => {
        const trimmed = String(value || '').trim()
        return trimmed.length >= minLength
            ? null
            : `${fieldName} deve contenere almeno ${minLength} caratteri`
    },

    maxLength: (value, fieldName, maxLength) => {
        const trimmed = String(value || '').trim()
        return trimmed.length <= maxLength
            ? null
            : `${fieldName} non può superare ${maxLength} caratteri`
    },

    email: (value, fieldName) => {
        const trimmed = String(value || '').trim()
        if (!trimmed) return null // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(trimmed)
            ? null
            : `${fieldName} deve essere un indirizzo email valido`
    },

    numeric: (value, fieldName) => {
        const trimmed = String(value || '').trim()
        if (!trimmed) return null // Optional field
        return !isNaN(Number(trimmed))
            ? null
            : `${fieldName} deve essere un numero`
    },

    positiveNumber: (value, fieldName) => {
        const num = Number(value)
        return !isNaN(num) && num >= 0
            ? null
            : `${fieldName} deve essere un numero positivo`
    },

    integer: (value, fieldName) => {
        const num = Number(value)
        return !isNaN(num) && Number.isInteger(num)
            ? null
            : `${fieldName} deve essere un numero intero`
    },

    date: (value, fieldName) => {
        if (!value) return null // Optional field
        const date = new Date(value)
        return !isNaN(date.getTime())
            ? null
            : `${fieldName} deve essere una data valida`
    },

    futureDate: (value, fieldName) => {
        if (!value) return null // Optional field
        const date = new Date(value)
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        return date >= now
            ? null
            : `${fieldName} deve essere una data futura`
    },

    pattern: (value, fieldName, pattern) => {
        const trimmed = String(value || '').trim()
        if (!trimmed) return null // Optional field
        const regex = new RegExp(pattern)
        return regex.test(trimmed)
            ? null
            : `${fieldName} non è nel formato corretto`
    },

    custom: (value, fieldName, validatorFn) => {
        return validatorFn(value, fieldName)
    }
}

/**
 * Create form validation composable
 * 
 * @param {Object} fieldRules - Validation rules for each field
 * @param {Object} fieldLabels - Human-readable labels for fields
 * @returns {Object} Validation utilities
 */
export function useFormValidation(fieldRules = {}, fieldLabels = {}) {
    const errors = ref({})
    const touched = ref({})

    /**
     * Get human-readable field label
     */
    function getFieldLabel(fieldName) {
        return fieldLabels[fieldName] || fieldName
    }

    /**
     * Validate a single field
     * 
     * @param {string} fieldName - Field to validate
     * @param {any} value - Field value
     * @returns {string|null} Error message or null
     */
    function validateField(fieldName, value) {
        const rules = fieldRules[fieldName]
        if (!rules) return null

        const label = getFieldLabel(fieldName)

        // Check each rule
        for (const [ruleName, ruleValue] of Object.entries(rules)) {
            const validator = validationRules[ruleName]
            if (!validator) {
                console.warn(`Unknown validation rule: ${ruleName}`)
                continue
            }

            const error = validator(value, label, ruleValue)
            if (error) {
                errors.value[fieldName] = error
                return error
            }
        }

        // No errors
        delete errors.value[fieldName]
        return null
    }

    /**
     * Validate entire form
     * 
     * @param {Object} formData - Form data to validate
     * @returns {boolean} True if valid
     */
    function validateForm(formData) {
        errors.value = {}
        let isValid = true

        for (const fieldName of Object.keys(fieldRules)) {
            const error = validateField(fieldName, formData[fieldName])
            if (error) {
                isValid = false
            }
        }

        return isValid
    }

    /**
     * Mark field as touched
     * 
     * @param {string} fieldName - Field name
     */
    function touchField(fieldName) {
        touched.value[fieldName] = true
    }

    /**
     * Check if field has been touched
     * 
     * @param {string} fieldName - Field name
     * @returns {boolean}
     */
    function isFieldTouched(fieldName) {
        return touched.value[fieldName] === true
    }

    /**
     * Clear all errors
     */
    function clearErrors() {
        errors.value = {}
    }

    /**
     * Clear error for specific field
     * 
     * @param {string} fieldName - Field name
     */
    function clearFieldError(fieldName) {
        delete errors.value[fieldName]
    }

    /**
     * Reset validation state
     */
    function reset() {
        errors.value = {}
        touched.value = {}
    }

    /**
     * Check if form has any errors
     */
    const hasErrors = computed(() => Object.keys(errors.value).length > 0)

    /**
     * Get error for specific field
     * 
     * @param {string} fieldName - Field name
     * @returns {string|null}
     */
    function getFieldError(fieldName) {
        return errors.value[fieldName] || null
    }

    /**
     * Check if field has error
     * 
     * @param {string} fieldName - Field name
     * @returns {boolean}
     */
    function hasFieldError(fieldName) {
        return !!errors.value[fieldName]
    }

    return {
        errors,
        touched,
        validateField,
        validateForm,
        touchField,
        isFieldTouched,
        clearErrors,
        clearFieldError,
        reset,
        hasErrors,
        getFieldError,
        hasFieldError
    }
}

/**
 * Get ARIA attributes for form field
 * 
 * @param {string} fieldName - Field name
 * @param {string|null} error - Error message
 * @returns {Object} ARIA attributes
 */
export function getFieldAriaAttributes(fieldName, error) {
    return {
        'aria-invalid': error ? 'true' : 'false',
        'aria-describedby': error ? `${fieldName}-error` : undefined
    }
}

// Made with Bob
