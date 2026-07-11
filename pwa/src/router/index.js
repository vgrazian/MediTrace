import { createRouter, createWebHashHistory } from 'vue-router'
import { logPageView, logError } from '../services/axiomLogger'
import { trackRouteTiming } from '../services/apm'

/** @type {number} */
let routeEnterTime = 0

const routes = [
    {
        path: '/auth/reset-password',
        component: () => import('../views/ResetPasswordView.vue'),
        meta: { title: 'Reset Password' },
    },
    {
        path: '/',
        component: () => import('../views/HomeView.vue'),
        meta: { title: 'Cruscotto' },
    },
    {
        path: '/farmaci',
        component: () => import('../views/FarmaciView.vue'),
        meta: { title: 'Catalogo Farmaci' },
    },
    {
        path: '/ospiti',
        component: () => import('../views/OspitiView.vue'),
        meta: { title: 'Ospiti' },
    },
    {
        path: '/residenze',
        component: () => import('../views/ResidenzeView.vue'),
        meta: { title: 'Residenze' },
    },
    {
        path: '/scorte',
        component: () => import('../views/ScorteView.vue'),
        meta: { title: 'Scorte' },
    },
    {
        path: '/movimenti',
        component: () => import('../views/MovimentiView.vue'),
        meta: { title: 'Movimenti' },
    },
    {
        path: '/terapie',
        component: () => import('../views/TerapieView.vue'),
        meta: { title: 'Terapie Attive' },
    },
    {
        path: '/promemoria',
        component: () => import('../views/PromemoriaView.vue'),
        meta: { title: 'Promemoria' },
    },
    {
        path: '/audit',
        component: () => import('../views/AuditLogView.vue'),
        meta: { title: 'Audit Log' },
    },
    {
        path: '/diagnostica',
        component: () => import('../views/AnalisiLogView.vue'),
        meta: { title: 'Diagnostica' },
    },
    {
        path: '/operatori',
        component: () => import('../views/OperatoriView.vue'),
        meta: { title: 'Operatori' },
    },
    {
        path: '/impostazioni',
        component: () => import('../views/ImpostazioniView.vue'),
        meta: { title: 'Impostazioni' },
    },
    {
        path: '/informazioni',
        redirect: '/manuale',
    },
    {
        path: '/analisi',
        redirect: '/diagnostica',
    },
    {
        path: '/manuale',
        component: () => import('../views/ManualeView.vue'),
        meta: { title: 'Guida' },
    },
    {
        path: '/:pathMatch(.*)*',
        component: () => import('../views/NotFoundView.vue'),
        meta: { title: 'Pagina non trovata' },
    },
]

const router = createRouter({
    // Hash history works on GitHub Pages without server-side config
    history: createWebHashHistory(import.meta.env.VITE_BASE_URL),
    routes,
})

// Admin-only route guard
router.beforeEach((to, _from, next) => {
    if (to.meta.requiresAdmin) {
        // Check admin role from localStorage session (available before Vue mounts)
        try {
            const sessionRaw = localStorage.getItem('meditrace_auth_session')
            if (sessionRaw) {
                const session = JSON.parse(sessionRaw)
                if (session?.role === 'admin') { next(); return }
            }
        } catch { /* proceed to redirect */ }
        next('/')
        return
    }
    next()
})

router.onError((error) => {
    const message = String(error?.message || '')
    const isChunkLoadError =
        message.includes('Failed to fetch dynamically imported module')
        || message.includes('Importing a module script failed')
        || message.includes('Loading chunk')

    // Log dell'errore di caricamento chunk (senza stack sensibile)
    logError({
        error: { message, name: 'ChunkLoadError' },
        view: typeof window !== 'undefined' ? window.location.hash : '',
    }).catch(() => { })

    if (!isChunkLoadError) return

    // Do not force reload while offline; keep current app shell usable.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    // Recover once from stale cached chunks after a new deploy.
    const reloadKey = 'meditrace:chunk-reload-once'
    const alreadyReloaded = sessionStorage.getItem(reloadKey) === '1'
    if (alreadyReloaded) return
    sessionStorage.setItem(reloadKey, '1')
    window.location.reload()
})

router.beforeEach(() => {
    routeEnterTime = performance.now()
})

router.afterEach((to, from) => {
    document.title = to.meta.title ? `${to.meta.title} — MediTrace` : 'MediTrace'
    // Log page view per analisi percorsi operatore (GDPR-safe: solo route, no PII)
    logPageView(to.path, from?.path || null)
    // Track route transition timing
    if (routeEnterTime > 0) {
        trackRouteTiming(from?.path || '/', to.path, Math.round(performance.now() - routeEnterTime))
        routeEnterTime = 0
    }
})

export default router
