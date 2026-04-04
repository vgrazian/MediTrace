<script setup>
import { onMounted, ref } from 'vue'
import { buildOperationalReport, operationalReportToCsv } from '../services/reporting'

const report = ref(null)
const reportLoading = ref(false)
const reportError = ref('')

function formatNumber(value) {
  return Number(value ?? 0).toFixed(2)
}

function formatCoverage(value) {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(2)} settimane`
}

function formatWeekLabel(weekKey) {
  return String(weekKey || '').replace('-W', ' W')
}

async function refreshReport() {
  reportLoading.value = true
  reportError.value = ''
  try {
    report.value = await buildOperationalReport()
  } catch (err) {
    reportError.value = err.message
  } finally {
    reportLoading.value = false
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

onMounted(() => {
  void refreshReport()
})
</script>

<template>
  <div class="view">
    <h2>Scorte</h2>

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
      </div>

      <p v-if="reportError" class="import-error" style="margin-top:.5rem">Errore report: {{ reportError }}</p>
    </div>

    <div v-if="report" class="card">
      <p><strong>Riepilogo segnalazioni</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Farmaci monitorati: {{ report.summary.totalDrugs }}<br />
        Critica: {{ report.summary.critical }} · Alta: {{ report.summary.high }} · Media: {{ report.summary.medium }} · OK: {{ report.summary.ok }}<br />
        Generato: {{ report.generatedAt }}
      </p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>Farmaco</th>
            <th>Scorta attuale</th>
            <th>Consumo sett.</th>
            <th>Copertura</th>
            <th>Soglia</th>
            <th>Priorita'</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.rows" :key="row.drugId">
            <td>{{ row.principioAttivo }}</td>
            <td>{{ formatNumber(row.stockCurrent) }}</td>
            <td>{{ formatNumber(row.weeklyConsumption) }}</td>
            <td>{{ formatCoverage(row.coverageWeeks) }}</td>
            <td>{{ formatNumber(row.reorderThreshold) }}</td>
            <td>{{ row.warningPriority }}</td>
            <td>{{ row.warningReason }}</td>
          </tr>
          <tr v-if="report.rows.length === 0">
            <td colspan="7" class="muted">Nessun farmaco disponibile nel dataset locale.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="report" class="card">
      <p><strong>Trend settimanale consumo per farmaco</strong></p>
      <p class="muted" style="margin-top:.25rem">
        Consumi scaricati sulle ultime settimane (movimenti di tipo consumo/scarico/somministrazione).
      </p>

      <table class="conflict-table" style="margin-top:.75rem">
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
</template>
