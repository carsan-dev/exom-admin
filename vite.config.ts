import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const appVersion = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? Date.now().toString()

function versionFilePlugin(): Plugin {
  return {
    name: 'version-file',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: appVersion }),
      })
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), versionFilePlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router', '@tanstack/react-query'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/messaging'],
          'vendor-ffmpeg': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          'vendor-charts': ['recharts'],
          'vendor-ui': [
            '@radix-ui/react-alert-dialog', '@radix-ui/react-avatar',
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label', '@radix-ui/react-popover',
            '@radix-ui/react-select', '@radix-ui/react-separator',
            '@radix-ui/react-slot', '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip', 'cmdk', 'lucide-react',
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils': [
            'axios', 'date-fns', 'sonner', 'zustand', 'next-themes',
            'class-variance-authority', 'clsx', 'tailwind-merge', '@dnd-kit/core',
          ],
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
