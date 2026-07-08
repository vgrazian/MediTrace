/**
 * apm.spec.js — Test per il modulo APM
 */
import { describe, it, expect, vi } from 'vitest'
import { initApm, trackRouteTiming } from '../../src/services/apm'

// Mock axiomLogger
vi.mock('../../src/services/axiomLogger', () => ({
  logPerf: vi.fn(),
}))

describe('apm', () => {
  describe('initApm', () => {
    it('non lancia errori (safe init)', () => {
      expect(() => initApm()).not.toThrow()
    })

    it('è idempotente (chiamata multipla non causa errori)', () => {
      initApm()
      initApm()
      initApm()
      // Se arriva qui senza errori, ok
    })
  })

  describe('trackRouteTiming', () => {
    it('invia metrica route_timing con rating corretto', async () => {
      const { logPerf } = await import('../../src/services/axiomLogger')

      trackRouteTiming('/home', '/farmaci', 250)
      expect(logPerf).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'route_timing',
          value: 250,
          rating: 'good',
          extra: { from: '/home', to: '/farmaci' },
        })
      )
    })

    it('rating needs-improvement per 300-999ms', async () => {
      const { logPerf } = await import('../../src/services/axiomLogger')
      logPerf.mockClear()

      trackRouteTiming('/a', '/b', 500)
      expect(logPerf).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 'needs-improvement', value: 500 })
      )
    })

    it('rating poor per >= 1000ms', async () => {
      const { logPerf } = await import('../../src/services/axiomLogger')
      logPerf.mockClear()

      trackRouteTiming('/a', '/b', 1500)
      expect(logPerf).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 'poor', value: 1500 })
      )
    })
  })
})
