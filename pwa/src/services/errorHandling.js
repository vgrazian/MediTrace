/**
 * errorHandling.js - Centralized error handling and user feedback
 * 
 * Provides consistent error formatting, categorization, and recovery guidance
 * across the entire application.
 */

/**
 * Error categories for consistent handling
 */
export const ErrorCategory = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    NOT_FOUND: 'not_found',
    CONFLICT: 'conflict',
    STORAGE: 'storage',
    SYNC: 'sync',
    UNKNOWN: 'unknown'
}

/**
 * Error severity levels
 */
export const ErrorSeverity = {
    CRITICAL: 'critical',  // Blocks user workflow
    HIGH: 'high',          // Significant impact
    MEDIUM: 'medium',      // Moderate impact
    LOW: 'low'             // Minor inconvenience
}

/**
 * Custom error class with enhanced metadata
 */
export class AppError extends Error {
    constructor(message, options = {}) {
        super(message)
        this.name = 'AppError'
        this.category = options.category || ErrorCategory.UNKNOWN
        this.severity = options.severity || ErrorSeverity.MEDIUM
        this.code = options.code
        this.recoverable = options.recoverable !== false
        this.suggestedActions = options.suggestedActions || []
        this.technicalDetails = options.technicalDetails
        this.timestamp = new Date().toISOString()
    }
}

/**
 * Network-specific error
 */
export class NetworkError extends AppError {
    constructor(message, statusCode, options = {}) {
        super(message, {
            ...options,
            category: ErrorCategory.NETWORK,
            code: `NETWORK_${statusCode}`
        })
        this.name = 'NetworkError'
        this.statusCode = statusCode
        this.recoverable = statusCode >= 500 || statusCode === 429

        // Add default recovery actions based on status
        if (!this.suggestedActions.length) {
            this.suggestedActions = this.getDefaultNetworkActions(statusCode)
        }
    }

    getDefaultNetworkActions(statusCode) {
        const actions = ['Verifica la connessione internet']

        if (statusCode === 401 || statusCode === 403) {
            actions.push('Verifica le credenziali di accesso')
        } else if (statusCode === 429) {
            actions.push('Attendi qualche minuto prima di riprovare')
        } else if (statusCode >= 500) {
            actions.push('Il servizio potrebbe essere temporaneamente non disponibile')
            actions.push('Riprova tra qualche minuto')
        } else if (statusCode === 404) {
            actions.push('La risorsa richiesta non esiste')
        }

        return actions
    }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
    constructor(message, fieldErrors = {}, options = {}) {
        super(message, {
            ...options,
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.LOW,
            recoverable: true
        })
        this.name = 'ValidationError'
        this.fieldErrors = fieldErrors
    }
}

/**
 * Sync error
 */
export class SyncError extends AppError {
    constructor(code, message, options = {}) {
        super(message, {
            ...options,
            category: ErrorCategory.SYNC,
            code,
            severity: options.severity || ErrorSeverity.HIGH
        })
        this.name = 'SyncError'
    }
}

/**
 * Storage error
 */
export class StorageError extends AppError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            category: ErrorCategory.STORAGE,
            severity: ErrorSeverity.CRITICAL
        })
        this.name = 'StorageError'
    }
}

/**
 * Format error for user display
 * 
 * @param {string} context - Operation context (e.g., "caricamento farmaci")
 * @param {Error} error - The error to format
 * @returns {Object} Formatted error object
 */
export function formatUserError(context, error) {
    // Handle AppError instances
    if (error instanceof AppError) {
        return {
            title: `Errore ${context}`,
            message: error.message,
            category: error.category,
            severity: error.severity,
            code: error.code,
            recoverable: error.recoverable,
            actions: error.suggestedActions,
            technicalDetails: error.technicalDetails,
            timestamp: error.timestamp
        }
    }

    // Handle standard errors
    return {
        title: `Errore ${context}`,
        message: error.message || 'Operazione non riuscita',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        actions: ['Riprova', 'Se il problema persiste, contatta il supporto'],
        technicalDetails: error.stack,
        timestamp: new Date().toISOString()
    }
}

/**
 * Format error for logging/debugging
 * 
 * @param {Error} error - The error to format
 * @param {Object} context - Additional context
 * @returns {Object} Formatted error for logging
 */
export function formatErrorForLogging(error, context = {}) {
    return {
        name: error.name,
        message: error.message,
        category: error.category || ErrorCategory.UNKNOWN,
        severity: error.severity || ErrorSeverity.MEDIUM,
        code: error.code,
        stack: error.stack,
        timestamp: error.timestamp || new Date().toISOString(),
        context,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }
}

/**
 * Handle async operation with consistent error handling
 * 
 * @param {Function} operation - Async function to execute
 * @param {string} context - Operation context for error messages
 * @returns {Promise<{success: boolean, data?: any, error?: Object}>}
 */
export async function handleAsync(operation, context) {
    try {
        const data = await operation()
        return { success: true, data }
    } catch (error) {
        const formattedError = formatUserError(context, error)
        console.error(`[${context}]`, formatErrorForLogging(error, { context }))
        return { success: false, error: formattedError }
    }
}

/**
 * Create error from HTTP response
 * 
 * @param {Response} response - Fetch API response
 * @param {string} context - Operation context
 * @returns {NetworkError}
 */
export async function createNetworkError(response, context) {
    let message = `Errore ${context} (${response.status})`

    try {
        const body = await response.json()
        if (body.message) {
            message = body.message
        }
    } catch {
        // Response body not JSON or empty
    }

    return new NetworkError(message, response.status, {
        technicalDetails: {
            url: response.url,
            status: response.status,
            statusText: response.statusText
        }
    })
}

/**
 * Retry operation with exponential backoff
 * 
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(operation, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2,
        shouldRetry = (error) => error.recoverable !== false
    } = options

    let lastError
    let delay = initialDelay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error

            if (attempt === maxRetries || !shouldRetry(error)) {
                throw error
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay))

            // Increase delay for next attempt
            delay = Math.min(delay * backoffFactor, maxDelay)
        }
    }

    throw lastError
}

/**
 * Check if error is recoverable
 * 
 * @param {Error} error
 * @returns {boolean}
 */
export function isRecoverable(error) {
    if (error instanceof AppError) {
        return error.recoverable
    }

    // Network errors are generally recoverable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true
    }

    // Default to recoverable for unknown errors
    return true
}

/**
 * Get user-friendly error message
 * 
 * @param {Error} error
 * @returns {string}
 */
export function getUserMessage(error) {
    if (error instanceof AppError) {
        return error.message
    }

    // Map common error patterns to user-friendly messages
    const message = error.message || ''

    if (message.includes('fetch') || message.includes('network')) {
        return 'Errore di connessione. Verifica la tua connessione internet.'
    }

    if (message.includes('quota') || message.includes('storage')) {
        return 'Spazio di archiviazione insufficiente.'
    }

    if (message.includes('permission') || message.includes('denied')) {
        return 'Permessi insufficienti per completare l\'operazione.'
    }

    return message || 'Si è verificato un errore imprevisto.'
}

// Made with Bob
