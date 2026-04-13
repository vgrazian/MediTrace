<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, enqueue, getSetting } from '../db'
import { buildOperationalReport, buildOrderDraftText, operationalReportToCsv } from '../services/reporting'
import { confirmDeleteDrug, confirmDeleteBatch } from '../services/confirmations'
import { useAuth } from '../services/auth'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import CrudFilterBar from '../components/CrudFilterBar.vue'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()

const report = ref(null)
const reportLoading = ref(false)
const reportError = ref('')
const filterQuery = ref('')
const reportActionMessage = ref('')
const reportActionError = ref('')
const orderDraftText = ref('')
const isOrderDraftOpen = ref(false)
const actionMessage = ref('')
const actionError = ref('')
const savingBatch = ref(false)
const editingBatchId = ref('')
const creatingBatch = ref(false)
const savingDrug = ref(false)
const editingDrugId = ref('')
const isFormOpen = ref(false)
const stockBatches = ref([])
const drugs = ref([])
const drugForm = ref({
  principioAttivo: '',
  classeTerapeutica: '',
  scortaMinima: '',
})
const batchForm = ref({
  drugId: '',
  nomeCommerciale: '',
  dosaggio: '',
  quantitaAttuale: '',
  sogliaRiordino: '',
  scadenza: '',
})

const hasBatches = computed(() => stockBatches.value.length > 0)
const canEditBatchForm = computed(() => Boolean(editingBatchId.value || creatingBatch.value))
const canSaveBatch = computed(() => {
  if (!canEditBatchForm.value) return false
  return Boolean(batchForm.value.drugId && String(batchForm.value.nomeCommerciale || '').trim())
})

const filteredReportRows = computed(() => {
  const rows = report.value?.rows ?? []
  const q = filterQuery.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(row => {
    const haystack = [row.principioAttivo, row.warningPriority, row.warningReason].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

function drugLabel(drugId) {
  const drug = drugs.value.find(d => d.id === drugId)
  if (!drug) return 'Farmaco non disponibile'
  return drug.nomeFarmaco || drug.principioAttivo || 'Farmaco senza nome'
}

function batchLabel(batch) {
  return `${drugLabel(batch.drugId)} - ${batch.nomeCommerciale || 'Confezione'}`
}

function formatNumber(value) {
  return Number(value ?? 0).toFixed(2)
}

function formatCoverage(value) {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(2)} settimane`
}

function formatPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toFixed(1)}%`
}

function formatWeekLabel(weekKey) {
  return String(weekKey || '').replace('-W', ' W')
}

async function refreshReport() {
  reportLoading.value = true
  reportError.value = ''
  try {
    const [nextReport, rawDrugs, rawBatches] = await Promise.all([
      buildOperationalReport(),
      db.drugs.toArray(),
      db.stockBatches.toArray(),
    ])
    report.value = nextReport
    drugs.value = rawDrugs.filter(item => !item.deletedAt)
    stockBatches.value = rawBatches
      .filter(item => !item.deletedAt)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  } catch (err) {
    reportError.value = err.message
  } finally {
    reportLoading.value = false
  }
}

function startEditBatch(batch) {
  editingBatchId.value = batch.id
  creatingBatch.value = false
  isFormOpen.value = true
  batchForm.value = {
    drugId: batch.drugId || '',
    nomeCommerciale: batch.nomeCommerciale || '',
    dosaggio: batch.dosaggio || '',
    quantitaAttuale: String(batch.quantitaAttuale ?? ''),
    sogliaRiordino: String(batch.sogliaRiordino ?? ''),
    scadenza: batch.scadenza ? String(batch.scadenza).slice(0, 10) : '',
  }
  actionMessage.value = ''
  actionError.value = ''
}

function resetBatchForm() {
  editingBatchId.value = ''
  creatingBatch.value = false
  batchForm.value = {
    drugId: '',
    nomeCommerciale: '',
    dosaggio: '',
    quantitaAttuale: '',
    sogliaRiordino: '',
    scadenza: '',
  }
}

function openAddBatchForm() {
  resetBatchForm()
  creatingBatch.value = true
  isFormOpen.value = true
}

function startEditDrug(drugId) {
  const drug = drugs.value.find(d => d.id === drugId)
  if (!drug) return
  editingDrugId.value = drug.id
  isFormOpen.value = true
  drugForm.value = {
    principioAttivo: drug.principioAttivo || '',
    classeTerapeutica: drug.classeTerapeutica || '',
    scortaMinima: String(drug.scortaMinima ?? ''),
  }
  actionMessage.value = ''
  actionError.value = ''
}

function resetDrugForm() {
  editingDrugId.value = ''
  drugForm.value = {
    principioAttivo: '',
    classeTerapeutica: '',
    scortaMinima: '',
  }
}

async function saveDrugEdit() {
  if (!editingDrugId.value) return
  actionMessage.value = ''
  actionError.value = ''
  savingDrug.value = true

  try {
    const existing = await db.drugs.get(editingDrugId.value)
    if (!existing || existing.deletedAt) throw new Error('Farmaco non trovato')

    const now = new Date().toISOString()
    const updated = {
      ...existing,
      principioAttivo: drugForm.value.principioAttivo?.trim() || existing.principioAttivo,
      classeTerapeutica: drugForm.value.classeTerapeutica?.trim() || '',
      scortaMinima: Number(drugForm.value.scortaMinima || 0),
      updatedAt: now,
      syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')
    await db.transaction('rw', db.drugs, db.syncQueue, db.activityLog, async () => {
      await db.drugs.put(updated)
      await enqueue('drugs', updated.id, 'upsert')
      await db.activityLog.add({
        entityType: 'drugs',
        entityId: updated.id,
        action: 'drug_updated',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    actionMessage.value = 'Farmaco aggiornato.'
    resetDrugForm()
    await refreshReport()
  } catch (err) {
    actionError.value = err.message
  } finally {
    savingDrug.value = false
  }
}

async function deleteDrug(drugId) {
  const drug = drugs.value.find(d => d.id === drugId)
  const drugName = drug?.principioAttivo || drug?.nomeFarmaco || drugId
  
  const confirmed = await confirmDeleteDrug(drugName)
  if (!confirmed) return
  
  actionMessage.value = ''
  actionError.value = ''

  try {
    const existing = await db.drugs.get(drugId)
    if (!existing || existing.deletedAt) throw new Error('Farmaco non trovato')

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    await db.transaction('rw', db.drugs, db.syncQueue, db.activityLog, async () => {
      await db.drugs.put({
        ...existing,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
      await enqueue('drugs', drugId, 'upsert')
      await db.activityLog.add({
        entityType: 'drugs',
        entityId: drugId,
        action: 'drug_deleted',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    if (editingDrugId.value === drugId) resetDrugForm()
    actionMessage.value = 'Farmaco eliminato.'
    await refreshReport()
  } catch (err) {
    actionError.value = err.message
  }
}

async function saveBatch() {
  if (!canSaveBatch.value) return
  actionMessage.value = ''
  actionError.value = ''
  savingBatch.value = true

  try {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    if (editingBatchId.value) {
      const existing = await db.stockBatches.get(editingBatchId.value)
      if (!existing || existing.deletedAt) throw new Error('Confezione non trovata')

      const updated = {
        ...existing,
        drugId: batchForm.value.drugId || existing.drugId,
        nomeCommerciale: batchForm.value.nomeCommerciale?.trim() || existing.nomeCommerciale,
        dosaggio: batchForm.value.dosaggio?.trim() || '',
        quantitaAttuale: Number(batchForm.value.quantitaAttuale || 0),
        sogliaRiordino: Number(batchForm.value.sogliaRiordino || 0),
        scadenza: batchForm.value.scadenza || null,
        updatedAt: now,
        syncStatus: 'pending',
      }

      await db.transaction('rw', db.stockBatches, db.syncQueue, db.activityLog, async () => {
        await db.stockBatches.put(updated)
        await enqueue('stockBatches', updated.id, 'upsert')
        await db.activityLog.add({
          entityType: 'stockBatches',
          entityId: updated.id,
          action: 'stock_batch_updated',
          deviceId,
          operatorId: currentUser.value?.login ?? null,
          ts: now,
        })
      })

      actionMessage.value = 'Confezione aggiornata.'
    } else {
      const batchId = crypto.randomUUID()
      const created = {
        id: batchId,
        drugId: batchForm.value.drugId,
        nomeCommerciale: batchForm.value.nomeCommerciale.trim(),
        dosaggio: batchForm.value.dosaggio?.trim() || '',
        quantitaAttuale: Number(batchForm.value.quantitaAttuale || 0),
        sogliaRiordino: Number(batchForm.value.sogliaRiordino || 0),
        scadenza: batchForm.value.scadenza || null,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
      }

      await db.transaction('rw', db.stockBatches, db.syncQueue, db.activityLog, async () => {
        await db.stockBatches.put(created)
        await enqueue('stockBatches', created.id, 'upsert')
        await db.activityLog.add({
          entityType: 'stockBatches',
          entityId: created.id,
          action: 'stock_batch_created',
          deviceId,
          operatorId: currentUser.value?.login ?? null,
          ts: now,
        })
      })

      actionMessage.value = 'Confezione aggiunta.'
    }

    resetBatchForm()
    await refreshReport()
  } catch (err) {
    actionError.value = err.message
  } finally {
    savingBatch.value = false
  }
}

async function deleteBatch(batchId) {
  const batch = stockBatches.value.find(b => b.id === batchId)
  const batchName = batchLabel(batch)
  
  const confirmed = await confirmDeleteBatch(batchName)
  if (!confirmed) return
  
  actionMessage.value = ''
  actionError.value = ''

  try {
    const existing = await db.stockBatches.get(batchId)
    if (!existing || existing.deletedAt) throw new Error('Confezione non trovata')

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')
    await db.transaction('rw', db.stockBatches, db.syncQueue, db.activityLog, async () => {
      await db.stockBatches.put({
        ...existing,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
      await enqueue('stockBatches', batchId, 'upsert')
      await db.activityLog.add({
        entityType: 'stockBatches',
        entityId: batchId,
        action: 'stock_batch_deleted',
        deviceId,
        operatorId: currentUser.value?.login ?? null,
        ts: now,
      })
    })

    if (editingBatchId.value === batchId) resetBatchForm()
    actionMessage.value = 'Confezione eliminata.'
    await refreshReport()
  } catch (err) {
    actionError.value = err.message
  }
}

function exportReportCsv() {
  if (!report.value) return

  const csv = operationalReportToCsv(report.value)
  const date = new Date().toISOString().slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  anchor.download = `meditrace-report-scorte-${date}.csv`
  anchor.click()
}

function copyTextFallback(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
  return copied
}

async function prepareOrderDraft() {
  reportActionMessage.value = ''
  reportActionError.value = ''

  if (!report.value) {
    reportActionError.value = 'Report non disponibile.'
    return
  }

  const draftText = buildOrderDraftText(report.value)
  if (!draftText) {
    isOrderDraftOpen.value = false
    orderDraftText.value = ''
    reportActionError.value = 'Nessun farmaco con priorita\' critica/alta/media da includere nell\'ordine.'
    return
  }

  orderDraftText.value = draftText
  isOrderDraftOpen.value = true
  reportActionMessage.value = 'Bozza ordine pronta. Puoi modificarla e poi copiarla.'
}

async function copyOrderDraft() {
  reportActionMessage.value = ''
  reportActionError.value = ''

  const text = String(orderDraftText.value || '').trim()
  if (!text) {
    reportActionError.value = 'Il testo ordine e\' vuoto.'
    return
  }

  let copied = false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      copied = true
    }
  } catch {
    copied = false
  }

  if (!copied) {
    copied = copyTextFallback(text)
  }

  if (copied) {
    reportActionMessage.value = 'Testo ordine copiato negli appunti.'
    return
  }

  reportActionError.value = 'Clipboard non disponibile su questo dispositivo/browser.'
}

function cancelOrderDraft() {
  isOrderDraftOpen.value = false
  orderDraftText.value = ''
  reportActionMessage.value = 'Bozza ordine annullata.'
  reportActionError.value = ''
}

onMounted(() => {
  void refreshReport()
})
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Scorte</h2>
      <button class="help-btn" @click="goToHelpSection('scorte')">Aiuto</button>
    </div>

    <div class="card">
      <p><strong>Report operativo (consumi/scorte)</strong></p>
      <p class="muted" style="margin-top:.25rem">
        KPI avanzati: scorte, consumo trend per farmaco, vista per ospite/paziente, export CSV multi-sezione.
      </p>

      <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button :disabled="reportLoading" @click="refreshReport">
          {{ reportLoading ? 'Aggiornamento...' : 'Aggiorna report' }}
        </button>
        <button :disabled="!report" @click="exportReportCsv">
          Esporta CSV report
        </button>
        <button :disabled="!report" @click="prepareOrderDraft">
          Prepara testo ordine farmaci
        </button>
      </div>

      <p v-if="reportError" class="import-error" style="margin-top:.5rem">Errore report: {{ reportError }}</p>
      <p v-if="reportActionMessage" class="muted" style="margin-top:.5rem">{{ reportActionMessage }}</p>
      <p v-if="reportActionError" class="import-error" style="margin-top:.5rem">{{ reportActionError }}</p>

      <div v-if="isOrderDraftOpen" class="dataset-frame" style="margin-top:.75rem;padding:.75rem;background:#fff8db;border:1px solid #f3e3a1">
        <p><strong>Bozza testo ordine farmaci</strong></p>
        <p class="muted" style="margin-top:.25rem">Puoi modificare il testo prima di copiarlo negli appunti.</p>
        <textarea
          v-model="orderDraftText"
          rows="10"
          style="width:100%;margin-top:.6rem"
          aria-label="Bozza ordine farmaci"
        />
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.65rem">
          <button type="button" :disabled="!String(orderDraftText || '').trim()" @click="copyOrderDraft">
            Copia
          </button>
          <button type="button" @click="cancelOrderDraft">
            Annulla
          </button>
        </div>
      </div>
    </div>

    <div v-if="report" class="card">
      <p><strong>Riepilogo segnalazioni</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Farmaci monitorati: {{ report.summary.totalDrugs }}<br />
        Critica: {{ report.summary.critical }} · Alta: {{ report.summary.high }} · Media: {{ report.summary.medium }} · OK: {{ report.summary.ok }}<br />
        Generato: {{ report.generatedAt }}
      </p>

      <CrudFilterBar
        v-model="filterQuery"
        label="Filtro rapido scorte"
        placeholder="Cerca per farmaco, priorita o motivo"
        :visible-count="filteredReportRows.length"
        :total-count="report.rows.length"
      />

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table">
        <thead>
          <tr>
            <th>Farmaco</th>
            <th>Scorta attuale</th>
            <th>Consumo sett.</th>
            <th>Copertura</th>
            <th>Soglia</th>
            <th>Priorita'</th>
            <th>Motivo</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredReportRows" :key="row.drugId">
            <td>{{ row.principioAttivo }}</td>
            <td>{{ formatNumber(row.stockCurrent) }}</td>
            <td>{{ formatNumber(row.weeklyConsumption) }}</td>
            <td>{{ formatCoverage(row.coverageWeeks) }}</td>
            <td>{{ formatNumber(row.reorderThreshold) }}</td>
            <td>{{ row.warningPriority }}</td>
            <td>{{ row.warningReason }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditDrug(row.drugId)">Modifica</button>
              <button style="background:#d35f55" @click="deleteDrug(row.drugId)">Elimina</button>
            </td>
          </tr>
          <tr v-if="filteredReportRows.length === 0">
            <td colspan="8" class="muted">Nessun farmaco disponibile nel dataset locale.</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div v-if="report" class="card">
      <p><strong>Trend settimanale consumo per farmaco</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Consumi scaricati sulle ultime settimane (movimenti di tipo consumo/scarico/somministrazione).
      </p>

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table">
        <thead>
          <tr>
            <th>Farmaco</th>
            <th v-for="weekKey in report.trendWeeks" :key="`head-${weekKey}`">{{ formatWeekLabel(weekKey) }}</th>
            <th>Totale periodo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.trendRows" :key="`trend-${row.drugId}`">
            <td>{{ row.principioAttivo }}</td>
            <td v-for="weekKey in report.trendWeeks" :key="`${row.drugId}-${weekKey}`">
              {{ formatNumber(row.weeklyConsumptionByWeek[weekKey]) }}
            </td>
            <td>{{ formatNumber(row.totalPeriodConsumption) }}</td>
          </tr>
          <tr v-if="(report.trendRows || []).length === 0">
            <td :colspan="(report.trendWeeks || []).length + 2" class="muted">Nessun trend disponibile nel dataset locale.</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div v-if="report" class="card">
      <p><strong>Aderenza terapie (ultimi {{ report.adherence?.windowDays || 7 }} giorni)</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Somministrazioni pianificate: {{ report.adherence?.totalScheduled || 0 }}<br />
        Eseguite: {{ report.adherence?.executed || 0 }} · Saltate: {{ report.adherence?.skipped || 0 }} · Posticipate: {{ report.adherence?.postponed || 0 }} · Pending: {{ report.adherence?.pending || 0 }}<br />
        Aderenza complessiva: {{ formatPercent(report.adherence?.adherenceRate) }}
      </p>

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table">
        <thead>
          <tr>
            <th>Ospite</th>
            <th>Pianificate</th>
            <th>Eseguite</th>
            <th>Saltate</th>
            <th>Posticipate</th>
            <th>Pending</th>
            <th>Aderenza</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.adherenceHostRows" :key="`adh-${row.hostId}`">
            <td>{{ row.hostLabel }}</td>
            <td>{{ row.totalScheduled }}</td>
            <td>{{ row.executed }}</td>
            <td>{{ row.skipped }}</td>
            <td>{{ row.postponed }}</td>
            <td>{{ row.pending }}</td>
            <td>{{ formatPercent(row.adherenceRate) }}</td>
          </tr>
          <tr v-if="(report.adherenceHostRows || []).length === 0">
            <td colspan="7" class="muted">Nessun dato aderenza disponibile nella finestra analizzata.</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div class="card">
      <p><strong>Confezioni monitorate (Gestione completa)</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Modifica o rimuovi confezioni direttamente da Scorte.
      </p>

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
        <button @click="openAddBatchForm">Aggiungi</button>
      </div>

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table">
        <thead>
          <tr>
            <th>Confezione</th>
            <th>Quantita'</th>
            <th>Soglia</th>
            <th>Scadenza</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="batch in stockBatches" :key="batch.id">
            <td>{{ batchLabel(batch) }}</td>
            <td>{{ formatNumber(batch.quantitaAttuale) }}</td>
            <td>{{ formatNumber(batch.sogliaRiordino) }}</td>
            <td>{{ batch.scadenza || '—' }}</td>
            <td>
              <button style="margin-right:.35rem" @click="startEditBatch(batch)">Modifica</button>
              <button style="background:#d35f55" @click="deleteBatch(batch.id)">Elimina</button>
            </td>
          </tr>
          <tr v-if="!hasBatches && !reportLoading">
            <td colspan="5" class="muted">Nessuna confezione attiva disponibile.</td>
          </tr>
        </tbody>
      </table>
      </div>

      <details class="deep-panel add-panel" style="margin-top:.75rem" :open="isFormOpen" @toggle="isFormOpen = $event.target.open">
        <summary><strong>Gestione Scorte</strong></summary>
        <div class="panel-breadcrumb" style="margin-top:.75rem">
          <button type="button" class="panel-breadcrumb-link" @click="isFormOpen = false">Scorte</button>
          <span class="panel-breadcrumb-current">/</span>
          <span class="panel-breadcrumb-current">Gestione</span>
          <button type="button" class="panel-close-btn" @click="isFormOpen = false">Chiudi</button>
        </div>
        <div class="import-form" style="margin-top:.65rem">
          <label>
            Principio attivo
            <input v-model="drugForm.principioAttivo" type="text" :disabled="!editingDrugId || savingDrug" />
          </label>
          <label>
            Classe terapeutica
            <input v-model="drugForm.classeTerapeutica" type="text" :disabled="!editingDrugId || savingDrug" />
          </label>
          <label>
            Scorta minima
            <input v-model="drugForm.scortaMinima" type="number" min="0" step="1" :disabled="!editingDrugId || savingDrug" />
          </label>

          <button :disabled="!editingDrugId || savingDrug" @click="saveDrugEdit">
            {{ savingDrug ? 'Salvataggio...' : 'Salva modifica farmaco' }}
          </button>
          <button type="button" :disabled="savingDrug" @click="resetDrugForm">Annulla farmaco</button>
        </div>

        <div class="import-form" style="margin-top:.65rem">
          <label>
            Farmaco
            <select v-model="batchForm.drugId" :disabled="!canEditBatchForm || savingBatch">
              <option value="">Seleziona farmaco</option>
              <option v-for="drug in drugs" :key="drug.id" :value="drug.id">{{ drugLabel(drug.id) }}</option>
            </select>
          </label>
          <label>
            Nome commerciale
            <input v-model="batchForm.nomeCommerciale" type="text" :disabled="!canEditBatchForm || savingBatch" />
          </label>
          <label>
            Dosaggio
            <input v-model="batchForm.dosaggio" type="text" :disabled="!canEditBatchForm || savingBatch" />
          </label>
          <label>
            Quantita' attuale
            <input v-model="batchForm.quantitaAttuale" type="number" min="0" step="1" :disabled="!canEditBatchForm || savingBatch" />
          </label>
          <label>
            Soglia riordino
            <input v-model="batchForm.sogliaRiordino" type="number" min="0" step="1" :disabled="!canEditBatchForm || savingBatch" />
          </label>
          <label>
            Scadenza
            <input v-model="batchForm.scadenza" type="date" :disabled="!canEditBatchForm || savingBatch" />
          </label>

          <button :disabled="!canSaveBatch || savingBatch" @click="saveBatch">
            {{ savingBatch ? 'Salvataggio...' : (editingBatchId ? 'Salva modifica' : 'Aggiungi confezione') }}
          </button>
          <button type="button" :disabled="savingBatch" @click="resetBatchForm">Annulla</button>
        </div>
      </details>

      <p v-if="actionMessage" class="muted" style="margin-top:.5rem">{{ actionMessage }}</p>
      <p v-if="actionError" class="import-error" style="margin-top:.5rem">Errore azione: {{ actionError }}</p>
    </div>
  </div>
</template>
