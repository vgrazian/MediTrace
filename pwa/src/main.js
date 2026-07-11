import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { startReminderNotificationsLoop } from './services/notifications'
import { startKeepAlive } from './services/keepAlive'
import { logError } from './services/axiomLogger'
import { initApm } from './services/apm'
import { subscribeToRealtime, refreshFromServer } from './services/dataService'
import { db } from './db'
import './style.css'

// Esponi db globalmente per debug/test E2E
if (typeof window !== 'undefined') window.db = db

const app = createApp(App)

// Global error handler
app.config.errorHandler = (err, _instance, info) => {
    logError({
        error: err,
        view: typeof window !== 'undefined' ? window.location.hash : '',
        extra: { vueInfo: info },
    }).catch(() => { })
}

if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
        logError({
            error: event.reason || new Error('Unhandled Promise Rejection'),
            view: window.location.hash,
            extra: { type: 'unhandledrejection' },
        }).catch(() => { })
    })
}

app.use(router).mount('#app')

startReminderNotificationsLoop()
startKeepAlive()
initApm()

// Direct Supabase data service — replaces snapshot sync
subscribeToRealtime()

// Periodic refresh from server (every 30s)
setInterval(() => {
    refreshFromServer().catch(() => { })
}, 30_000)

// Initial refresh after app mounts (delay to let auth init)
setTimeout(() => {
    refreshFromServer().catch(() => { })
}, 5_000)
