import { onMounted, watch } from 'vue'

function normalizeStorageKey(key) {
    const normalized = String(key || '').trim()
    if (!normalized) throw new Error('Session view state key is required')
    return normalized
}

function readState(key) {
    try {
        const raw = sessionStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

function writeState(key, snapshot) {
    try {
        sessionStorage.setItem(key, JSON.stringify(snapshot))
    } catch {
        // Ignore storage quota/availability issues: persistence is best-effort.
    }
}

export function useSessionViewState(storageKey, refsMap) {
    const key = normalizeStorageKey(storageKey)
    const entries = Object.entries(refsMap || {})

    onMounted(() => {
        const stored = readState(key)
        if (!stored) return

        for (const [field, stateRef] of entries) {
            if (!stateRef || !(field in stored)) continue
            stateRef.value = stored[field]
        }
    })

    watch(
        () => {
            const snapshot = {}
            for (const [field, stateRef] of entries) {
                snapshot[field] = stateRef?.value
            }
            return snapshot
        },
        (snapshot) => writeState(key, snapshot),
        { deep: true },
    )
}
