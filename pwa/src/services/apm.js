/**
 * apm.js — Application Performance Monitoring (APM) leggero
 *
 * Raccoglie Web Vitals (LCP, FID/INP, CLS) e metriche di performance custom
 * usando API native del browser (PerformanceObserver, Performance API).
 * Invia tutto ad Axiom via logPerf().
 *
 * Nessuna dipendenza esterna — usa solo API browser standard.
 */

import { logPerf } from './axiomLogger'

/** @type {boolean} */
let initialized = false

/**
 * Avvia la raccolta APM. Chiamare una sola volta all'avvio dell'app.
 * Safe to call multiple times — ignores after first init.
 */
export function initApm() {
    if (initialized) return
    if (typeof window === 'undefined') return
    initialized = true

    observeLCP()
    observeINP()
    observeCLS()
}

// -- Largest Contentful Paint (LCP) --

function observeLCP() {
    try {
        new PerformanceObserver((list) => {
            const entries = list.getEntries()
            // LCP può essere reported più volte; prendiamo l'ultimo
            const lastEntry = entries[entries.length - 1]
            if (!lastEntry) return

            const value = lastEntry.renderTime || lastEntry.loadTime
            logPerf({
                metric: 'LCP',
                value: Math.round(value),
                rating: ratingLCP(value),
            })
        }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
        // LCP API non supportata
    }
}

// -- Interaction to Next Paint (INP) / First Input Delay (FID) --

function observeINP() {
    // Prova INP (nuova metrica, Chrome 96+)
    try {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // INP: ignoriamo duration 0 (interazioni non significative)
                if (entry.duration > 0) {
                    logPerf({
                        metric: 'INP',
                        value: Math.round(entry.duration),
                        rating: ratingINP(entry.duration),
                        extra: { interactionType: entry.name },
                    })
                }
            }
        }).observe({ type: 'first-input', buffered: true })
    } catch {
        // Fallback a FID
        try {
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    logPerf({
                        metric: 'FID',
                        value: Math.round(entry.processingStart - entry.startTime),
                        rating: ratingFID(entry.processingStart - entry.startTime),
                    })
                }
            }).observe({ type: 'first-input', buffered: true })
        } catch {
            // Nessuna metrica di interazione disponibile
        }
    }
}

// -- Cumulative Layout Shift (CLS) --

function observeCLS() {
    let clsValue = 0

    try {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // Solo layout shifts senza input recente contano per CLS
                if (!entry.hadRecentInput) {
                    clsValue += entry.value
                }
            }
        }).observe({ type: 'layout-shift', buffered: true })

        // Invia CLS al page hide (quando il valore è finale)
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && clsValue > 0) {
                    logPerf({
                        metric: 'CLS',
                        value: Math.round(clsValue * 10000) / 10000,
                        rating: ratingCLS(clsValue),
                    })
                }
            })
        }
    } catch {
        // CLS API non supportata
    }
}

// -- Route Timing (chiamata dal router) --

/**
 * Misura il tempo di transizione tra due route.
 * Chiamare da router.beforeEach/afterEach.
 *
 * @param {string} from - route di partenza
 * @param {string} to - route di arrivo
 * @param {number} duration - durata in millisecondi
 */
export function trackRouteTiming(from, to, duration) {
    logPerf({
        metric: 'route_timing',
        value: duration,
        rating: duration < 300 ? 'good' : duration < 1000 ? 'needs-improvement' : 'poor',
        extra: { from, to },
    })
}

// -- Rating helpers (basati su Google Web Vitals thresholds) --

/**
 * @param {number} value - ms
 * @returns {'good'|'needs-improvement'|'poor'}
 */
function ratingLCP(value) {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
}

/**
 * @param {number} value - ms
 * @returns {'good'|'needs-improvement'|'poor'}
 */
function ratingINP(value) {
    if (value <= 200) return 'good'
    if (value <= 500) return 'needs-improvement'
    return 'poor'
}

/**
 * @param {number} value - ms
 * @returns {'good'|'needs-improvement'|'poor'}
 */
function ratingFID(value) {
    if (value <= 100) return 'good'
    if (value <= 300) return 'needs-improvement'
    return 'poor'
}

/**
 * @param {number} value - score
 * @returns {'good'|'needs-improvement'|'poor'}
 */
function ratingCLS(value) {
    if (value <= 0.1) return 'good'
    if (value <= 0.25) return 'needs-improvement'
    return 'poor'
}
