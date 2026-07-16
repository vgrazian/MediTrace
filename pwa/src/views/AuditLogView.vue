<template>
  <div class="view audit-log-view">
    <div class="card">
      <div class="audit-header">
        <div>
            <div class="view-heading" style="margin-bottom:.25rem">
              <h2 style="margin-bottom:0">Registro Operazioni (Audit)</h2>
              <button class="help-btn" @click="goToHelpSection('audit')">Aiuto</button>
            </div>
          <p class="muted" style="margin-top:.3rem">
            Pannello in sola lettura per verificare chi ha eseguito una specifica operazione.
          </p>
        </div>
        <span class="readonly-pill">Sola lettura</span>
        <button v-if="currentUser?.role === 'admin'" class="btn-primary" style="margin-left:.75rem" @click="toggleDiagnostica" title="Dashboard diagnostica sistema e Axiom">🔍 Diagnostica</button>
      </div>
    </div>

    <div class="card">
      <p><strong>Stato Applicazione</strong></p>
      <p class="muted" style="margin-top:.15rem">Connettività e consumo risorse del database cloud, stima traffico API e diagnostica Axiom.</p>

      <div class="supabase-stats-grid">
        <!-- Connections bar -->
        <div class="supabase-stat">
          <div class="supabase-stat-label">Connessioni DB</div>
          <div class="supabase-stat-value">{{ supabaseStats.active }}/{{ supabaseStats.maxConn }} attive</div>
          <div class="supabase-bar">
            <div class="supabase-bar-fill" :style="{ width: supabaseStats.connPct + '%' }"></div>
          </div>
          <div class="supabase-stat-sub">{{ supabaseStats.total }} totali su {{ supabaseStats.maxConn }} max</div>
        </div>

        <!-- DB size -->
        <div class="supabase-stat">
          <div class="supabase-stat-label">Dimensione DB</div>
          <div class="supabase-stat-value">{{ supabaseStats.dbSizeLabel }}</div>
          <div class="supabase-bar">
            <div class="supabase-bar-fill supabase-bar-fill--green" :style="{ width: supabaseStats.dbSizePct + '%' }"></div>
          </div>
          <div class="supabase-stat-sub">{{ supabaseStats.dbSizePct }}% di 500 MB (piano free)</div>
        </div>

        <!-- Tables -->
        <div class="supabase-stat">
          <div class="supabase-stat-label">Tabelle</div>
          <div class="supabase-stat-value">{{ supabaseStats.tables }}</div>
          <div class="supabase-stat-sub" style="margin-top:.35rem">nel schema <code>public</code></div>
        </div>

        <!-- API calls placeholder -->
        <div class="supabase-stat">
          <div class="supabase-stat-label">Stima traffico API</div>
          <div class="supabase-stat-value">{{ supabaseStats.apiLabel }}</div>
          <div class="supabase-bar">
            <div class="supabase-bar-fill supabase-bar-fill--amber" :style="{ width: supabaseStats.apiPct + '%' }"></div>
          </div>
          <div class="supabase-stat-sub">{{ supabaseStats.apiPct }}% del limite giornaliero stimato</div>
        </div>

        <!-- Axiom status -->
        <div class="supabase-stat">
          <div class="supabase-stat-label">Axiom Logging</div>
          <div class="supabase-stat-value">{{ axiomConfigured ? 'Configurato' : 'Non configurato' }}</div>
          <div class="supabase-stat-sub" style="margin-top:.35rem">{{ axiomConfigured ? 'EU Central · dataset meditrace' : 'Logger degradato a console.warn' }}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <p><strong>Stato sincronizzazione</strong></p>
      <div style="display:flex;gap:2rem;flex-wrap:wrap;margin-top:.45rem">
        <div>
          <span class="muted" style="font-size:.8rem">Operazioni in coda</span><br />
          <span style="font-weight:700;font-size:1.1rem">{{ syncQueueCount }}</span>
        </div>
        <div>
          <span class="muted" style="font-size:.8rem">Ultimo sync</span><br />
          <span style="font-weight:700;font-size:.9rem">{{ syncLastAt ? new Date(syncLastAt).toLocaleString('it-IT', { hour12: false }) : '—' }}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <p><strong>Filtri</strong></p>
      <div class="audit-filters" style="margin-top:.75rem">
        <label>
          Operatore
          <select
            v-model="filters.operator"
            @change="applyFilters"
          >
            <option value="">TUTTI</option>
            <option v-for="op in availableOperators" :key="op" :value="op">{{ op }}</option>
          </select>
        </label>

        <label>
          Ospite
          <input
            v-model="filters.host"
            type="text"
            placeholder="ID o cognome"
            @input="applyFilters"
          />
        </label>

        <label>
          Farmaco
          <input
            v-model="filters.drug"
            type="text"
            placeholder="Nome o principio attivo"
            @input="applyFilters"
          />
        </label>

        <label>
          Terapia
          <input
            v-model="filters.therapy"
            type="text"
            placeholder="ID terapia"
            @input="applyFilters"
          />
        </label>

        <label>
          Azione
          <select v-model="filters.action" @change="applyFilters">
            <option value="">Tutte le azioni</option>
            <option v-for="action in actionStats" :key="action" :value="action">{{ action }}</option>
          </select>
        </label>

        <label>
          Entita
          <select v-model="filters.entity" @change="applyFilters">
            <option value="">Tutte le entita</option>
            <option v-for="entity in entityStats" :key="entity" :value="entity">{{ entity }}</option>
          </select>
        </label>

        <label>
          Periodo da
          <input v-model="filters.fromDate" type="date" @change="applyFilters" />
        </label>

        <label>
          Periodo a
          <input v-model="filters.toDate" type="date" @change="applyFilters" />
        </label>
      </div>

      <div class="audit-filter-actions" style="margin-top:.75rem">
        <button @click="clearFilters">Azzera filtri</button>
        <button @click="exportEvents">Esporta JSON</button>
        <button @click="exportAuditPdf">Esporta PDF</button>
      </div>
    </div>

    <div class="card">
      <div class="audit-stats">
        <p><strong>Eventi totali:</strong> {{ totalEvents }}</p>
        <p><strong>Risultati filtrati:</strong> {{ filteredEvents.length }}</p>
      </div>

      <div class="events-table-wrapper" role="region" aria-label="Tabella registro operazioni">
        <table class="conflict-table events-table" aria-label="Registro operazioni">
          <thead>
            <tr>
              <th>Data/Ora</th>
              <th>Operatore</th>
              <th>Azione</th>
              <th>Entita</th>
              <th>Ospite</th>
              <th>Farmaco</th>
              <th>Terapia</th>
              <th>Dettagli</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paginatedEvents.length === 0">
              <td colspan="8" class="muted" style="text-align:center">Nessun evento trovato.</td>
            </tr>

            <template v-for="event in paginatedEvents" :key="event.id || event.ts">
              <tr>
                <td class="audit-ts">{{ formatTimestamp(event.ts) }}</td>
                <td>{{ event.operatorId || '—' }}</td>
                <td>{{ event.action || '—' }}</td>
                <td>{{ event.entityType || '—' }}</td>
                <td>{{ event.hostLabel || event.hostId || '—' }}</td>
                <td>{{ event.drugLabel || event.drugId || '—' }}</td>
                <td>{{ event.therapyLabel || event.therapyId || '—' }}</td>
                <td>
                  <button @click="toggleDetails(event)">
                    {{ expandedRowKey === rowKey(event) ? 'Nascondi' : 'Mostra' }}
                  </button>
                </td>
              </tr>
              <tr v-if="expandedRowKey === rowKey(event)">
                <td colspan="8">
                  <pre class="audit-json">{{ JSON.stringify(event, null, 2) }}</pre>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="audit-pagination" style="margin-top:.75rem">
        <button :disabled="currentPage <= 1" @click="currentPage -= 1">Precedente</button>
        <span>Pagina {{ currentPage }} / {{ totalPages }}</span>
        <button :disabled="currentPage >= totalPages" @click="currentPage += 1">Successiva</button>
      </div>
    </div>

    <!-- ── Pannello Diagnostica ── -->
    <div v-if="showDiagnostica" class="card" style="border-left: 3px solid #6366f1">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <p style="font-weight:700;margin:0">🔍 Diagnostica Sistema</p>
        <button class="btn-ghost" @click="showDiagnostica = false" title="Chiudi diagnostica">✕ Chiudi</button>
      </div>
      <AnalisiLogView :embedded="true" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AnalisiLogView from './AnalisiLogView.vue'
import {
  buildAuditReferences,
  countAllEvents,
  enrichAuditEvents,
  exportAuditJson,
  filterAuditEvents,
  getActionStats,
  getEntityStats,
  queryRecent,
} from '../services/auditLog'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'
import { isAxiomConfigured } from '../services/axiomLogger'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db, getSetting } from '../db'

const { goToHelpSection } = useHelpNavigation()
const showDiagnostica = ref(false)
function toggleDiagnostica() { showDiagnostica.value = !showDiagnostica.value }
const axiomConfigured = ref(isAxiomConfigured())
const availableOperators = ref([])

// ── Supabase stats ──────────────────────────────────────────────────────
const supabaseStats = ref({
  active: 0,
  total: 0,
  maxConn: 60,
  connPct: 0,
  dbSizeLabel: '—',
  dbSizePct: 0,
  tables: 0,
  apiLabel: '—',
  apiPct: 0,
})

async function loadSupabaseStats() {
  if (!isSupabaseConfigured) {
    supabaseStats.value.apiLabel = 'Non configurato'
    return
  }
  try {
    const { data, error } = await supabase.rpc('get_db_stats')
    if (error) throw error
    if (data && data.length > 0) {
      const s = data[0]
      const active = Number(s.active_connections) || 0
      const total = Number(s.total_connections) || 0
      const max = Number(s.max_connections) || 60
      const dbBytes = Number(s.db_size_bytes) || 0
      const tbl = Number(s.table_count) || 0

      supabaseStats.value = {
        active,
        total,
        maxConn: max,
        connPct: Math.round((total / max) * 100),
        dbSizeLabel: dbBytes > 1048576
          ? (dbBytes / 1048576).toFixed(1) + ' MB'
          : (dbBytes / 1024).toFixed(0) + ' KB',
        dbSizePct: Math.round((dbBytes / (500 * 1048576)) * 100),
        tables: tbl,
        apiLabel: 'Operativo',
        apiPct: Math.min(Math.round((total / max) * 2.5), 100),
      }
    }
  } catch {
    supabaseStats.value.dbSizeLabel = '—'
    supabaseStats.value.apiLabel = 'RPC non disponibile'
  }
}

const totalEvents = ref(0)
const allEvents = ref([])
const filteredEvents = ref([])
const actionStats = ref([])
const entityStats = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const expandedRowKey = ref('')

const filters = ref({
  operator: '',
  host: '',
  drug: '',
  therapy: '',
  action: '',
  entity: '',
  fromDate: '',
  toDate: '',
})

const totalPages = computed(() => {
  const pages = Math.ceil(filteredEvents.value.length / pageSize.value)
  return pages > 0 ? pages : 1
})

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEvents.value.slice(start, start + pageSize.value)
})

function rowKey(event) {
  return String(event?.id ?? event?.ts ?? '')
}

function formatTimestamp(ts) {
  if (!ts) return '—'
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return String(ts)
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function toggleDetails(event) {
  const key = rowKey(event)
  expandedRowKey.value = expandedRowKey.value === key ? '' : key
}

async function loadData() {
  const [actions, entities, total, events, refs] = await Promise.all([
    getActionStats(),
    getEntityStats(),
    countAllEvents(),
    queryRecent(2000),
    buildAuditReferences(),
  ])

  actionStats.value = Object.keys(actions).sort()
  entityStats.value = Object.keys(entities).sort()
  totalEvents.value = total

  const enriched = enrichAuditEvents(events, refs)
  allEvents.value = enriched
  filteredEvents.value = enriched

  // Load unique operators for dropdown
  const ops = new Set()
  for (const ev of enriched) {
    if (ev.operatorId) ops.add(ev.operatorId)
  }
  availableOperators.value = [...ops].sort()
}

function applyFilters() {
  filteredEvents.value = filterAuditEvents(allEvents.value, filters.value)
  currentPage.value = 1
  expandedRowKey.value = ''
}

function clearFilters() {
  filters.value = {
    operator: '',
    host: '',
    drug: '',
    therapy: '',
    action: '',
    entity: '',
    fromDate: '',
    toDate: '',
  }
  filteredEvents.value = allEvents.value
  currentPage.value = 1
  expandedRowKey.value = ''
}

async function exportEvents() {
  const json = await exportAuditJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `audit-log-${new Date().toISOString()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function exportAuditPdf() {
  try {
    const events = filteredEvents.value
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const timestamp = new Date().toLocaleString('it-IT', { hour12: false })

    doc.setFontSize(16)
    doc.text('MediTrace - Registro Operazioni (Audit)', 40, 40)
    doc.setFontSize(10)
    doc.text(`Generato: ${timestamp} | Eventi: ${events.length}`, 40, 58)

    const body = events.map((event) => [
      formatTimestamp(event.ts),
      event.operatorId || '—',
      event.action || '—',
      event.entityType || '—',
      event.hostLabel || event.hostId || '—',
      event.drugLabel || event.drugId || '—',
      event.therapyLabel || event.therapyId || '—',
    ])

    autoTable(doc, {
      startY: 72,
      head: [['Data/Ora', 'Operatore', 'Azione', 'Entità', 'Ospite', 'Farmaco', 'Terapia']],
      body,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [32, 67, 133] },
    })

    doc.save(`meditrace-audit-${new Date().toISOString().slice(0, 10)}.pdf`)
  } catch (err) {
    console.error('Errore esportazione PDF audit:', err)
  }
}

// ── Sync state ──
const syncQueueCount = ref(0)
const syncLastAt = ref(null)

async function loadSyncState() {
  try {
    syncQueueCount.value = await db.syncQueue.count()
    syncLastAt.value = await getSetting('lastSyncAt', null)
  } catch { /* ignore */ }
}

onMounted(async () => {
  await loadData()
  loadSupabaseStats()
  loadSyncState()
})
</script>

<style scoped>
.audit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .9rem;
  flex-wrap: wrap;
}

.readonly-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #9bb5d4;
  background: #edf3fb;
  color: #1f3a66;
  border-radius: 999px;
  padding: .28rem .75rem;
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .03em;
  text-transform: uppercase;
}

.audit-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: .65rem;
}

.audit-filters label {
  display: grid;
  gap: .3rem;
  font-size: .85rem;
  color: #334155;
}

.audit-filters input,
.audit-filters select {
  border: 1px solid var(--line);
  border-radius: .38rem;
  padding: .45rem .55rem;
  font-size: .85rem;
  background: #fff;
}

.audit-filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .55rem;
}

.audit-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: .7rem;
}

.events-table-wrapper {
  border: 1px solid var(--line);
  border-radius: .6rem;
  overflow: auto;
  max-height: clamp(270px, 56vh, 680px);
}

.events-table {
  margin-top: 0;
  min-width: 980px;
}

.audit-ts {
  white-space: nowrap;
}

.audit-json {
  margin: 0;
  white-space: pre-wrap;
  max-height: 200px;
  overflow: auto;
  background: #f7fbff;
  border: 1px solid #d9e7f7;
  border-radius: .4rem;
  padding: .55rem;
  font-size: .78rem;
}

.audit-pagination {
  display: flex;
  align-items: center;
  gap: .6rem;
  justify-content: flex-end;
}

@media (max-width: 700px) {
  .events-table-wrapper {
    max-height: clamp(240px, 52vh, 500px);
  }
}

/* ── Supabase stats ── */
.supabase-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: .85rem;
  margin-top: .65rem;
}

.supabase-stat {
  padding: .55rem .7rem;
  border: 1px solid var(--line);
  border-radius: .5rem;
  background: #fff;
}

.supabase-stat-label {
  font-size: .75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: .15rem;
}

.supabase-stat-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--brand-900);
  font-variant-numeric: tabular-nums;
}

.supabase-bar {
  height: 6px;
  background: #e8eef6;
  border-radius: 3px;
  margin-top: .45rem;
  overflow: hidden;
}

.supabase-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width .6s ease;
  min-width: 2px;
}

.supabase-bar-fill--green {
  background: #22c55e;
}

.supabase-bar-fill--amber {
  background: #f59e42;
}

.supabase-stat-sub {
  font-size: .72rem;
  color: #94a3b8;
  margin-top: .2rem;
}
</style>
