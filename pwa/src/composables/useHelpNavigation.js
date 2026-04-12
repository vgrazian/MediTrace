import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'

export function useHelpNavigation() {
    const router = useRouter()
    const route = useRoute()

    function goToHelpSection(sectionKey) {
        const hash = `#${sectionKey}`
        router.push({
            path: '/manuale',
            hash,
            query: {
                from: route.fullPath,
                helpFrom: sectionKey,
            },
        })
    }

    return { goToHelpSection }
}
