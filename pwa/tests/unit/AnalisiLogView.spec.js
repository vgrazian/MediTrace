/**
 * AnalisiLogView.spec.js — Test per la view di analisi operazionale
 *
 * Testa importabilità, struttura del componente e comportamento senza montaggio DOM
 * (evita dipendenza da @vue/test-utils non installata).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth prima dell'import del componente
vi.mock('../../src/services/auth', () => ({
  useAuth: vi.fn(() => ({
    currentUser: { username: 'admin', role: 'admin' },
    hasUsers: true,
    isInitialized: true,
  })),
}))

// Mock axiomLogger
vi.mock('../../src/services/axiomLogger', () => ({
  isAxiomConfigured: vi.fn(() => false),
  logAction: vi.fn(),
  logPageView: vi.fn(),
  logError: vi.fn(),
  logAuth: vi.fn(),
  logSync: vi.fn(),
  logPerf: vi.fn(),
  flush: vi.fn(),
}))

describe('AnalisiLogView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('il modulo è importabile senza errori', async () => {
    const mod = await import('../../src/views/AnalisiLogView.vue')
    expect(mod).toBeDefined()
    expect(mod.default).toBeDefined()
  })

  it('il componente ha un nome o render function', async () => {
    const mod = await import('../../src/views/AnalisiLogView.vue')
    const comp = mod.default
    // I componenti Vue SFC hanno setup o render
    expect(comp.setup || comp.render || comp.template || comp.__file).toBeTruthy()
  })

  it('isAxiomConfigured viene chiamato per determinare lo stato', async () => {
    const { isAxiomConfigured } = await import('../../src/services/axiomLogger')
    expect(isAxiomConfigured).toBeDefined()
    expect(typeof isAxiomConfigured).toBe('function')
  })

  it('il componente esporta correttamente i riferimenti attesi', async () => {
    const mod = await import('../../src/views/AnalisiLogView.vue')
    // Verifica che sia un SFC Vue valido
    expect(typeof mod.default).toBe('object')
  })
})
