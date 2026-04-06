import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    AppError,
    NetworkError,
    ValidationError,
    SyncError,
    StorageError,
    ErrorCategory,
    ErrorSeverity,
    formatUserError,
    formatErrorForLogging,
    handleAsync,
    createNetworkError,
    retryWithBackoff,
    isRecoverable,
    getUserMessage
} from '../../src/services/errorHandling'

describe('errorHandling service', () => {
    describe('AppError', () => {
        it('creates error with default values', () => {
            const error = new AppError('Test error')

            expect(error.message).toBe('Test error')
            expect(error.name).toBe('AppError')
            expect(error.category).toBe(ErrorCategory.UNKNOWN)
            expect(error.severity).toBe(ErrorSeverity.MEDIUM)
            expect(error.recoverable).toBe(true)
            expect(error.suggestedActions).toEqual([])
            expect(error.timestamp).toBeDefined()
        })

        it('creates error with custom options', () => {
            const error = new AppError('Test error', {
                category: ErrorCategory.VALIDATION,
                severity: ErrorSeverity.LOW,
                code: 'VAL_001',
                recoverable: false,
                suggestedActions: ['Action 1', 'Action 2'],
                technicalDetails: { field: 'email' }
            })

            expect(error.category).toBe(ErrorCategory.VALIDATION)
            expect(error.severity).toBe(ErrorSeverity.LOW)
            expect(error.code).toBe('VAL_001')
            expect(error.recoverable).toBe(false)
            expect(error.suggestedActions).toEqual(['Action 1', 'Action 2'])
            expect(error.technicalDetails).toEqual({ field: 'email' })
        })
    })

    describe('NetworkError', () => {
        it('creates network error with status code', () => {
            const error = new NetworkError('Connection failed', 500)

            expect(error.name).toBe('NetworkError')
            expect(error.category).toBe(ErrorCategory.NETWORK)
            expect(error.statusCode).toBe(500)
            expect(error.code).toBe('NETWORK_500')
            expect(error.recoverable).toBe(true)
        })

        it('marks 401 errors as non-recoverable by default', () => {
            const error = new NetworkError('Unauthorized', 401)

            expect(error.statusCode).toBe(401)
            expect(error.recoverable).toBe(false)
        })

        it('provides appropriate actions for 401 errors', () => {
            const error = new NetworkError('Unauthorized', 401)

            expect(error.suggestedActions).toContain('Verifica le credenziali di accesso')
        })

        it('provides appropriate actions for 429 errors', () => {
            const error = new NetworkError('Rate limited', 429)

            expect(error.recoverable).toBe(true)
            expect(error.suggestedActions).toContain('Attendi qualche minuto prima di riprovare')
        })

        it('provides appropriate actions for 500 errors', () => {
            const error = new NetworkError('Server error', 500)

            expect(error.recoverable).toBe(true)
            expect(error.suggestedActions).toContain('Riprova tra qualche minuto')
        })
    })

    describe('ValidationError', () => {
        it('creates validation error with field errors', () => {
            const fieldErrors = {
                email: 'Email non valida',
                password: 'Password troppo corta'
            }
            const error = new ValidationError('Validazione fallita', fieldErrors)

            expect(error.name).toBe('ValidationError')
            expect(error.category).toBe(ErrorCategory.VALIDATION)
            expect(error.severity).toBe(ErrorSeverity.LOW)
            expect(error.recoverable).toBe(true)
            expect(error.fieldErrors).toEqual(fieldErrors)
        })
    })

    describe('SyncError', () => {
        it('creates sync error with code', () => {
            const error = new SyncError('TOKEN_MISSING', 'Token mancante')

            expect(error.name).toBe('SyncError')
            expect(error.category).toBe(ErrorCategory.SYNC)
            expect(error.code).toBe('TOKEN_MISSING')
            expect(error.severity).toBe(ErrorSeverity.HIGH)
        })
    })

    describe('StorageError', () => {
        it('creates storage error with critical severity', () => {
            const error = new StorageError('Quota exceeded')

            expect(error.name).toBe('StorageError')
            expect(error.category).toBe(ErrorCategory.STORAGE)
            expect(error.severity).toBe(ErrorSeverity.CRITICAL)
        })
    })

    describe('formatUserError', () => {
        it('formats AppError for user display', () => {
            const error = new AppError('Test error', {
                category: ErrorCategory.NETWORK,
                severity: ErrorSeverity.HIGH,
                code: 'NET_001',
                suggestedActions: ['Action 1']
            })

            const formatted = formatUserError('caricamento dati', error)

            expect(formatted.title).toBe('Errore caricamento dati')
            expect(formatted.message).toBe('Test error')
            expect(formatted.category).toBe(ErrorCategory.NETWORK)
            expect(formatted.severity).toBe(ErrorSeverity.HIGH)
            expect(formatted.code).toBe('NET_001')
            expect(formatted.actions).toEqual(['Action 1'])
        })

        it('formats standard Error for user display', () => {
            const error = new Error('Standard error')

            const formatted = formatUserError('salvataggio', error)

            expect(formatted.title).toBe('Errore salvataggio')
            expect(formatted.message).toBe('Standard error')
            expect(formatted.category).toBe(ErrorCategory.UNKNOWN)
            expect(formatted.recoverable).toBe(true)
            expect(formatted.actions).toContain('Riprova')
        })

        it('handles error without message', () => {
            const error = new Error()

            const formatted = formatUserError('operazione', error)

            expect(formatted.message).toBe('Operazione non riuscita')
        })
    })

    describe('formatErrorForLogging', () => {
        it('formats error with context for logging', () => {
            const error = new AppError('Test error', {
                category: ErrorCategory.SYNC,
                code: 'SYNC_001'
            })

            const logged = formatErrorForLogging(error, { userId: '123' })

            expect(logged.name).toBe('AppError')
            expect(logged.message).toBe('Test error')
            expect(logged.category).toBe(ErrorCategory.SYNC)
            expect(logged.code).toBe('SYNC_001')
            expect(logged.context).toEqual({ userId: '123' })
            expect(logged.userAgent).toBeDefined()
            expect(logged.url).toBeDefined()
        })
    })

    describe('handleAsync', () => {
        it('returns success result for successful operation', async () => {
            const operation = vi.fn().mockResolvedValue({ data: 'test' })

            const result = await handleAsync(operation, 'test operation')

            expect(result.success).toBe(true)
            expect(result.data).toEqual({ data: 'test' })
            expect(result.error).toBeUndefined()
        })

        it('returns error result for failed operation', async () => {
            const error = new AppError('Operation failed')
            const operation = vi.fn().mockRejectedValue(error)

            const result = await handleAsync(operation, 'test operation')

            expect(result.success).toBe(false)
            expect(result.data).toBeUndefined()
            expect(result.error).toBeDefined()
            expect(result.error.message).toBe('Operation failed')
        })
    })

    describe('createNetworkError', () => {
        it('creates error from HTTP response', async () => {
            const response = {
                status: 404,
                statusText: 'Not Found',
                url: 'https://api.example.com/data',
                json: vi.fn().mockResolvedValue({ message: 'Resource not found' })
            }

            const error = await createNetworkError(response, 'fetching data')

            expect(error).toBeInstanceOf(NetworkError)
            expect(error.message).toBe('Resource not found')
            expect(error.statusCode).toBe(404)
            expect(error.technicalDetails.url).toBe('https://api.example.com/data')
        })

        it('handles response without JSON body', async () => {
            const response = {
                status: 500,
                statusText: 'Internal Server Error',
                url: 'https://api.example.com/data',
                json: vi.fn().mockRejectedValue(new Error('Not JSON'))
            }

            const error = await createNetworkError(response, 'fetching data')

            expect(error.message).toBe('Errore fetching data (500)')
        })
    })

    describe('retryWithBackoff', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        it('succeeds on first attempt', async () => {
            const operation = vi.fn().mockResolvedValue('success')

            const result = await retryWithBackoff(operation)

            expect(result).toBe('success')
            expect(operation).toHaveBeenCalledTimes(1)
        })

        it('retries on failure and eventually succeeds', async () => {
            const operation = vi.fn()
                .mockRejectedValueOnce(new AppError('Fail 1'))
                .mockRejectedValueOnce(new AppError('Fail 2'))
                .mockResolvedValue('success')

            const promise = retryWithBackoff(operation, { maxRetries: 3 })

            // Fast-forward through delays
            await vi.runAllTimersAsync()

            const result = await promise

            expect(result).toBe('success')
            expect(operation).toHaveBeenCalledTimes(3)
        })

        it('throws after max retries', async () => {
            const error = new AppError('Persistent failure')
            const operation = vi.fn().mockRejectedValue(error)

            // Start the retry operation and immediately catch any rejection
            const promise = retryWithBackoff(operation, { maxRetries: 2 }).catch(err => err)

            // Fast-forward through all timers
            await vi.runAllTimersAsync()

            // Wait for promise to settle and check the error
            const result = await promise
            expect(result).toBeInstanceOf(AppError)
            expect(result.message).toBe('Persistent failure')
            expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
        })

        it('does not retry non-recoverable errors', async () => {
            const error = new AppError('Fatal error', { recoverable: false })
            const operation = vi.fn().mockRejectedValue(error)

            await expect(retryWithBackoff(operation)).rejects.toThrow('Fatal error')
            expect(operation).toHaveBeenCalledTimes(1)
        })

        it('uses exponential backoff', async () => {
            const operation = vi.fn()
                .mockRejectedValueOnce(new AppError('Fail 1'))
                .mockRejectedValueOnce(new AppError('Fail 2'))
                .mockResolvedValue('success')

            const promise = retryWithBackoff(operation, {
                initialDelay: 100,
                backoffFactor: 2
            })

            // First retry after 100ms
            await vi.advanceTimersByTimeAsync(100)
            expect(operation).toHaveBeenCalledTimes(2)

            // Second retry after 200ms
            await vi.advanceTimersByTimeAsync(200)
            expect(operation).toHaveBeenCalledTimes(3)

            await promise
        })
    })

    describe('isRecoverable', () => {
        it('returns true for recoverable AppError', () => {
            const error = new AppError('Recoverable', { recoverable: true })
            expect(isRecoverable(error)).toBe(true)
        })

        it('returns false for non-recoverable AppError', () => {
            const error = new AppError('Fatal', { recoverable: false })
            expect(isRecoverable(error)).toBe(false)
        })

        it('returns true for network errors', () => {
            const error = new TypeError('fetch failed')
            expect(isRecoverable(error)).toBe(true)
        })

        it('returns true for unknown errors by default', () => {
            const error = new Error('Unknown')
            expect(isRecoverable(error)).toBe(true)
        })
    })

    describe('getUserMessage', () => {
        it('returns message from AppError', () => {
            const error = new AppError('Custom message')
            expect(getUserMessage(error)).toBe('Custom message')
        })

        it('returns friendly message for network errors', () => {
            const error = new Error('fetch failed')
            expect(getUserMessage(error)).toContain('connessione')
        })

        it('returns friendly message for storage errors', () => {
            const error = new Error('quota exceeded')
            expect(getUserMessage(error)).toContain('archiviazione')
        })

        it('returns friendly message for permission errors', () => {
            const error = new Error('permission denied')
            expect(getUserMessage(error)).toContain('Permessi')
        })

        it('returns generic message for unknown errors', () => {
            const error = new Error()
            expect(getUserMessage(error)).toBe('Si è verificato un errore imprevisto.')
        })
    })
})

// Made with Bob
