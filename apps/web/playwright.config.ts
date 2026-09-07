import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:3400',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'node e2e/start-server.mjs',
        url: 'http://127.0.0.1:3400/api/health',
        reuseExistingServer: false,
        timeout: 120_000,
    },
})
