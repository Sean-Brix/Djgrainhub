import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',   // silently updates the SW when a new build is deployed
      includeAssets: [
        'icon.svg',
        'apple-touch-icon-180x180.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
      ],
      manifest: {
        name: 'DJ Grain Hub',
        short_name: 'GrainHub',
        description: 'Smart vending management for DJ Grain Hub kiosks',
        theme_color: '#217A51',
        background_color: '#217A51',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Enable service worker in `vite dev` so the install prompt fires locally
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        type: 'module',
      },
      workbox: {
        // Cache strategy: network-first for API, cache-first for static assets
        runtimeCaching: [
          {
            // API calls go to network first; fall back to cache on failure
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }, // 5 min
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts and CDN assets
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Proxy /api requests to the Express backend in development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Output directory — must match DIST_DIR in server/src/index.js
  // server resolves: path.join(__dirname, '..', '..', 'dist') → <repo>/dist
  build: {
    outDir: 'dist',
    emptyOutDir: true,   // wipe stale files before each build
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
