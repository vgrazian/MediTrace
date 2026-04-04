import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/unit/**/*.spec.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary'],
            thresholds: {
                lines: 50,
                functions: 50,
                statements: 50,
                branches: 30,
            },
        },
    },
})
