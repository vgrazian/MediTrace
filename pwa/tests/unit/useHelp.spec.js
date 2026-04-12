import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

// Reset module between tests so singleton state is fresh.
describe('useHelp composable', () => {
    let useHelp

    beforeEach(async () => {
        // Force module re-evaluation to reset singleton state.
        const mod = await import('../../src/composables/useHelp?v=' + Math.random())
        useHelp = mod.useHelp
    })

    it('starts closed with no section', () => {
        const { isOpen, currentSection } = useHelp()
        expect(isOpen.value).toBe(false)
        expect(currentSection.value).toBeNull()
    })

    it('openHelp sets section and opens the drawer', () => {
        const { isOpen, currentSection, openHelp } = useHelp()
        openHelp('farmaci')
        expect(isOpen.value).toBe(true)
        expect(currentSection.value).toBe('farmaci')
    })

    it('closeHelp closes the drawer', () => {
        const { isOpen, openHelp, closeHelp } = useHelp()
        openHelp('terapie')
        expect(isOpen.value).toBe(true)
        closeHelp()
        expect(isOpen.value).toBe(false)
    })

    it('multiple calls to openHelp switch to the new section', () => {
        const { currentSection, openHelp } = useHelp()
        openHelp('ospiti')
        expect(currentSection.value).toBe('ospiti')
        openHelp('audit')
        expect(currentSection.value).toBe('audit')
    })
})
