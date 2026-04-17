import { describe, it, expect, beforeEach } from 'vitest'
import { useFormValidation, getFieldAriaAttributes } from '../../src/services/formValidation'

function toLocalDateString(date = new Date()) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

describe('formValidation service', () => {
    describe('useFormValidation', () => {
        let validation

        beforeEach(() => {
            validation = useFormValidation(
                {
                    name: { required: true, minLength: 2, maxLength: 50 },
                    email: { required: true, email: true },
                    age: { numeric: true, positiveNumber: true, integer: true },
                    website: { pattern: '^https?://' },
                    birthDate: { date: true },
                    expiryDate: { date: true, futureDate: true }
                },
                {
                    name: 'Nome',
                    email: 'Email',
                    age: 'Età',
                    website: 'Sito web',
                    birthDate: 'Data di nascita',
                    expiryDate: 'Data di scadenza'
                }
            )
        })

        describe('required validation', () => {
            it('should fail for empty string', () => {
                const error = validation.validateField('name', '')
                expect(error).toBe('Nome è obbligatorio')
                expect(validation.hasFieldError('name')).toBe(true)
            })

            it('should fail for whitespace only', () => {
                const error = validation.validateField('name', '   ')
                expect(error).toBe('Nome è obbligatorio')
            })

            it('should pass for non-empty string', () => {
                const error = validation.validateField('name', 'Mario')
                expect(error).toBeNull()
                expect(validation.hasFieldError('name')).toBe(false)
            })
        })

        describe('minLength validation', () => {
            it('should fail for string shorter than minimum', () => {
                const error = validation.validateField('name', 'A')
                expect(error).toBe('Nome deve contenere almeno 2 caratteri')
            })

            it('should pass for string at minimum length', () => {
                const error = validation.validateField('name', 'AB')
                expect(error).toBeNull()
            })

            it('should pass for string longer than minimum', () => {
                const error = validation.validateField('name', 'Mario')
                expect(error).toBeNull()
            })
        })

        describe('maxLength validation', () => {
            it('should fail for string longer than maximum', () => {
                const longString = 'A'.repeat(51)
                const error = validation.validateField('name', longString)
                expect(error).toBe('Nome non può superare 50 caratteri')
            })

            it('should pass for string at maximum length', () => {
                const maxString = 'A'.repeat(50)
                const error = validation.validateField('name', maxString)
                expect(error).toBeNull()
            })
        })

        describe('email validation', () => {
            it('should fail for invalid email format', () => {
                const error = validation.validateField('email', 'invalid-email')
                expect(error).toBe('Email deve essere un indirizzo email valido')
            })

            it('should fail for email without domain', () => {
                const error = validation.validateField('email', 'user@')
                expect(error).toBe('Email deve essere un indirizzo email valido')
            })

            it('should pass for valid email', () => {
                const error = validation.validateField('email', 'user@example.com')
                expect(error).toBeNull()
            })

            it('should pass for email with subdomain', () => {
                const error = validation.validateField('email', 'user@mail.example.com')
                expect(error).toBeNull()
            })
        })

        describe('numeric validation', () => {
            it('should fail for non-numeric string', () => {
                const error = validation.validateField('age', 'abc')
                expect(error).toBe('Età deve essere un numero')
            })

            it('should pass for numeric string', () => {
                const error = validation.validateField('age', '25')
                expect(error).toBeNull()
            })

            it('should pass for number', () => {
                const error = validation.validateField('age', 25)
                expect(error).toBeNull()
            })

            it('should pass for empty optional field', () => {
                const error = validation.validateField('age', '')
                expect(error).toBeNull()
            })
        })

        describe('positiveNumber validation', () => {
            it('should fail for negative number', () => {
                const error = validation.validateField('age', -5)
                expect(error).toBe('Età deve essere un numero positivo')
            })

            it('should pass for zero', () => {
                const error = validation.validateField('age', 0)
                expect(error).toBeNull()
            })

            it('should pass for positive number', () => {
                const error = validation.validateField('age', 25)
                expect(error).toBeNull()
            })
        })

        describe('integer validation', () => {
            it('should fail for decimal number', () => {
                const error = validation.validateField('age', 25.5)
                expect(error).toBe('Età deve essere un numero intero')
            })

            it('should pass for integer', () => {
                const error = validation.validateField('age', 25)
                expect(error).toBeNull()
            })
        })

        describe('date validation', () => {
            it('should fail for invalid date string', () => {
                const error = validation.validateField('birthDate', 'not-a-date')
                expect(error).toBe('Data di nascita deve essere una data valida')
            })

            it('should pass for valid date string', () => {
                const error = validation.validateField('birthDate', '2000-01-01')
                expect(error).toBeNull()
            })

            it('should pass for empty optional field', () => {
                const error = validation.validateField('birthDate', '')
                expect(error).toBeNull()
            })
        })

        describe('futureDate validation', () => {
            it('should fail for past date', () => {
                const error = validation.validateField('expiryDate', '2020-01-01')
                expect(error).toBe('Data di scadenza deve essere una data futura')
            })

            it('should pass for future date', () => {
                const futureDate = new Date()
                futureDate.setFullYear(futureDate.getFullYear() + 1)
                const dateString = futureDate.toISOString().split('T')[0]
                const error = validation.validateField('expiryDate', dateString)
                expect(error).toBeNull()
            })

            it('should pass for today', () => {
                const today = toLocalDateString()
                const error = validation.validateField('expiryDate', today)
                expect(error).toBeNull()
            })
        })

        describe('custom validation', () => {
            beforeEach(() => {
                validation = useFormValidation(
                    {
                        password: {
                            custom: (value) => {
                                if (!value) return 'Password è obbligatoria'
                                if (value.length < 8) return 'Password deve essere almeno 8 caratteri'
                                if (!/[A-Z]/.test(value)) return 'Password deve contenere almeno una maiuscola'
                                return null
                            }
                        }
                    },
                    {
                        password: 'Password'
                    }
                )
            })

            it('should use custom validator function', () => {
                const error = validation.validateField('password', 'weak')
                expect(error).toBe('Password deve essere almeno 8 caratteri')
            })

            it('should pass custom validation', () => {
                const error = validation.validateField('password', 'StrongPass123')
                expect(error).toBeNull()
            })
        })

        describe('pattern validation', () => {
            it('should fail for string not matching pattern', () => {
                const error = validation.validateField('website', 'example.com')
                expect(error).toBe('Sito web non è nel formato corretto')
            })

            it('should pass for string matching pattern', () => {
                const error = validation.validateField('website', 'https://example.com')
                expect(error).toBeNull()
            })

            it('should pass for empty optional field', () => {
                const error = validation.validateField('website', '')
                expect(error).toBeNull()
            })
        })

        describe('validateForm', () => {
            it('should validate all fields and return false if any invalid', () => {
                const formData = {
                    name: '',
                    email: 'invalid',
                    age: 'abc'
                }

                const isValid = validation.validateForm(formData)

                expect(isValid).toBe(false)
                expect(validation.hasFieldError('name')).toBe(true)
                expect(validation.hasFieldError('email')).toBe(true)
                expect(validation.hasFieldError('age')).toBe(true)
            })

            it('should return true if all fields valid', () => {
                const formData = {
                    name: 'Mario Rossi',
                    email: 'mario@example.com',
                    age: 25
                }

                const isValid = validation.validateForm(formData)

                expect(isValid).toBe(true)
                expect(validation.hasErrors.value).toBe(false)
            })
        })

        describe('error management', () => {
            it('should get field error', () => {
                validation.validateField('name', '')
                expect(validation.getFieldError('name')).toBe('Nome è obbligatorio')
            })

            it('should return null for field without error', () => {
                expect(validation.getFieldError('name')).toBeNull()
            })

            it('should clear specific field error', () => {
                validation.validateField('name', '')
                expect(validation.hasFieldError('name')).toBe(true)

                validation.clearFieldError('name')
                expect(validation.hasFieldError('name')).toBe(false)
            })

            it('should clear all errors', () => {
                validation.validateField('name', '')
                validation.validateField('email', 'invalid')
                expect(validation.hasErrors.value).toBe(true)

                validation.clearErrors()
                expect(validation.hasErrors.value).toBe(false)
            })
        })

        describe('touch tracking', () => {
            it('should mark field as touched', () => {
                expect(validation.isFieldTouched('name')).toBe(false)

                validation.touchField('name')
                expect(validation.isFieldTouched('name')).toBe(true)
            })

            it('should reset touch state', () => {
                validation.touchField('name')
                validation.touchField('email')

                validation.reset()
                expect(validation.isFieldTouched('name')).toBe(false)
                expect(validation.isFieldTouched('email')).toBe(false)
            })
        })

        describe('reset', () => {
            it('should reset all validation state', () => {
                validation.validateField('name', '')
                validation.touchField('name')

                validation.reset()

                expect(validation.hasErrors.value).toBe(false)
                expect(validation.isFieldTouched('name')).toBe(false)
            })
        })
    })

    describe('getFieldAriaAttributes', () => {
        it('should return aria-invalid=true when error exists', () => {
            const attrs = getFieldAriaAttributes('name', 'Nome è obbligatorio')

            expect(attrs['aria-invalid']).toBe('true')
            expect(attrs['aria-describedby']).toBe('name-error')
        })

        it('should return aria-invalid=false when no error', () => {
            const attrs = getFieldAriaAttributes('name', null)

            expect(attrs['aria-invalid']).toBe('false')
            expect(attrs['aria-describedby']).toBeUndefined()
        })
    })
})

// Made with Bob
