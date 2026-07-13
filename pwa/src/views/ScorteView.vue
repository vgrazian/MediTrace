<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { db, enqueue, getSetting } from '../db'
import { dataReady } from '../services/seedData'
import { buildOperationalReport, buildOrderDraftText, operationalReportToCsv } from '../services/reporting'
import { confirmDeleteDrug, confirmDeleteBatch } from '../services/confirmations'
import { openConfirmDialog } from '../services/confirmDialog'
import { useAuth } from '../services/auth'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { useKeyboardShortcuts, shortcutHint } from '../composables/useKeyboardShortcuts'
import { useUndoDelete } from '../composables/useUndoDelete'
import UndoDeleteBanner from '../components/UndoDeleteBanner.vue'
import CrudFilterBar from '../components/CrudFilterBar.vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const { currentUser } = useAuth()
const { goToHelpSection } = useHelpNavigation()
const { pendingUndo, scheduleUndo, executeUndo, clearUndo } = useUndoDelete(10_000)

// Keyboard shortcuts: / per ricerca, n per aggiungere confezione
useKeyboardShortcuts({
  searchPlaceholder: 'Cerca',
  onNew: () => openAddBatchForm(),
  isFormOpen: computed(() => editingBatchId.value || creatingBatch.value),
})

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

const lowStockDrugs = computed(() => {
  const low = []
  stockBatches.value.forEach(batch => {
    if (batch.quantitaAttuale < batch.sogliaRiordino && !low.find(b => b.drugId === batch.drugId)) {
      const drug = drugs.value.find(d => d.id === batch.drugId)
      low.push({
        drugId: batch.drugId,
        drugName: drug?.nomeFarmaco || drug?.principioAttivo || batch.drugId,
        currentStock: batch.quantitaAttuale,
        threshold: batch.sogliaRiordino,
        urgency: batch.quantitaAttuale > 0 ? 'alta' : 'critica',
      })
    }
  })
  return low.sort((a, b) => a.currentStock - b.currentStock)
})

function drugLabel(drugId) {
  const drug = drugs.value.find(d => d.id === drugId)
  if (!drug) return 'Farmaco non disponibile'
  return drug.nomeFarmaco || drug.principioAttivo || 'Farmaco senza nome'
}

function batchLabel(batch) {
  return `${drugLabel(batch.drugId)} - ${batch.nomeCommerciale || 'Confezione'}`
}

// Existing batch names for autocomplete
const existingBatchNames = computed(() => {
  const names = new Set()
  for (const b of stockBatches.value) {
    const name = (b.nomeCommerciale || '').trim()
    if (name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }))
})

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

// ── Consumption chart ─────────────────────────────────────────────────────
const consumoMensile = ref([])
const consumoPerFarmaco = ref([])
const consumoPerClasse = ref([])
const coperturaGiorni = ref([])
const chartMax = computed(() => {
  const max = Math.max(1, ...consumoMensile.value.map(m => m.total))
  return Math.ceil(max / 5) * 5 || 10
})

async function loadConsumoMensile() {
  try {
    await dataReady
    const movements = await db.movements.toArray()
    const drugs = await db.drugs.toArray()
    const stockBatches = await db.stockBatches.toArray()
    const drugsById = new Map(drugs.filter(d => !d.deletedAt).map(d => [d.id, d]))
    const now = new Date()
    const months = []
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
      months.push({ key, label, total: 0 })
    }

    // Per-drug consumption tracking (last 6 months)
    const drugConsumption = new Map()
    for (const m of movements) {
      if (m.deletedAt || m.tipoMovimento !== 'SCARICO') continue
      const date = new Date(m.dataMovimento || m.updatedAt || m.createdAt || 0)
      if (Number.isNaN(date.getTime())) continue
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const month = months.find(mo => mo.key === key)
      if (month) month.total += Number(m.quantita || 1)

      // Per-drug tracking
      const drugId = m.drugId
      if (drugId) {
        const existing = drugConsumption.get(drugId) || { drugId, total: 0, months: {} }
        existing.total += Number(m.quantita || 1)
        existing.months[key] = (existing.months[key] || 0) + Number(m.quantita || 1)
        drugConsumption.set(drugId, existing)
      }
    }
    consumoMensile.value = months

    // Build per-drug consumption list with drug names
    const drugList = []
    for (const [drugId, data] of drugConsumption) {
      const drug = drugsById.get(drugId)
      const nome = drug ? (drug.nomeFarmaco || drug.principioAttivo || drugId) : drugId
      drugList.push({ drugId, nome, total: data.total, months: data.months })
    }
    drugList.sort((a, b) => b.total - a.total)
    consumoPerFarmaco.value = drugList.slice(0, 10)

    // Coverage days: for each drug, estimate days remaining
    const trentaGiorniFa = new Date(now)
    trentaGiorniFa.setDate(trentaGiorniFa.getDate() - 30)
    const copertura = []
    for (const [drugId, data] of drugConsumption) {
      const drug = drugsById.get(drugId)
      if (!drug) continue
      // Total stock across all batches for this drug
      const batches = stockBatches.filter(b => b.drugId === drugId && !b.deletedAt)
      const stockAttuale = batches.reduce((sum, b) => sum + (Number(b.quantitaAttuale) || 0), 0)
      if (stockAttuale <= 0) continue
      // Average daily consumption over last 30 days
      const consumo30gg = movements
        .filter(m => m.drugId === drugId && !m.deletedAt && m.tipoMovimento === 'SCARICO')
        .filter(m => {
          const d = new Date(m.dataMovimento || m.updatedAt || 0)
          return !Number.isNaN(d.getTime()) && d >= trentaGiorniFa
        })
        .reduce((sum, m) => sum + (Number(m.quantita) || 0), 0)
      const mediaGiornaliera = consumo30gg / 30
      const giorniRimanenti = mediaGiornaliera > 0 ? Math.round(stockAttuale / mediaGiornaliera) : 999
      if (giorniRimanenti <= 90) {
        copertura.push({
          drugId,
          nome: drug.nomeFarmaco || drug.principioAttivo || drugId,
          stockAttuale,
          mediaGiornaliera: Math.round(mediaGiornaliera * 10) / 10,
          giorniRimanenti,
          urgency: giorniRimanenti <= 7 ? 'critica' : giorniRimanenti <= 30 ? 'alta' : 'media',
        })
      }
    }
    copertura.sort((a, b) => a.giorniRimanenti - b.giorniRimanenti)
    coperturaGiorni.value = copertura

    // Per-class consumption (therapeutic class)
    const classMap = new Map()
    for (const [drugId, data] of drugConsumption) {
      const drug = drugsById.get(drugId)
      const classe = (drug?.classeTerapeutica || 'Altro').trim()
      const existing = classMap.get(classe) || { classe, total: 0 }
      existing.total += data.total
      classMap.set(classe, existing)
    }
    consumoPerClasse.value = [...classMap.values()].sort((a, b) => b.total - a.total)
  } catch { /* ignore */ }
}

// ── Pie chart helpers ─────────────────────────────────────────────────────
const pieColors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#ca8a04', '#be185d']
const pieTotal = computed(() => consumoPerClasse.value.reduce((s, c) => s + c.total, 0))

function pieCommand(slice, index, total) {
  let cumulative = 0
  for (let i = 0; i < index; i++) {
    cumulative += (consumoPerClasse.value[i].total / total) * 360
  }
  const startAngle = cumulative
  const sliceAngle = (slice.total / total) * 360
  const endAngle = startAngle + sliceAngle

  const toRad = deg => (deg - 90) * Math.PI / 180
  const x1 = 50 + 38 * Math.cos(toRad(startAngle))
  const y1 = 50 + 38 * Math.sin(toRad(startAngle))
  const x2 = 50 + 38 * Math.cos(toRad(endAngle))
  const y2 = 50 + 38 * Math.sin(toRad(endAngle))
  const largeArc = sliceAngle > 180 ? 1 : 0

  return `M 50 50 L ${x1} ${y1} A 38 38 0 ${largeArc} 1 ${x2} ${y2} Z`
}

// ── Expired / expiring batches ────────────────────────────────────────────
const EXPIRY_WARN_DAYS = 60
const expiredBatches = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const warnDate = new Date(now)
  warnDate.setDate(warnDate.getDate() + EXPIRY_WARN_DAYS)

  return stockBatches.value
    .filter(b => {
      if (!b.scadenza) return false
      const scad = new Date(b.scadenza)
      return !Number.isNaN(scad.getTime()) && scad <= warnDate
    })
    .map(b => {
      const scad = new Date(b.scadenza)
      const giorni = Math.ceil((scad.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        ...b,
        giorniScadenza: giorni,
        stato: giorni < 0 ? 'scaduta' : giorni <= 30 ? 'in scadenza' : 'prossima',
      }
    })
    .sort((a, b) => a.giorniScadenza - b.giorniScadenza)
})

async function deleteExpiredBatch(batchId) {
  const batch = stockBatches.value.find(b => b.id === batchId)
  if (!batch) return
  const name = batch.nomeCommerciale || batchId
  const confirmed = await openConfirmDialog({
    title: 'Elimina confezione',
    message: `Eliminare definitivamente la confezione "${name}"?`,
    confirmText: 'Elimina',
    cancelText: 'Annulla',
    tone: 'danger',
  })
  if (!confirmed) return
  try {
    const now = new Date().toISOString()
    await db.stockBatches.put({ ...batch, deletedAt: now, updatedAt: now, syncStatus: 'pending' })
    await enqueue('stockBatches', batchId, 'upsert')
    actionMessage.value = `Confezione "${name}" eliminata.`
    await refreshReport()
    await loadConsumoMensile()
  } catch (err) {
    actionError.value = `Errore eliminazione: ${err.message}`
  }
}

function formatGiorniScadenza(giorni) {
  if (giorni < 0) return `Scaduta da ${Math.abs(giorni)} gg`
  if (giorni === 0) return 'Scade oggi'
  return `Tra ${giorni} gg`
}

async function refreshReport() {
  reportLoading.value = true
  reportError.value = ''
  try {
    await dataReady
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
  isFormOpen.value = false
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
  // Ensure all batch form fields are enabled and cleared
  batchForm.value = {
    drugId: '',
    nomeCommerciale: '',
    dosaggio: '',
    quantitaAttuale: '',
    sogliaRiordino: '',
    scadenza: '',
  }
  editingBatchId.value = ''
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
  isFormOpen.value = false
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

    scheduleUndo({
      label: `Farmaco "${drugName}" eliminato.`,
      undoAction: async () => {
        await db.drugs.update(drugId, { deletedAt: null, updatedAt: new Date().toISOString(), syncStatus: 'pending' })
        await enqueue('drugs', drugId, 'upsert')
        actionMessage.value = 'Eliminazione annullata: farmaco ripristinato.'
        await refreshReport()
      },
    })

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

    scheduleUndo({
      label: `Confezione "${batchName}" eliminata.`,
      undoAction: async () => {
        await db.stockBatches.update(batchId, { deletedAt: null, updatedAt: new Date().toISOString(), syncStatus: 'pending' })
        await enqueue('stockBatches', batchId, 'upsert')
        actionMessage.value = 'Eliminazione annullata: confezione ripristinata.'
        await refreshReport()
      },
    })

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

function exportReportPdf() {
  if (!report.value) return

  const date = new Date().toISOString().slice(0, 10)
  const timestamp = new Date().toLocaleString('it-IT', { hour12: false })

  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

    doc.setFontSize(16)
    doc.text('MediTrace - Report Scorte Farmaci', 40, 40)
    doc.setFontSize(10)
    doc.text(`Generato: ${timestamp}`, 40, 58)
    doc.text(
      `Monitorati: ${report.value.summary.totalDrugs} | Critica: ${report.value.summary.critical} | Alta: ${report.value.summary.high} | Media: ${report.value.summary.medium} | OK: ${report.value.summary.ok}`,
      40,
      74,
    )

    const body = (report.value.rows || []).map((row) => [
      row.principioAttivo,
      formatNumber(row.stockCurrent),
      formatNumber(row.weeklyConsumption),
      formatCoverage(row.coverageWeeks),
      formatNumber(row.reorderThreshold),
      row.warningPriority,
      row.warningReason,
    ])

    autoTable(doc, {
      startY: 90,
      head: [[
        'Farmaco',
        'Scorta attuale',
        'Consumo sett.',
        'Copertura',
        'Soglia',
        'Priorita',
        'Motivo',
      ]],
      body,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [32, 67, 133] },
    })

    doc.save(`meditrace-report-scorte-${date}.pdf`)
  } catch (err) {
    reportActionError.value = `Errore esportazione PDF: ${err.message}`
  }
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

  const lowStockByDrug = new Map(
    lowStockDrugs.value.map((item) => [
      item.drugId,
      {
        warningReason: `sotto soglia riordino confezione (${item.currentStock}/${item.threshold})`,
        warningPriority: item.urgency === 'critica' ? 'critica' : 'media',
      },
    ]),
  )

  const orderRows = (report.value.rows || []).map((row) => {
    const lowStock = lowStockByDrug.get(row.drugId)
    if (!lowStock) return row
    if (row.warningPriority !== 'ok') return row
    return {
      ...row,
      warningPriority: lowStock.warningPriority,
      warningReason: lowStock.warningReason,
      forceInOrder: true,
    }
  })

  const draftText = buildOrderDraftText(orderRows)
  if (!draftText) {
    isOrderDraftOpen.value = false
    orderDraftText.value = ''
    reportActionError.value = 'Nessun farmaco con priorita\' critica/alta/media o in esaurimento da includere nell\'ordine.'
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
  void loadConsumoMensile()
})

onUnmounted(() => { window.removeEventListener('medi-trace:data-changed', handleDataChanged) })
function handleDataChanged() { void refreshReport(); void loadConsumoMensile() }
window.addEventListener('medi-trace:data-changed', handleDataChanged)
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Scorte</h2>
      <button class="help-btn" @click="goToHelpSection('scorte')">Aiuto</button>
    </div>

    <div v-if="lowStockDrugs.length > 0" class="card" style="border-left: 3px solid #ff6b6b">
      <p><strong>⚠️ Farmaci in esaurimento</strong></p>
      <p class="muted" style="margin-top:.25rem">
        {{ lowStockDrugs.length }} {{ lowStockDrugs.length === 1 ? 'farmaco' : 'farmaci' }} con scorta sotto soglia riordino
      </p>
      <div class="dataset-frame" style="margin-top:.75rem;max-height:15rem;overflow:auto">
        <table class="conflict-table" style="font-size:0.9em">
          <thead>
            <tr>
              <th>Farmaco</th>
              <th>Scorta Attuale</th>
              <th>Soglia</th>
              <th>Urgenza</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="drug in lowStockDrugs" :key="drug.drugId" :style="{ background: drug.urgency === 'critica' ? '#fee2e2' : '#fff3cd' }">
              <td>{{ drug.drugName }}</td>
              <td style="text-align:center">{{ drug.currentStock }}</td>
              <td style="text-align:center">{{ drug.threshold }}</td>
              <td style="text-align:center">
                <span :style="{ color: drug.urgency === 'critica' ? '#991b1b' : '#856404', fontWeight: 'bold' }">
                  {{ drug.urgency === 'critica' ? 'CRITICA' : 'Alta' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <p><strong>Report operativo (consumi/scorte)</strong></p>
      <p class="muted" style="margin-top:.25rem">
        KPI avanzati: scorte, consumo trend per farmaco, vista per ospite/paziente, export CSV multi-sezione.
      </p>

      <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <button :disabled="reportLoading" @click="refreshReport">
          Aggiorna report
        </button>
        <span v-if="reportLoading" class="loading-skeleton-row" style="width:8rem;display:inline-block;vertical-align:middle" role="status" aria-label="Aggiornamento in corso"></span>
        <button :disabled="!report" @click="exportReportCsv">
          Esporta report CSV
        </button>
        <button :disabled="!report" @click="exportReportPdf">
          Esporta report PDF
        </button>
        <button :disabled="!report" @click="prepareOrderDraft">
          Prepara testo ordine farmaci
        </button>
      </div>

      <p v-if="reportError" class="import-error" role="alert">Errore report: {{ reportError }}</p>
      <p v-if="reportActionMessage" class="muted" style="margin-top:.5rem">{{ reportActionMessage }}</p>
      <p v-if="reportActionError" class="import-error" role="alert">{{ reportActionError }}</p>

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
              <button @click="startEditDrug(row.drugId)">Modifica</button>
              <button class="btn-danger" @click="deleteDrug(row.drugId)">Elimina</button>
            </td>
          </tr>
          <tr v-if="filteredReportRows.length === 0">
            <td colspan="8" class="muted">
              Nessun farmaco nel dataset. Importa dati CSV o aggiungi farmaci manualmente dalla sezione Farmaci.
            </td>
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
        Eseguite: {{ report.adherence?.executed || 0 }} · Saltate: {{ report.adherence?.skipped || 0 }} · Posticipate: {{ report.adherence?.postponed || 0 }} · Da eseguire: {{ report.adherence?.pending || 0 }}<br />
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
            <th>Da eseguire</th>
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

    <!-- ── Andamento consumi mensili ── -->
    <div v-if="consumoMensile.length > 0" class="card">
      <p><strong>📊 Andamento consumi (scarichi per mese)</strong></p>
      <p class="muted" style="margin-top:.25rem">Conteggio movimenti di scarico negli ultimi 6 mesi.</p>
      <div style="margin-top:.75rem;overflow-x:auto">
        <svg :viewBox="'0 0 ' + (consumoMensile.length * 70 + 50) + ' 180'" width="100%" height="180" style="max-width:100%">
          <text x="5" y="15" font-size="10" fill="#94a3b8">{{ chartMax }}</text>
          <text x="5" y="95" font-size="10" fill="#94a3b8">{{ Math.round(chartMax / 2) }}</text>
          <text x="5" y="170" font-size="10" fill="#94a3b8">0</text>
          <line x1="30" :y1="10" :x2="consumoMensile.length * 70 + 40" y2="10" stroke="#e2e8f0" stroke-width="1"/>
          <line x1="30" :y1="90" :x2="consumoMensile.length * 70 + 40" y2="90" stroke="#e2e8f0" stroke-width="1"/>
          <g v-for="(m, i) in consumoMensile" :key="m.key">
            <rect :x="i * 70 + 40" :y="170 - (m.total / chartMax) * 160" width="50" :height="(m.total / chartMax) * 160" rx="3" fill="#2563eb" opacity="0.6"/>
            <text :x="i * 70 + 65" :y="168 - (m.total / chartMax) * 160" text-anchor="middle" font-size="10" :fill="m.total > chartMax * 0.15 ? '#fff' : '#1e293b'">{{ m.total }}</text>
            <text :x="i * 70 + 65" y="178" text-anchor="middle" font-size="9" fill="#64748b">{{ m.label }}</text>
          </g>
          <!-- Line overlay -->
          <polyline
            :points="consumoMensile.map((m, i) => `${i * 70 + 65},${170 - (m.total / chartMax) * 160}`).join(' ')"
            fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"
          />
          <circle v-for="(m, i) in consumoMensile" :key="'d'+m.key"
            :cx="i * 70 + 65" :cy="170 - (m.total / chartMax) * 160" r="3.5"
            fill="#059669" stroke="#fff" stroke-width="1"
          />
        </svg>
      </div>
    </div>

    <!-- ── Consumo per farmaco ── -->
    <div v-if="consumoPerFarmaco.length > 0" class="card">
      <p><strong>💊 Consumo per farmaco (ultimi 6 mesi)</strong></p>
      <p class="muted" style="margin-top:.25rem">Top 10 farmaci per volume di scarichi.</p>
      <div class="dataset-frame" style="margin-top:.75rem;max-height:18rem;overflow:auto">
        <table class="conflict-table">
          <thead>
            <tr>
              <th>Farmaco</th>
              <th>Totale unità</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in consumoPerFarmaco" :key="d.drugId">
              <td>{{ d.nome }}</td>
              <td style="text-align:center">{{ d.total }}</td>
              <td style="text-align:center">
                <svg width="120" height="20">
                  <rect v-for="(m, i) in consumoMensile" :key="m.key"
                    :x="i * 20" :y="20 - Math.max(1, (d.months[m.key] || 0) / Math.max(1, d.total) * 18)"
                    :width="16" :height="Math.max(1, (d.months[m.key] || 0) / Math.max(1, d.total) * 18)"
                    rx="2" fill="#2563eb" opacity="0.6"
                  />
                </svg>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Consumo per classe terapeutica ── -->
    <div v-if="consumoPerClasse.length > 0" class="card">
      <p><strong>🥧 Consumo per classe terapeutica (6 mesi)</strong></p>
      <p class="muted" style="margin-top:.25rem">Distribuzione scarichi per categoria di farmaco.</p>
      <div style="margin-top:.75rem;display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center">
        <svg viewBox="0 0 100 100" width="140" height="140">
          <path v-for="(c, i) in consumoPerClasse" :key="c.classe"
            :d="pieCommand(c, i, pieTotal)"
            :fill="pieColors[i % pieColors.length]"
            stroke="#fff" stroke-width="0.5"
          />
        </svg>
        <div style="flex:1;min-width:12rem">
          <div v-for="(c, i) in consumoPerClasse" :key="c.classe" style="display:flex;align-items:center;gap:.4rem;margin-bottom:.25rem;font-size:.78rem">
            <span :style="{ width: '.7rem', height: '.7rem', borderRadius: '2px', background: pieColors[i % pieColors.length], display: 'inline-block', flexShrink: 0 }"></span>
            <span style="flex:1">{{ c.classe }}</span>
            <span style="font-weight:600;color:#1a1a1a">{{ c.total }}</span>
            <span style="color:#94a3b8;font-size:.7rem">{{ Math.round(c.total / pieTotal * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Copertura giorni rimanenti ── -->
    <div v-if="coperturaGiorni.length > 0" class="card" style="border-left: 3px solid #f59e0b">
      <p><strong>📅 Copertura scorte (giorni stimati)</strong></p>
      <p class="muted" style="margin-top:.25rem">Basata sul consumo medio giornaliero degli ultimi 30 giorni. Mostra solo farmaci con ≤90 giorni di copertura.</p>
      <div class="dataset-frame" style="margin-top:.75rem;max-height:18rem;overflow:auto">
        <table class="conflict-table">
          <thead>
            <tr>
              <th>Farmaco</th>
              <th>Scorta</th>
              <th>Media/giorno</th>
              <th>Giorni rimanenti</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in coperturaGiorni" :key="c.drugId"
              :style="{ background: c.urgency === 'critica' ? '#fee2e2' : c.urgency === 'alta' ? '#fff3cd' : 'transparent' }">
              <td>{{ c.nome }}</td>
              <td style="text-align:center">{{ c.stockAttuale }}</td>
              <td style="text-align:center">{{ c.mediaGiornaliera }}</td>
              <td style="text-align:center;font-weight:600" :style="{ color: c.urgency === 'critica' ? '#991b1b' : c.urgency === 'alta' ? '#92400e' : '#1e6f6b' }">
                {{ c.giorniRimanenti >= 999 ? '—' : c.giorniRimanenti + ' gg' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Confezioni scadute / in scadenza ── -->
    <div v-if="expiredBatches.length > 0" class="card" style="border-left: 3px solid #ff6b6b">
      <p><strong>⚠️ Confezioni scadute o in scadenza (entro {{ EXPIRY_WARN_DAYS }} gg)</strong></p>
      <p class="muted" style="margin-top:.25rem">{{ expiredBatches.length }} {{ expiredBatches.length === 1 ? 'confezione' : 'confezioni' }} da controllare</p>
      <div class="dataset-frame" style="margin-top:.75rem;max-height:18rem">
      <table class="conflict-table">
        <thead>
          <tr>
            <th>Confezione</th>
            <th>Farmaco</th>
            <th>Quantità</th>
            <th>Scadenza</th>
            <th>Stato</th>
            <th>Azione</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in expiredBatches" :key="b.id" :style="{ background: b.stato === 'scaduta' ? '#fee2e2' : b.stato === 'in scadenza' ? '#fff3cd' : '#f8fafc' }">
            <td>{{ b.nomeCommerciale || '—' }}</td>
            <td>{{ drugLabel(b.drugId) }}</td>
            <td>{{ b.quantitaAttuale }}</td>
            <td>{{ b.scadenza }}</td>
            <td>{{ formatGiorniScadenza(b.giorniScadenza) }}</td>
            <td>
              <button class="btn-danger" @click="deleteExpiredBatch(b.id)">Cestina</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div class="card">
      <p><strong>Confezioni monitorate</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Modifica o rimuovi confezioni direttamente da Scorte.
      </p>

      <div class="view-actions" style="margin-top:.75rem">
        <button @click="openAddBatchForm">Aggiungi</button>
      </div>

      <div class="dataset-frame" style="margin-top:.75rem">
      <table class="conflict-table">
        <thead>
          <tr>
            <th>Confezione</th>
            <th>Farmaco</th>
            <th>Quantita'</th>
            <th>Soglia</th>
            <th>Scadenza</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="batch in stockBatches" :key="batch.id">
            <td>{{ batch.nomeCommerciale || '—' }}</td>
            <td>{{ drugLabel(batch.drugId) }}</td>
            <td>{{ formatNumber(batch.quantitaAttuale) }}</td>
            <td>{{ formatNumber(batch.sogliaRiordino) }}</td>
            <td>{{ batch.scadenza || '—' }}</td>
            <td>
              <button @click="startEditBatch(batch)">Modifica</button>
              <button class="btn-danger" @click="deleteBatch(batch.id)">Elimina</button>
            </td>
          </tr>
          <tr v-if="!hasBatches && !reportLoading">
            <td colspan="6" class="muted">
              Nessuna confezione attiva. Aggiungi una confezione dalla sezione Farmaci.
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <details v-if="isFormOpen" class="deep-panel add-panel" style="margin-top:.75rem" open @toggle="(e) => { if (!e.target.open) isFormOpen = false }">
        <summary><strong>{{ editingBatchId ? 'Modifica confezione' : 'Aggiungi confezione' }}</strong></summary>
        <div class="panel-breadcrumb" style="margin-top:.75rem">
          <button type="button" class="panel-breadcrumb-link" @click="isFormOpen = false">Scorte</button>
          <span class="panel-breadcrumb-current">/</span>
          <span class="panel-breadcrumb-current">{{ editingBatchId ? 'Modifica' : 'Aggiungi' }}</span>
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
            <input v-model="batchForm.nomeCommerciale" type="text" :disabled="!canEditBatchForm || savingBatch" list="scorte-batch-suggestions" />
            <datalist id="scorte-batch-suggestions">
              <option v-for="n in existingBatchNames" :key="n" :value="n" />
            </datalist>
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
      <p v-if="actionError" class="import-error" role="alert">Errore azione: {{ actionError }}</p>
    </div>

    <UndoDeleteBanner
      v-if="pendingUndo"
      :label="pendingUndo.label"
      @undo="executeUndo"
      @close="clearUndo"
    />
  </div>
</template>
