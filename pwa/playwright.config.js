import { defineConfig, devices } from '@playwright/test'

const PORT = 5176
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 30_000,
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        headless: true,
    },
    projects: [
        {
            name: 'desktop-chromium',
            testIgnore: [
                '**/android-phone-smoke.spec.js',
                '**/cross-browser-parity.spec.js',
                '**/e2e-js-coverage.spec.js',
            ],
            use: {
                browserName: 'chromium',
            },
        },
        {
            name: 'critical-parity-chromium',
            testMatch: '**/cross-browser-parity.spec.js',
            use: {
                browserName: 'chromium',
            },
        },
        {
            name: 'critical-parity-firefox',
            testMatch: '**/cross-browser-parity.spec.js',
            use: {
                browserName: 'firefox',
            },
        },
        {
            name: 'critical-parity-webkit',
            testMatch: '**/cross-browser-parity.spec.js',
            use: {
                browserName: 'webkit',
            },
        },
        {
            name: 'e2e-js-coverage-chromium',
            testMatch: '**/e2e-js-coverage.spec.js',
            use: {
                browserName: 'chromium',
            },
        },
        {
            name: 'android-phone-chromium-smoke',
            testMatch: '**/android-phone-smoke.spec.js',
            use: {
                ...devices['Pixel 5'],
                browserName: 'chromium',
            },
        },
        {
            // Safari iOS-like run (WebKit + iPhone viewport/user-agent)
            name: 'mobile-webkit-notifications',
            testMatch: '**/notifications.spec.js',
            use: {
                ...devices['iPhone 13'],
                browserName: 'webkit',
            },
        },
    ],
    webServer: {
        command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        cwd: '.',
        env: {
            VITE_DEV_SEED_ACCOUNT: '1',
            VITE_DEV_SEED_USERNAME: 'prova',
            VITE_DEV_SEED_PASSWORD: 'Prova1234!',
            VITE_DEV_SEED_GITHUB_TOKEN: 'github_pat_test_seed_token',
            // Force deterministic local-auth mode for E2E smoke (no real Supabase calls).
            VITE_SUPABASE_URL: '',
            VITE_SUPABASE_PUBLISHABLE_KEY: '',
            VITE_BASE_URL: '/',
            NO_HMR: '1',
        },
    },
})
