import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['mosque-logo.png', 'mosque-logo.jpeg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'favicon.ico'],
        manifest: {
          name: 'مجمع الغزاوي القرآني',
          short_name: 'مجمع الغزاوي',
          description: 'نظام إدارة مجمع الغزاوي القرآني وحلقات التحفيظ والمخرجات التعليمية والتربوية (Quranic Centers Management System)',
          theme_color: '#065f46',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/#/t/ghazawi',
          scope: '/',
          lang: 'ar',
          dir: 'rtl',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // New SW activates immediately and seizes control — replaces stale
          // workers that keep intercepting requests with broken fetch handlers
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg,webp,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          // Navigation fallback so offline/failed fetches return the app shell
          // instead of an uncaught "Failed to fetch" rejection
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/manifest\.webmanifest/, /^\/uploads\//, /\.run\.app$/, /ais-dev/, /ais-pre/],
          cleanupOutdatedCaches: true,
          // API and Google preview domains must never be incorrectly cached
          runtimeCaching: [
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.run\.app\/.*/i,
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('quranData')) {
              return 'quran-json';
            }
            if (id.includes('node_modules')) {
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image') || id.includes('print-js')) return 'vendor-export';
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('react') || id.includes('scheduler') || id.includes('@remix-run')) return 'vendor-react';
              return 'vendor-common';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
