import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Nexora — Your AI Companion',
        short_name: 'Nexora',
        description: 'Nexora (Nex) — your personal AI companion with device control capabilities',
        theme_color: '#080511',
        background_color: '#080511',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['productivity', 'utilities', 'ai'],
        share_target: {
          action: '/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB (Porcupine is ~3.5 MB)
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    // Allow Tauri to access dev server
    strictPort: true,
  },
  build: {
    // Tauri: prevent large vendor chunks from warning
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          porcupine: ['@picovoice/porcupine-web', '@picovoice/web-voice-processor'],
        },
      },
    },
  },
  // Tauri: prevent Vite from watching Tauri source files
  watch: {
    ignored: ['**/src-tauri/**'],
  },
})
