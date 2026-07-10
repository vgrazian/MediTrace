<script setup>
/**
 * AnalisiLogView.vue — Dashboard analisi operazionale (admin-only)
 *
 * Interroga Axiom per mostrare:
 *  - Panoramica operatori (conteggio azioni)
 *  - Heatmap percorsi (page_view sequence)
 *  - Errori & diagnostica
 *
 * GDPR: i context criptati sono mostrati come [crittografato].
 *       La decrittazione avviene solo via tool locale axiom-decrypt.mjs.
 */
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../services/auth'
import { isAxiomConfigured } from '../services/axiomLogger'

const { currentUser } = useAuth()

// -- Config Axiom --
const AXIOM_TOKEN = import.meta.env.VITE_AXIOM_TOKEN || ''
const AXIOM_EDGE_URL = import.meta.env.VITE_AXIOM_EDGE_URL || 'https://eu-central-1.aws.edge.axiom.co'
const AXIOM_DATASET = import.meta.env.VITE_AXIOM_DATASET || 'meditrace'

const configured = isAxiomConfigured()

// -- Stato --
const activeTab = ref('operatori') // 'operatori' | 'percorsi' | 'errori'
const loading = ref(false)
const error = ref('')
const fromDate = ref(getDefaultFromDate())
const toDate = ref(getDefaultToDate())
const filterOperator = ref('')
const filterAction = ref('')
const filterEntity = ref('')

// Dati
const operatorStats = ref([])
const pageViews = ref([])
const errorStats = ref([])

// -- Computed --
const queryDateRange = computed(() => {
  const from = new Date(fromDate.value)
  const to = new Date(toDate.value)
  to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
})

const topPaths = computed(() => {
  const transitions = {}
  for (let i = 1; i < pageViews.value.length; i++) {
    const from = pageViews.value[i - 1].view || '/'
    const to = pageViews.value[i].view || '/'
    const key = `${from} → ${to}`
    transitions[key] = (transitions[key] || 0) + 1
  }
  return Object.entries(transitions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
})

const maxOperatorCount = computed(() => {
  if (operatorStats.value.length === 0) return 1
  return Math.max(...operatorStats.value.map(o => o.count))
})

const maxErrorCount = computed(() => {
  if (errorStats.value.length === 0) return 1
  return Math.max(...errorStats.value.map(e => e.count))
})

// -- Methods --
function getDefaultFromDate() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

function getDefaultToDate() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Escapa caratteri speciali per stringhe APL.
 * @param {string} val
 * @returns {string}
 */
function escapeAplString(val) {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * Costruisce clausole `where` aggiuntive per la query APL a partire dai filtri.
 * @returns {string[]}
 */
function buildFilterClauses() {
  const clauses = []
  if (filterOperator.value.trim()) {
    clauses.push(`operatorId == '${escapeAplString(filterOperator.value.trim())}'`)
  }
  if (filterEntity.value) {
    clauses.push(`entityType == '${escapeAplString(filterEntity.value)}'`)
  }
  return clauses
}

/**
 * Converte la risposta tabular di Axiom in array di oggetti row-oriented.
 * Il formato tabular è column-oriented: tables[0].columns[i] = valori del campo i.
 *
 * @param {object} json - risposta JSON da Axiom
 * @returns {Array<object>} array di oggetti row-oriented
 */
function parseTabularResponse(json) {
  const table = json?.tables?.[0]
  if (!table || !table.fields || !table.columns) return []
  const fields = table.fields.map(f => f.name)
  const columns = table.columns
  if (columns.length === 0) return []
  const rowCount = columns[0].length
  const rows = []
  for (let i = 0; i < rowCount; i++) {
    const row = {}
    for (let j = 0; j < fields.length; j++) {
      const val = columns[j]?.[i]
      row[fields[j]] = val === null ? undefined : val
    }
    rows.push(row)
  }
  return rows
}

/**
 * Esegue una query APL sull'Edge endpoint di Axiom.
 * L'Edge supporta solo /v1/query/_apl (NON /v1/datasets/{name}/query che è su api.axiom.co).
 *
 * @param {string} apl - query APL completa
 * @returns {Promise<Array<object>>} array di oggetti row-oriented
 */
async function queryAxiomApl(apl) {
  const res = await fetch(`${AXIOM_EDGE_URL}/v1/query/_apl?format=tabular`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AXIOM_TOKEN}`,
    },
    body: JSON.stringify({
      apl,
      startTime: queryDateRange.value.from,
      endTime: queryDateRange.value.to,
    }),
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`Axiom query error ${res.status}: ${errorText || res.statusText}`)
  }
  return parseTabularResponse(await res.json())
}

async function loadData() {
  if (!configured) return
  loading.value = true
  error.value = ''

  try {
    const filterClauses = buildFilterClauses()
    const whereExtra = filterClauses.length > 0 ? ' and ' + filterClauses.join(' and ') : ''

    // Se è selezionato un tipo specifico (filterAction), lo usiamo per TUTTE le query;
    // altrimenti ogni tab ha il suo tipo predefinito.
    const opsType = filterAction.value || 'action'
    const pagesType = filterAction.value || 'page_view'
    const errsType = filterAction.value || 'error'

    const [ops, pages, errs] = await Promise.all([
      // Panoramica operatori
      queryAxiomApl(
        `['${AXIOM_DATASET}'] | where type == '${opsType}'${whereExtra} | summarize count() by operatorId | order by count_ desc`
      ),
      // Page views
      queryAxiomApl(
        `['${AXIOM_DATASET}'] | where type == '${pagesType}'${whereExtra} | limit 500`
      ),
      // Errori raggruppati per hash
      queryAxiomApl(
        `['${AXIOM_DATASET}'] | where type == '${errsType}'${whereExtra} | summarize count() by errorHash | order by count_ desc | limit 50`
      ),
    ])

    // Parsing: queryAxiomApl restituisce già array di oggetti row-oriented
    operatorStats.value = ops.map(m => ({
      operatorId: m.operatorId || 'unknown',
      count: m.count_ || 0,
    }))

    pageViews.value = pages.map(m => ({
      view: m.view || '',
      ts: m._time,
      operatorId: m.operatorId || 'unknown',
    }))

    errorStats.value = errs.map(m => ({
      errorHash: m.errorHash || 'unknown',
      count: m.count_ || 0,
    }))
  } catch (err) {
    error.value = err.message || 'Errore nel caricamento dati da Axiom'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (configured) loadData()
})
</script>

<template>
  <div class="analisi-view">
    <header class="analisi-header">
      <h2>Diagnostica</h2>
      <p v-if="!configured" class="axiom-warning">
        ⚠️ Axiom non configurato — imposta <code>VITE_AXIOM_TOKEN</code> per attivare l'analisi.
      </p>
    </header>

    <template v-if="configured">
      <!-- Filtri -->
      <div class="analisi-filters">
        <label>
          Da
          <input type="date" v-model="fromDate" />
        </label>
        <label>
          A
          <input type="date" v-model="toDate" />
        </label>
        <label>
          Operatore
          <input type="text" v-model="filterOperator" placeholder="username" />
        </label>
        <label>
          Azione
          <select v-model="filterAction">
            <option value="">Tutte</option>
            <option value="action">CRUD</option>
            <option value="page_view">Navigazione</option>
            <option value="error">Errori</option>
            <option value="auth">Autenticazione</option>
            <option value="sync">Sincronizzazione</option>
          </select>
        </label>
        <button class="btn-primary" @click="loadData" :disabled="loading">
          {{ loading ? 'Caricamento...' : 'Aggiorna' }}
        </button>
      </div>

      <p v-if="error" class="axiom-error">{{ error }}</p>

      <!-- Tabs -->
      <nav class="analisi-tabs">
        <button
          :class="{ active: activeTab === 'operatori' }"
          @click="activeTab = 'operatori'"
        >Panoramica Operatori</button>
        <button
          :class="{ active: activeTab === 'percorsi' }"
          @click="activeTab = 'percorsi'"
        >Heatmap Percorsi</button>
        <button
          :class="{ active: activeTab === 'errori' }"
          @click="activeTab = 'errori'"
        >Errori & Diagnostica</button>
      </nav>

      <!-- Tab: Panoramica Operatori -->
      <section v-if="activeTab === 'operatori'" class="analisi-panel">
        <h3>Azioni per Operatore</h3>
        <div v-if="operatorStats.length === 0 && !loading" class="empty-state">
          Nessun dato nel periodo selezionato.
        </div>
        <div v-else class="bar-chart">
          <div
            v-for="op in operatorStats"
            :key="op.operatorId"
            class="bar-row"
          >
            <span class="bar-label">{{ op.operatorId }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ width: (op.count / maxOperatorCount * 100) + '%' }"
              ></div>
            </div>
            <span class="bar-value">{{ op.count }}</span>
          </div>
        </div>
      </section>

      <!-- Tab: Heatmap Percorsi -->
      <section v-if="activeTab === 'percorsi'" class="analisi-panel">
        <h3>Percorsi più Seguiti</h3>
        <p class="analisi-hint">Sequence di navigazione (page_view) nel periodo selezionato.</p>
        <div v-if="topPaths.length === 0 && !loading" class="empty-state">
          Nessuna navigazione registrata nel periodo.
        </div>
        <table v-else class="analisi-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Percorso</th>
              <th>Transizioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="([path, count], idx) in topPaths" :key="path">
              <td>{{ idx + 1 }}</td>
              <td><code>{{ path }}</code></td>
              <td>{{ count }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Tab: Errori -->
      <section v-if="activeTab === 'errori'" class="analisi-panel">
        <h3>Errori & Diagnostica</h3>
        <p class="analisi-hint">
          Errori raggruppati per hash. I dettagli (stack trace) sono criptati —
          usa <code>scripts/axiom-decrypt.mjs</code> per la decrittazione locale.
        </p>
        <div v-if="errorStats.length === 0 && !loading" class="empty-state">
          Nessun errore nel periodo selezionato.
        </div>
        <div v-else class="bar-chart">
          <div
            v-for="err in errorStats"
            :key="err.errorHash"
            class="bar-row"
          >
            <span class="bar-label mono">{{ err.errorHash }}</span>
            <div class="bar-track">
              <div
                class="bar-fill bar-fill-error"
                :style="{ width: (err.count / maxErrorCount * 100) + '%' }"
              ></div>
            </div>
            <span class="bar-value">{{ err.count }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.analisi-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.analisi-header h2 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.axiom-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.axiom-warning code {
  background: rgba(0,0,0,0.06);
  padding: 0.1em 0.4em;
  border-radius: 3px;
  font-size: 0.85em;
}

.axiom-error {
  background: #f8d7da;
  border: 1px solid #f5c2c7;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  color: #842029;
  font-size: 0.9rem;
}

.analisi-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin: 1rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.analisi-filters label {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  color: #666;
  gap: 0.25rem;
}

.analisi-filters input,
.analisi-filters select {
  padding: 0.4rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-primary {
  padding: 0.45rem 1rem;
  background: #1a56db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.analisi-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e0e0e0;
  margin: 1.5rem 0 1rem;
}

.analisi-tabs button {
  padding: 0.6rem 1.2rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}

.analisi-tabs button:hover {
  color: #1a56db;
}

.analisi-tabs button.active {
  color: #1a56db;
  border-bottom-color: #1a56db;
  font-weight: 600;
}

.analisi-panel h3 {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
}

.analisi-hint {
  font-size: 0.85rem;
  color: #888;
  margin: 0 0 1rem;
}

.analisi-hint code {
  background: rgba(0,0,0,0.05);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
  color: #999;
  font-style: italic;
}

/* Bar chart */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bar-label {
  width: 140px;
  text-align: right;
  font-size: 0.85rem;
  color: #444;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-label.mono {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 0.78rem;
}

.bar-track {
  flex: 1;
  height: 20px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #1a56db;
  border-radius: 4px;
  min-width: 2px;
  transition: width 0.3s ease;
}

.bar-fill-error {
  background: #d32f2f;
}

.bar-value {
  width: 50px;
  font-size: 0.85rem;
  color: #333;
  font-weight: 600;
  flex-shrink: 0;
}

/* Table */
.analisi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.analisi-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 2px solid #e0e0e0;
  color: #666;
  font-weight: 600;
}

.analisi-table td {
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.analisi-table code {
  background: rgba(0,0,0,0.04);
  padding: 0.15em 0.35em;
  border-radius: 3px;
  font-size: 0.85em;
}
</style>
