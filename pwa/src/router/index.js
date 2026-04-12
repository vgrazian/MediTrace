import { createRouter, createWebHashHistory } from 'vue-router'

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
        path: '/stanze',
        component: () => import('../views/StanzeView.vue'),
        meta: { title: 'Stanze e Letti' },
    },
    {
        path: '/scorte',
        component: () => import('../views/ScorteView.vue'),
        meta: { title: 'Scorte' },
    },
    {
        path: '/movimenti',
        component: () => import('../views/MovimentiView.vue'),
        meta: { title: 'Movimenti Magazzino' },
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
        path: '/impostazioni',
        component: () => import('../views/ImpostazioniView.vue'),
        meta: { title: 'Impostazioni' },
    },
    {
        path: '/informazioni',
        component: () => import('../views/InformazioniView.vue'),
        meta: { title: 'Informazioni' },
    },
    {
        path: '/manuale',
        component: () => import('../views/ManualeView.vue'),
        meta: { title: 'Manuale Utente' },
    },
]

const router = createRouter({
    // Hash history works on GitHub Pages without server-side config
    history: createWebHashHistory(import.meta.env.VITE_BASE_URL),
    routes,
})

router.onError((error) => {
    const message = String(error?.message || '')
    const isChunkLoadError =
        message.includes('Failed to fetch dynamically imported module')
        || message.includes('Importing a module script failed')
        || message.includes('Loading chunk')

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

router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} — MediTrace` : 'MediTrace'
})

export default router
