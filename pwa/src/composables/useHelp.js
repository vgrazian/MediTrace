import { ref } from 'vue'

// Module-level singletons so state is shared across the whole app.
const isOpen = ref(false)
const currentSection = ref(null)

export function useHelp() {
    function openHelp(section) {
        currentSection.value = section
        isOpen.value = true
    }

    function closeHelp() {
        isOpen.value = false
        // Delay clearing section so the closing animation can use the content.
        setTimeout(() => { currentSection.value = null }, 300)
    }

    return { isOpen, currentSection, openHelp, closeHelp }
}
