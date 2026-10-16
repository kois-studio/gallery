import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        root: './',
        include: ['**/*.e2e-spec.ts'],
        fileParallelism: false,
        // These suites wait for real image processing, which is slower on shared CI runners.
        testTimeout: 30_000,
    },
})
