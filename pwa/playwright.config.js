import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1, // Single worker for IndexedDB consistency
    reporter: 'list',

    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173/MediTrace/',
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        command: 'VITE_BASE_URL=/MediTrace/ VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= NO_HMR=1 npx vite preview --port 4173 --host 127.0.0.1',
        url: 'http://127.0.0.1:4173/MediTrace/',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
})
