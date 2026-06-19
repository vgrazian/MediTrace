import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    // Set VITE_BASE_URL=/medi-trace/ in CI for GitHub Pages; default to / for local dev
    base: process.env.VITE_BASE_URL ?? '/',

    server: {
        // Disable HMR when running E2E tests to prevent the Vite HMR WebSocket from
        // triggering a page reload when network connectivity is simulated as offline.
        hmr: process.env.NO_HMR !== '1',
    },

    define: {
        __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    },

    plugins: [
        vue(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons/*.png'],
            manifest: {
                name: 'MediTrace',
                short_name: 'MediTrace',
                description: 'Gestione terapie farmacologiche — offline-first PWA',
                theme_color: '#2563eb',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '.',
                icons: [
                    {
                        src: 'icons/pwa-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'icons/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            },
        }),
    ],
})
