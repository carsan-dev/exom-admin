import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // Unit tests must not load developer or deployment credentials from .env files.
  envDir: false,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    env: {
      VITE_API_URL: 'http://exom-unit.invalid',
      VITE_FIREBASE_API_KEY: 'exom-unit-test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'exom-unit.invalid',
      VITE_FIREBASE_PROJECT_ID: 'demo-exom-unit',
      VITE_FIREBASE_STORAGE_BUCKET: 'exom-unit.invalid',
      VITE_FIREBASE_APP_ID: '1:000000000000:web:exom-unit',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
    },
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
