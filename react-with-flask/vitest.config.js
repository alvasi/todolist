import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [
        react({
            jsxRuntime: 'automatic', // Critical for tests
        }),
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/vitest/setup.js'],
        css: true,
        include: ['src/vitest/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    },
})
