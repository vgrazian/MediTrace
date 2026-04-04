import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        component: () => import('../views/HomeView.vue'),
        meta: { title: 'Dashboard' },
    },
    {
        path: '/farmaci',
        component: () => import('../views/FarmaciView.vue'),
        meta: { title: 'Catalogo Farmaci' },
    },
    {
        path: '/scorte',
        component: () => import('../views/ScorteView.vue'),
        meta: { title: 'Scorte' },
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
        path: '/impostazioni',
        component: () => import('../views/ImpostazioniView.vue'),
        meta: { title: 'Impostazioni' },
    },
    {
        path: '/informazioni',
        component: () => import('../views/InformazioniView.vue'),
        meta: { title: 'Informazioni' },
    },
]

const router = createRouter({
    // Hash history works on GitHub Pages without server-side config
    history: createWebHashHistory(import.meta.env.VITE_BASE_URL),
    routes,
})

router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} — MediTrace` : 'MediTrace'
})

export default router
