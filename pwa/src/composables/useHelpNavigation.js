import { useRouter } from 'vue-router'

export function useHelpNavigation() {
    const router = useRouter()

    function goToHelpSection(sectionKey) {
        const hash = `#${sectionKey}`
        router.push({ path: '/manuale', hash })
    }

    return { goToHelpSection }
}
