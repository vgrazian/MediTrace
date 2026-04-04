import { defineConfig } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 30_000,
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        browserName: 'chromium',
        headless: true,
    },
    webServer: {
        command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        cwd: '.',
        env: {
            VITE_DEV_SEED_ACCOUNT: '1',
            VITE_DEV_SEED_USERNAME: 'prova',
            VITE_DEV_SEED_PASSWORD: 'Prova123!',
            VITE_DEV_SEED_GITHUB_TOKEN: 'github_pat_test_seed_token',
            VITE_BASE_URL: '/',
        },
    },
})
