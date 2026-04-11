import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useSelection } from '../../src/composables/useSelection'

describe('useSelection composable', () => {
    let items
    let selection

    beforeEach(() => {
        items = ref([
            { id: 'a', name: 'Alpha' },
            { id: 'b', name: 'Beta' },
            { id: 'c', name: 'Gamma' },
        ])

        selection = useSelection(items)
    })

    it('starts with no selected items', () => {
        expect(selection.selectedItems.value).toEqual([])
        expect(selection.selectedCount.value).toBe(0)
        expect(selection.allSelected.value).toBe(false)
        expect(selection.someSelected.value).toBe(false)
    })

    it('toggles a single item selection', () => {
        selection.toggleSelection('a')

        expect(selection.selectedItems.value).toEqual(['a'])
        expect(selection.isSelected('a')).toBe(true)
        expect(selection.selectedCount.value).toBe(1)
        expect(selection.someSelected.value).toBe(true)
        expect(selection.allSelected.value).toBe(false)

        selection.toggleSelection('a')

        expect(selection.selectedItems.value).toEqual([])
        expect(selection.isSelected('a')).toBe(false)
        expect(selection.selectedCount.value).toBe(0)
    })

    it('selects all items when toggleSelectAll is called', () => {
        selection.toggleSelectAll()

        expect(selection.selectedItems.value).toEqual(['a', 'b', 'c'])
        expect(selection.selectedCount.value).toBe(3)
        expect(selection.allSelected.value).toBe(true)
        expect(selection.someSelected.value).toBe(false)
    })

    it('clears all selected items when toggleSelectAll is called twice', () => {
        selection.toggleSelectAll()
        selection.toggleSelectAll()

        expect(selection.selectedItems.value).toEqual([])
        expect(selection.selectedCount.value).toBe(0)
        expect(selection.allSelected.value).toBe(false)
        expect(selection.someSelected.value).toBe(false)
    })

    it('returns only the selected item records', () => {
        selection.toggleSelection('a')
        selection.toggleSelection('c')

        expect(selection.getSelectedItems()).toEqual([
            { id: 'a', name: 'Alpha' },
            { id: 'c', name: 'Gamma' },
        ])
    })

    it('clears the selection explicitly', () => {
        selection.toggleSelection('a')
        selection.toggleSelection('b')

        selection.clearSelection()

        expect(selection.selectedItems.value).toEqual([])
        expect(selection.selectedCount.value).toBe(0)
    })

    it('handles empty item collections', () => {
        items.value = []

        expect(selection.allSelected.value).toBe(false)
        expect(selection.someSelected.value).toBe(false)

        selection.toggleSelectAll()

        expect(selection.selectedItems.value).toEqual([])
        expect(selection.selectedCount.value).toBe(0)
    })

    it('ignores removed items when returning selected records', () => {
        selection.toggleSelection('a')
        selection.toggleSelection('b')

        items.value = [{ id: 'b', name: 'Beta' }]

        expect(selection.getSelectedItems()).toEqual([{ id: 'b', name: 'Beta' }])
        expect(selection.selectedItems.value).toEqual(['a', 'b'])
        expect(selection.selectedCount.value).toBe(2)
    })
})

// Made with Bob
