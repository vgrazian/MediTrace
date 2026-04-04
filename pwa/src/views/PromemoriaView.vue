<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '../db'

const route = useRoute()
const reminders = ref([])

const highlightedReminderId = computed(() => String(route.query.highlight || ''))

function isHighlighted(reminderId) {
  return highlightedReminderId.value && highlightedReminderId.value === reminderId
}

function formatSchedule(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

async function loadReminders() {
  reminders.value = (await db.reminders.toArray())
    .filter(reminder => !reminder.deletedAt)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
}

onMounted(() => {
  void loadReminders()
})

watch(() => route.fullPath, () => {
  void loadReminders()
})
</script>

<template>
  <div class="view">
    <h2>Promemoria</h2>
    <div class="card">
      <p>Somministrazioni previste con stato esito e deep-link da notifica.</p>
      <p v-if="highlightedReminderId" class="muted" style="margin-top:.35rem">
        Evidenziato da notifica: {{ highlightedReminderId }}
      </p>

      <table class="conflict-table" style="margin-top:.75rem">
        <thead>
          <tr>
            <th>ID</th>
            <th>Orario</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="reminder in reminders"
            :key="reminder.id"
            :style="isHighlighted(reminder.id) ? 'background:#dcfce7' : ''"
          >
            <td>{{ reminder.id }}</td>
            <td>{{ formatSchedule(reminder.scheduledAt) }}</td>
            <td>{{ reminder.stato ?? 'DA_ESEGUIRE' }}</td>
          </tr>
          <tr v-if="reminders.length === 0">
            <td colspan="3" class="muted">Nessun promemoria disponibile nel dataset locale.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
