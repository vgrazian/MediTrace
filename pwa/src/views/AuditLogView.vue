<template>
  <div class="audit-log-container">
    <h1>Audit Log — Ispezione Attività</h1>

    <!-- Filter Controls -->
    <div class="filter-section">
      <div class="filter-group">
        <label>Filtra per Operatore:</label>
        <input
          v-model="filterOperator"
          type="text"
          placeholder="es. op-1, admin"
          @input="applyFilters"
        />
      </div>

      <div class="filter-group">
        <label>Filtra per Azione:</label>
        <select v-model="filterAction" @change="applyFilters">
          <option value="">— Tutte le azioni —</option>
          <option v-for="action of actionStats" :key="action" :value="action">
            {{ action }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Filtra per Entità:</label>
        <select v-model="filterEntity" @change="applyFilters">
          <option value="">— Tutte le entità —</option>
          <option v-for="entity of entityStats" :key="entity" :value="entity">
            {{ entity }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Intervallo Date:</label>
        <input
          v-model="filterDateStart"
          type="date"
          @change="applyFilters"
        />
        <span>→</span>
        <input
          v-model="filterDateEnd"
          type="date"
          @change="applyFilters"
        />
      </div>

      <button @click="clearFilters" class="btn-secondary">Cancella Filtri</button>
      <button @click="exportEvents" class="btn-secondary">Esporta JSON</button>
    </div>

    <!-- Statistics -->
    <div class="stats-section">
      <div class="stat-card">
        <strong>{{ totalEvents }}</strong>
        <span>Totale Eventi</span>
      </div>
      <div class="stat-card">
        <strong>{{ filteredEvents.length }}</strong>
        <span>Risultati Filtrati</span>
      </div>
    </div>

    <!-- Events Table -->
    <div class="events-table-wrapper">
      <table class="events-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Azione</th>
            <th>Entità</th>
            <th>ID</th>
            <th>Operatore</th>
            <th>Device</th>
            <th>Dettagli</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredEvents.length === 0">
            <td colspan="7" style="text-align: center; padding: 20px;">
              Nessun evento trovato
            </td>
          </tr>
          <tr v-for="event of paginatedEvents" :key="event.id || event.ts">
            <td class="ts">{{ formatTimestamp(event.ts) }}</td>
            <td class="action">{{ event.action }}</td>
            <td class="entity">{{ event.entityType }}</td>
            <td class="id">
              <code>{{ shortenId(event.entityId) }}</code>
            </td>
            <td class="operator">{{ event.operatorId || '—' }}</td>
            <td class="device">{{ event.deviceId || '—' }}</td>
            <td class="details">
              <button @click="toggleDetails(event)" class="btn-details">
                {{ expandedIndex === event.ts ? '▼' : '▶' }}
              </button>
            </td>
          </tr>
          <tr v-if="expandedEvent" :key="`detail-${expandedEvent.ts}`" class="detail-row">
            <td colspan="7">
              <pre>{{ JSON.stringify(expandedEvent, null, 2) }}</pre>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination-section">
      <button
        v-for="page of Array(totalPages).fill(0).map((_, i) => i + 1)"
        :key="page"
        @click="currentPage = page"
        :class="{ active: currentPage === page }"
        class="btn-page"
      >
        {{ page }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  queryByOperator,
  queryByAction,
  queryByEntity,
  queryByDateRange,
  queryRecent,
  getActionStats,
  getEntityStats,
  getOperatorStats,
  exportAuditJson,
  countAllEvents,
} from '../services/auditLog'

const filterOperator = ref('')
const filterAction = ref('')
const filterEntity = ref('')
const filterDateStart = ref('')
const filterDateEnd = ref('')

const filteredEvents = ref([])
const allEvents = ref([])
const actionStats = ref([])
const entityStats = ref([])
const totalEvents = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const expandedIndex = ref(null)

const totalPages = computed(() =>
  Math.ceil(filteredEvents.value.length / pageSize.value)
)

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEvents.value.slice(start, start + pageSize.value)
})

const expandedEvent = computed(() => {
  if (!expandedIndex.value) return null
  return filteredEvents.value.find(e => e.ts === expandedIndex.value)
})

onMounted(async () => {
  await loadStats()
  await loadRecent()
})

async function loadStats() {
  const [actions, entities, operStats, total] = await Promise.all([
    getActionStats(),
    getEntityStats(),
    getOperatorStats(),
    countAllEvents(),
  ])
  actionStats.value = Object.keys(actions).sort()
  entityStats.value = Object.keys(entities).sort()
  totalEvents.value = total
}

async function loadRecent() {
  allEvents.value = await queryRecent(1000)
  filteredEvents.value = allEvents.value
}

async function applyFilters() {
  let results = allEvents.value

  if (filterOperator.value) {
    results = results.filter(e => e.operatorId === filterOperator.value)
  }

  if (filterAction.value) {
    results = results.filter(e => e.action === filterAction.value)
  }

  if (filterEntity.value) {
    results = results.filter(e => e.entityType === filterEntity.value)
  }

  if (filterDateStart.value && filterDateEnd.value) {
    const start = new Date(filterDateStart.value)
    const end = new Date(filterDateEnd.value)
    end.setHours(23, 59, 59, 999)
    results = results.filter(e => {
      const ts = new Date(e.ts)
      return ts >= start && ts <= end
    })
  }

  filteredEvents.value = results
  currentPage.value = 1
}

function clearFilters() {
  filterOperator.value = ''
  filterAction.value = ''
  filterEntity.value = ''
  filterDateStart.value = ''
  filterDateEnd.value = ''
  filteredEvents.value = allEvents.value
  currentPage.value = 1
  expandedIndex.value = null
}

function toggleDetails(event) {
  expandedIndex.value = expandedIndex.value === event.ts ? null : event.ts
}

function formatTimestamp(ts) {
  const date = new Date(ts)
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function shortenId(id) {
  if (!id) return '—'
  return id.length > 20 ? id.substring(0, 17) + '...' : id
}

async function exportEvents() {
  const json = await exportAuditJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.audit-log-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 20px;
  font-size: 24px;
  color: #333;
}

.filter-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-weight: 600;
  color: #555;
  font-size: 14px;
}

.filter-group input,
.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-group input:focus,
.filter-group select:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 4px rgba(74, 144, 226, 0.2);
}

.btn-secondary {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-secondary:hover {
  background: #5a6268;
}

.stats-section {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 25px;
  background: #e3f2fd;
  border-radius: 8px;
  min-width: 150px;
}

.stat-card strong {
  font-size: 24px;
  color: #1976d2;
}

.stat-card span {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.events-table-wrapper {
  overflow-x: auto;
  margin-bottom: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.events-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.events-table thead {
  background: #f0f0f0;
  border-bottom: 2px solid #ddd;
}

.events-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
}

.events-table tbody tr {
  border-bottom: 1px solid #eee;
}

.events-table tbody tr:hover {
  background: #fafafa;
}

.events-table td {
  padding: 12px;
}

.ts {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #666;
}

.action {
  font-weight: 600;
  color: #d9534f;
}

.entity {
  color: #0275d8;
  font-weight: 500;
}

.id {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  color: #888;
}

.operator {
  color: #5cb85c;
  font-weight: 500;
}

.device {
  color: #999;
  font-size: 12px;
}

.btn-details {
  padding: 4px 8px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.btn-details:hover {
  background: #0056b3;
}

.detail-row {
  background: #f9f9f9;
}

.detail-row pre {
  padding: 15px;
  background: #f4f4f4;
  overflow-x: auto;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.pagination-section {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
}

.btn-page {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
}

.btn-page.active {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.btn-page:hover {
  border-color: #4a90e2;
}
</style>
