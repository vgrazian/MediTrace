# Issue 4.7: Simplified CRUD Operations

**Created:** 2026-04-07 09:30 CET  
**Category:** User Experience & Interface Ergonomics  
**Priority:** P0 (Critical)  
**Effort:** 8-12 hours  
**Impact:** High - Significantly improves daily workflow efficiency  
**PR:** #52 (to be created)

## Problem Statement

Current CRUD operations in MediTrace require multiple steps and are not intuitive for daily healthcare worker use:

### Current Issues:
1. **No Clear Add Button** - "Aggiungi" button not prominently visible on panels
2. **Complex Edit Workflow** - Editing requires navigating through forms without clear selection
3. **No Bulk Delete** - Delete operations don't support multiple selections
4. **No Visual Selection** - No indication of which items are selected
5. **Inefficient Workflow** - Cumbersome for bulk operations common in daily use

### User Impact:
- Healthcare workers waste time on repetitive operations
- Risk of errors when performing bulk operations manually
- Frustration with non-intuitive interface
- Reduced productivity in daily medication management tasks

## Proposed Solution

### 1. Simple Action Buttons on Each Panel

```vue
<div class="panel-actions">
  <!-- Always visible Add button -->
  <button 
    class="btn-primary" 
    @click="openAddForm"
    aria-label="Aggiungi nuovo elemento"
  >
    <span class="icon">+</span>
    Aggiungi
  </button>
  
  <!-- Edit button - enabled only with single selection -->
  <button 
    class="btn-secondary" 
    @click="openEditForm"
    :disabled="selectedItems.length !== 1"
    :title="selectedItems.length !== 1 ? 'Seleziona un elemento da modificare' : ''"
  >
    <span class="icon">✎</span>
    Modifica
  </button>
  
  <!-- Delete button - supports multiple selections -->
  <button 
    class="btn-danger" 
    @click="deleteSelected"
    :disabled="selectedItems.length === 0"
    :title="selectedItems.length === 0 ? 'Seleziona elementi da eliminare' : ''"
  >
    <span class="icon">🗑</span>
    Elimina {{ selectedItems.length > 0 ? `(${selectedItems.length})` : '' }}
  </button>
</div>
```

### 2. Checkbox Selection System

```vue
<table>
  <thead>
    <tr>
      <th class="checkbox-col">
        <input 
          type="checkbox" 
          @change="toggleSelectAll"
          :checked="allSelected"
          :indeterminate="someSelected"
          aria-label="Seleziona tutti"
        >
      </th>
      <th>Nome</th>
      <th>Dettagli</th>
    </tr>
  </thead>
  <tbody>
    <tr 
      v-for="item in items" 
      :key="item.id"
      :class="{ 'selected': isSelected(item.id) }"
      @click="toggleSelection(item.id)"
    >
      <td class="checkbox-col">
        <input 
          type="checkbox" 
          :checked="isSelected(item.id)"
          @change="toggleSelection(item.id)"
          @click.stop
          :aria-label="`Seleziona ${item.name}`"
        >
      </td>
      <td>{{ item.name }}</td>
      <td>{{ item.details }}</td>
    </tr>
  </tbody>
</table>
```

### 3. Selection Info Display

```vue
<div v-if="selectedItems.length > 0" class="selection-info">
  {{ selectedItems.length }} elemento{{ selectedItems.length > 1 ? 'i' : '' }} 
  selezionat{{ selectedItems.length > 1 ? 'i' : 'o' }}
  <button @click="clearSelection" class="btn-link">Deseleziona tutto</button>
</div>
```

## Implementation Plan

### Phase 1: Create Reusable Composable (1 hour)

**File:** `pwa/src/composables/useSelection.js`

```javascript
import { ref, computed } from 'vue'

export function useSelection(items) {
  const selectedItems = ref([])

  const allSelected = computed(() => 
    items.value.length > 0 && selectedItems.value.length === items.value.length
  )

  const someSelected = computed(() => 
    selectedItems.value.length > 0 && selectedItems.value.length < items.value.length
  )

  const selectedCount = computed(() => selectedItems.value.length)

  function toggleSelection(id) {
    const index = selectedItems.value.indexOf(id)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    } else {
      selectedItems.value.push(id)
    }
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedItems.value = []
    } else {
      selectedItems.value = items.value.map(item => item.id)
    }
  }

  function clearSelection() {
    selectedItems.value = []
  }

  function isSelected(id) {
    return selectedItems.value.includes(id)
  }

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
    getSelectedItems
  }
}
```

### Phase 2: Update Confirmation Service (1 hour)

**File:** `pwa/src/services/confirmations.js`

Add new function:

```javascript
export function confirmDeleteMultiple(count, itemType = 'elementi') {
  const message = count === 1
    ? `Sei sicuro di voler eliminare questo ${itemType}?`
    : `Sei sicuro di voler eliminare ${count} ${itemType}?`
  
  const details = count > 1
    ? `Questa azione eliminerà ${count} ${itemType} e non può essere annullata.`
    : `Questa azione non può essere annullata.`
  
  return globalThis.confirm(`${message}\n\n${details}`)
}
```

### Phase 3: Update All Views (5-6 hours)

Views to update:
1. **FarmaciView.vue** (1 hour)
2. **OspitiView.vue** (1 hour)
3. **TerapieView.vue** (1 hour)
4. **PromemoriaView.vue** (45 min)
5. **MovimentiView.vue** (45 min)
6. **ScorteView.vue** (45 min)
7. **StanzeView.vue** (45 min)

**Pattern for each view:**

```vue
<script setup>
import { useSelection } from '@/composables/useSelection'
import { confirmDeleteMultiple } from '@/services/confirmations'

// Existing code...

const {
  selectedItems,
  allSelected,
  someSelected,
  selectedCount,
  toggleSelection,
  toggleSelectAll,
  clearSelection,
  isSelected,
  getSelectedItems
} = useSelection(items)

async function openEditForm() {
  if (selectedCount.value !== 1) return
  const item = getSelectedItems()[0]
  // Open edit form with item data
  editingItem.value = { ...item }
  showEditForm.value = true
}

async function deleteSelected() {
  if (selectedCount.value === 0) return
  
  const confirmed = confirmDeleteMultiple(selectedCount.value, 'farmaci')
  if (!confirmed) return
  
  try {
    for (const item of getSelectedItems()) {
      await deleteItem(item.id)
    }
    clearSelection()
    await loadData()
  } catch (error) {
    errorMessage.value = formatUserError(error)
  }
}
</script>
```

### Phase 4: Add CSS Styles (30 min)

**File:** `pwa/src/style.css`

```css
/* Panel Actions */
.panel-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary, .btn-danger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn-secondary {
  background: var(--secondary-color);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--secondary-dark);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--danger-dark);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Selection Info */
.selection-info {
  padding: 0.75rem 1rem;
  background: var(--info-bg, #e3f2fd);
  border-left: 4px solid var(--primary-color);
  border-radius: 4px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: 0.9rem;
}

.btn-link:hover {
  color: var(--primary-dark);
}

/* Table Selection */
.checkbox-col {
  width: 40px;
  text-align: center;
  padding: 0.5rem;
}

.checkbox-col input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

tr.selected {
  background: var(--selected-bg, #f5f5f5);
  border-left: 3px solid var(--primary-color);
}

tr:hover {
  background: var(--hover-bg, #fafafa);
  cursor: pointer;
}

tr.selected:hover {
  background: var(--selected-hover-bg, #eeeeee);
}

/* Responsive */
@media (max-width: 768px) {
  .panel-actions {
    flex-direction: column;
  }
  
  .btn-primary, .btn-secondary, .btn-danger {
    width: 100%;
    justify-content: center;
  }
  
  .selection-info {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

### Phase 5: Create Tests (2-3 hours)

#### Unit Tests: `pwa/tests/unit/useSelection.spec.js`

```javascript
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSelection } from '@/composables/useSelection'

describe('useSelection', () => {
  it('should initialize with empty selection', () => {
    const items = ref([{ id: 1 }, { id: 2 }])
    const { selectedItems, selectedCount } = useSelection(items)
    
    expect(selectedItems.value).toEqual([])
    expect(selectedCount.value).toBe(0)
  })

  it('should toggle single selection', () => {
    const items = ref([{ id: 1 }, { id: 2 }])
    const { selectedItems, toggleSelection, isSelected } = useSelection(items)
    
    toggleSelection(1)
    expect(isSelected(1)).toBe(true)
    expect(selectedItems.value).toEqual([1])
    
    toggleSelection(1)
    expect(isSelected(1)).toBe(false)
    expect(selectedItems.value).toEqual([])
  })

  it('should select all items', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { selectedItems, toggleSelectAll, allSelected } = useSelection(items)
    
    toggleSelectAll()
    expect(allSelected.value).toBe(true)
    expect(selectedItems.value).toEqual([1, 2, 3])
  })

  it('should deselect all items', () => {
    const items = ref([{ id: 1 }, { id: 2 }])
    const { selectedItems, toggleSelectAll, allSelected } = useSelection(items)
    
    toggleSelectAll() // Select all
    toggleSelectAll() // Deselect all
    expect(allSelected.value).toBe(false)
    expect(selectedItems.value).toEqual([])
  })

  it('should detect some selected state', () => {
    const items = ref([{ id: 1 }, { id: 2 }, { id: 3 }])
    const { toggleSelection, someSelected, allSelected } = useSelection(items)
    
    toggleSelection(1)
    expect(someSelected.value).toBe(true)
    expect(allSelected.value).toBe(false)
  })

  it('should clear selection', () => {
    const items = ref([{ id: 1 }, { id: 2 }])
    const { selectedItems, toggleSelection, clearSelection } = useSelection(items)
    
    toggleSelection(1)
    toggleSelection(2)
    clearSelection()
    expect(selectedItems.value).toEqual([])
  })

  it('should get selected items', () => {
    const items = ref([
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' }
    ])
    const { toggleSelection, getSelectedItems } = useSelection(items)
    
    toggleSelection(1)
    toggleSelection(3)
    
    const selected = getSelectedItems()
    expect(selected).toHaveLength(2)
    expect(selected[0].name).toBe('Item 1')
    expect(selected[1].name).toBe('Item 3')
  })
})
```

#### E2E Tests: `pwa/tests/e2e/crud-operations.spec.js`

```javascript
import { test, expect } from '@playwright/test'
import { login } from './helpers/login'

test.describe('CRUD Operations with Selection', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should show action buttons on Farmaci view', async ({ page }) => {
    await page.goto('/farmaci')
    
    await expect(page.getByRole('button', { name: /aggiungi/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /modifica/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /elimina/i })).toBeVisible()
  })

  test('should disable edit and delete when no selection', async ({ page }) => {
    await page.goto('/farmaci')
    
    await expect(page.getByRole('button', { name: /modifica/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /elimina/i })).toBeDisabled()
  })

  test('should enable edit with single selection', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Select first item
    await page.locator('tbody tr:first-child input[type="checkbox"]').click()
    
    await expect(page.getByRole('button', { name: /modifica/i })).toBeEnabled()
  })

  test('should disable edit with multiple selections', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Select two items
    await page.locator('tbody tr:nth-child(1) input[type="checkbox"]').click()
    await page.locator('tbody tr:nth-child(2) input[type="checkbox"]').click()
    
    await expect(page.getByRole('button', { name: /modifica/i })).toBeDisabled()
  })

  test('should enable delete with any selection', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Select one item
    await page.locator('tbody tr:first-child input[type="checkbox"]').click()
    
    await expect(page.getByRole('button', { name: /elimina/i })).toBeEnabled()
  })

  test('should show selection count', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Select two items
    await page.locator('tbody tr:nth-child(1) input[type="checkbox"]').click()
    await page.locator('tbody tr:nth-child(2) input[type="checkbox"]').click()
    
    await expect(page.locator('.selection-info')).toContainText('2 elementi selezionati')
  })

  test('should select all with header checkbox', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Click select all
    await page.locator('thead input[type="checkbox"]').click()
    
    // Verify all rows selected
    const selectedRows = await page.locator('tr.selected').count()
    const totalRows = await page.locator('tbody tr').count()
    expect(selectedRows).toBe(totalRows)
  })

  test('should clear selection', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Select items
    await page.locator('tbody tr:nth-child(1) input[type="checkbox"]').click()
    await page.locator('tbody tr:nth-child(2) input[type="checkbox"]').click()
    
    // Clear selection
    await page.getByRole('button', { name: /deseleziona tutto/i }).click()
    
    await expect(page.locator('.selection-info')).not.toBeVisible()
  })

  test('should highlight selected rows', async ({ page }) => {
    await page.goto('/farmaci')
    
    const firstRow = page.locator('tbody tr:first-child')
    await firstRow.locator('input[type="checkbox"]').click()
    
    await expect(firstRow).toHaveClass(/selected/)
  })

  test('should delete multiple items with confirmation', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Select two items
    await page.locator('tbody tr:nth-child(1) input[type="checkbox"]').click()
    await page.locator('tbody tr:nth-child(2) input[type="checkbox"]').click()
    
    // Setup dialog handler
    page.on('dialog', dialog => dialog.accept())
    
    // Click delete
    await page.getByRole('button', { name: /elimina \(2\)/i }).click()
    
    // Verify items deleted (selection cleared)
    await expect(page.locator('.selection-info')).not.toBeVisible()
  })

  test('should work with keyboard navigation', async ({ page }) => {
    await page.goto('/farmaci')
    
    // Tab to first checkbox
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // Skip header checkbox
    
    // Select with Space
    await page.keyboard.press('Space')
    
    // Verify selection
    await expect(page.locator('tbody tr:first-child')).toHaveClass(/selected/)
  })
})
```

## Benefits

### For Healthcare Workers:
- ✅ **Faster Operations** - Fewer clicks for common tasks
- ✅ **Bulk Delete** - Major time saver for cleaning up old data
- ✅ **Clear Feedback** - Visual indication of selected items
- ✅ **Intuitive Workflow** - Familiar checkbox pattern
- ✅ **Reduced Errors** - Clear confirmation for bulk operations

### For Developers:
- ✅ **Reusable Composable** - DRY principle applied
- ✅ **Consistent UX** - Same pattern across all views
- ✅ **Easy to Test** - Well-defined composable logic
- ✅ **Maintainable** - Centralized selection logic

### For Project:
- ✅ **Better Accessibility** - ARIA labels and keyboard support
- ✅ **Mobile Friendly** - Responsive design
- ✅ **Professional UX** - Industry-standard pattern
- ✅ **Reduced Support** - Intuitive interface needs less training

## Success Metrics

- **Time Savings:** 50% reduction in time for bulk operations
- **User Satisfaction:** Improved usability scores
- **Error Reduction:** Fewer accidental deletions
- **Adoption:** Increased use of bulk operations

## Timeline

- **Week 1:** Create composable and update confirmation service (2 hours)
- **Week 2:** Update all 7 views (5-6 hours)
- **Week 3:** Add styles and create tests (3 hours)
- **Week 4:** Manual testing and refinement (1 hour)

**Total Estimated Effort:** 8-12 hours

## Dependencies

- PR #50 (Form Validation) should be completed first
- Requires existing confirmation service
- Builds on existing view structure

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing workflows | High | Thorough E2E testing |
| Performance with large datasets | Medium | Virtual scrolling (future PR) |
| Mobile usability | Medium | Responsive design and testing |
| Accessibility issues | Medium | ARIA labels and keyboard support |

## Related Issues

- Issue 4.1: Destructive Action Confirmations (✅ Completed - PR #49)
- Issue 4.2: Form Validation Feedback (🔄 In Progress - PR #50)
- Issue 6.1: ARIA Labels (📋 Planned - PR #51)

---

**Status:** Ready for implementation  
**Next Step:** Create PR #52 after PR #50 is completed  
**Owner:** To be assigned  
**Reviewers:** To be assigned