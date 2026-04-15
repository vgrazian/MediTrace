<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../services/auth'
import {
  createResidenza,
  deactivateResidenza,
  ensureDefaultResidenze,
  listResidenze,
  restoreResidenza,
  updateResidenza,
} from '../services/residenze'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { openConfirmDialog } from '../services/confirmDialog'
import { useUndoDelete } from '../composables/useUndoDelete'
import CrudFilterBar from '../components/CrudFilterBar.vue'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const { pendingUndo, scheduleUndo, executeUndo } = useUndoDelete(10_000)

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const filterQuery = ref('')

const residenze = ref([])
const isFormOpen = ref(false)
const editId = ref('')

const form = ref({
  codice: '',
  maxOspiti: '10',
  note: '',
})

const filteredResidenze = computed(() => {
  const q = filterQuery.value.trim().toLowerCase()
  if (!q) return residenze.value
  return residenze.value.filter(item => {
    const text = [item.codice, item.note, String(item.maxOspiti), String(item.ospitiAttivi)].filter(Boolean).join(' ').toLowerCase()
    return text.includes(q)
  })
})

const canSave = computed(() => {
  const code = form.value.codice.trim()
  const max = Number(form.value.maxOspiti)
  return Boolean(code) && Number.isFinite(max) && max > 0
})

function resetForm() {
  editId.value = ''
  form.value = {
    codice: '',
    maxOspiti: '10',
    note: '',
  }
}

function startEdit(item) {
  editId.value = item.id
  form.value = {
    codice: item.codice || '',
    maxOspiti: String(item.maxOspiti || 10),
    note: item.note || '',
  }
  isFormOpen.value = true
}

function formatCapienza(item) {
  return `${item.ospitiAttivi}/${item.maxOspiti}`
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    await ensureDefaultResidenze({ operatorId: currentUser.value?.login ?? null })
    residenze.value = await listResidenze()
  } catch (error) {
    errorMessage.value = `Errore caricamento: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!canSave.value) return
  message.value = ''
  errorMessage.value = ''
  saving.value = true
  try {
    const payload = {
      codice: form.value.codice.trim(),
      maxOspiti: form.value.maxOspiti,
      note: form.value.note,
      operatorId: currentUser.value?.login ?? null,
    }

    if (editId.value) {
      await updateResidenza({ roomId: editId.value, ...payload })
      message.value = 'Residenza aggiornata.'
    } else {
      await createResidenza(payload)
      message.value = 'Residenza creata.'
    }

    resetForm()
    await loadData()
  } catch (error) {
    errorMessage.value = `Errore: ${error.message}`
  } finally {
    saving.value = false
  }
}

async function handleDelete(item) {
  const confirmed = await openConfirmDialog({
    title: 'Conferma eliminazione residenza',
    message: `Eliminare la residenza "${item.codice}"?`,
    details: 'La residenza verra disattivata e non sara piu selezionabile nei promemoria.',
    confirmText: 'Elimina residenza',
    cancelText: 'Annulla',
    tone: 'danger',
  })
  if (!confirmed) return

  message.value = ''
  errorMessage.value = ''

  try {
    const deleted = await deactivateResidenza({ roomId: item.id, operatorId: currentUser.value?.login ?? null })
    message.value = 'Residenza eliminata.'
    await loadData()

    scheduleUndo({
      label: `Residenza "${item.codice}" eliminata.`,
      undoAction: async () => {
        await restoreResidenza({
          roomId: deleted.id,
          existing: deleted,
          operatorId: currentUser.value?.login ?? null,
        })
        message.value = 'Eliminazione annullata: residenza ripristinata.'
        await loadData()
      },
    })
  } catch (error) {
    errorMessage.value = `Errore: ${error.message}`
  }
}

onMounted(() => void loadData())
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Residenze</h2>
      <button class="help-btn" @click="goToHelpSection('stanze')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Elenco residenze</strong></p>
      <p class="muted" style="margin-top:.35rem">
        Le residenze definiscono il contesto operativo dell'operatore. Capienza consigliata: 10 ospiti per residenza.
      </p>

      <CrudFilterBar
        v-model="filterQuery"
        label="Filtra residenze"
        placeholder="Cerca per nome o note"
        :visible-count="filteredResidenze.length"
        :total-count="residenze.length"
      />

      <div class="dataset-frame" style="margin-top:.75rem">
        <table class="conflict-table">
          <thead>
            <tr>
              <th>Residenza</th>
              <th>Capienza</th>
              <th>Posti disponibili</th>
              <th>Note</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredResidenze" :key="item.id">
              <td>{{ item.codice }}</td>
              <td>{{ formatCapienza(item) }}</td>
              <td>{{ item.postiDisponibili }}</td>
              <td>{{ item.note || '—' }}</td>
              <td>
                <button style="padding:.2rem .55rem;font-size:.8rem;margin-right:.35rem" @click="startEdit(item)">Modifica</button>
                <button style="padding:.2rem .55rem;font-size:.8rem;background:#d35f55" @click="handleDelete(item)">Elimina</button>
              </td>
            </tr>
            <tr v-if="filteredResidenze.length === 0 && !loading">
              <td colspan="5" class="muted">Nessuna residenza disponibile.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="loading" class="muted" style="margin-top:.55rem">Caricamento...</p>
      <p v-if="message" class="muted" style="margin-top:.55rem">{{ message }}</p>
      <p v-if="errorMessage" class="import-error" style="margin-top:.55rem">{{ errorMessage }}</p>
    </div>

    <div class="card">
      <details class="deep-panel" :open="isFormOpen" @toggle="isFormOpen = $event.target.open">
        <summary><strong>Gestione Residenze</strong></summary>
        <div style="margin-top:.75rem">
          <p><strong>{{ editId ? `Modifica residenza ${editId}` : 'Nuova residenza' }}</strong></p>
          <div class="import-form" style="margin-top:.65rem">
            <label>
              Nome residenza
              <input v-model="form.codice" type="text" placeholder="Es. Il Rifugio" />
            </label>
            <label>
              Max ospiti
              <input v-model="form.maxOspiti" type="number" min="1" step="1" placeholder="10" />
            </label>
            <label>
              Note
              <input v-model="form.note" type="text" placeholder="Note opzionali" />
            </label>
            <button :disabled="saving || !canSave" @click="handleSave">{{ saving ? 'Salvataggio...' : (editId ? 'Salva modifica' : 'Salva residenza') }}</button>
            <button type="button" :disabled="saving" @click="resetForm">Annulla</button>
          </div>
        </div>
      </details>
    </div>

    <div v-if="pendingUndo" class="undo-banner" role="status" aria-live="polite">
      <span>{{ pendingUndo.label }}</span>
      <button type="button" @click="executeUndo">Annulla eliminazione</button>
    </div>
  </div>
</template>
