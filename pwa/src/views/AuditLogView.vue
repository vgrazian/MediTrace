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
      </div>
    </div>

    <div class="card">
      <p><strong>Filtri</strong></p>
      <div class="audit-filters" style="margin-top:.75rem">
        <label>
          Operatore
          <input
            v-model="filters.operator"
            type="text"
            placeholder="es. admin, op-1"
            @input="applyFilters"
          />
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
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

const { goToHelpSection } = useHelpNavigation()

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

onMounted(async () => {
  await loadData()
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
</style>
