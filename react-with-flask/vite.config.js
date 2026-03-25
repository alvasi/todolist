import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [
        react({
            jsxRuntime: 'automatic',
        }),
    ],
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://127.0.0.1:5001',
                changeOrigin: true,
                secure: false,
                // Forward /api/* to the backend preserving the /api prefix so routes like /api/teams match
                // (Previously the rewrite removed /api which caused backend 404s for /api routes.)
            },
        },
    },
})
