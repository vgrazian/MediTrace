import { computed, ref } from 'vue'

/**
 * Manage reusable selection state for CRUD tables.
 *
 * This composable centralizes item selection logic so views can share the same
 * interaction model for single edit, multi-select delete, and select-all
 * operations without duplicating state management code.
 *
 * @param {import('vue').Ref<Array<{id: string}>>} items
 * Reactive collection of selectable items. Each item must expose an `id`
 * property used as the stable selection key.
 * @returns {{
 *   selectedItems: import('vue').Ref<string[]>,
 *   allSelected: import('vue').ComputedRef<boolean>,
 *   someSelected: import('vue').ComputedRef<boolean>,
 *   selectedCount: import('vue').ComputedRef<number>,
 *   toggleSelection: (id: string) => void,
 *   toggleSelectAll: () => void,
 *   clearSelection: () => void,
 *   isSelected: (id: string) => boolean,
 *   getSelectedItems: () => Array<{id: string}>
 * }}
 * Reusable selection state and helpers for CRUD views.
 */
export function useSelection(items) {
    const selectedItems = ref([])

    const allSelected = computed(() =>
        items.value.length > 0 && selectedItems.value.length === items.value.length,
    )

    const someSelected = computed(() =>
        selectedItems.value.length > 0 && selectedItems.value.length < items.value.length,
    )

    const selectedCount = computed(() => selectedItems.value.length)

    /**
     * Toggle one item by id.
     *
     * This keeps selection behavior deterministic for both checkbox and row-click
     * interactions.
     *
     * @param {string} id
     * Item identifier to toggle in the current selection.
     */
    function toggleSelection(id) {
        const index = selectedItems.value.indexOf(id)
        if (index > -1) {
            selectedItems.value.splice(index, 1)
            return
        }
        selectedItems.value.push(id)
    }

    /**
     * Toggle the entire current dataset.
     *
     * This uses the latest `items.value` so table reloads or filters always drive
     * the select-all behavior from the visible dataset.
     */
    function toggleSelectAll() {
        if (allSelected.value) {
            selectedItems.value = []
            return
        }
        selectedItems.value = items.value.map(item => item.id)
    }

    /**
     * Clear all current selections.
     *
     * Views should call this after bulk operations or when a form reset changes
     * the intended working context.
     */
    function clearSelection() {
        selectedItems.value = []
    }

    /**
     * Check whether a specific id is currently selected.
     *
     * @param {string} id
     * Item identifier to check.
     * @returns {boolean}
     * True when the identifier is present in the active selection.
     */
    function isSelected(id) {
        return selectedItems.value.includes(id)
    }

    /**
     * Resolve currently selected records from the latest visible items.
     *
     * This intentionally filters against `items.value` so removed or filtered-out
     * records are not returned to bulk action handlers.
     *
     * @returns {Array<{id: string}>}
     * Selected records that still exist in the current dataset.
     */
    function getSelectedItems() {
        return items.value.filter(item => selectedItems.value.includes(item.id))
    }

    return {
        selectedItems,
        allSelected,
        someSelected,
        selectedCount,
        toggleSelection,
        toggleSelectAll,
        clearSelection,
        isSelected,
        getSelectedItems,
    }
}

// Made with Bob
