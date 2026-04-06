import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const isDev = mode === 'development'

  return {
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        strategies: 'generateSW',
        devOptions: {
          enabled: isDev,
          type: 'module',
        },
        includeAssets: [
          'favicon.ico',
          'verduleria.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'wide-1280x720.png',
          'narrow-540x720.png',
        ],
        manifest: {
          id: '/',
          name: 'Verduleria',
          short_name: 'Verduleria',
          description: 'Pedidos Verduleria',
          start_url: '/?source=pwa',
          scope: '/',
          display: 'standalone',
          theme_color: '#059669',
          background_color: '#0f172a',
          lang: 'es',
          screenshots: [
            {
              src: '/wide-1280x720.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Pantalla principal',
            },
            {
              src: '/narrow-540x720.png',
              sizes: '540x720',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Login',
            },
          ],
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^${escapeRegExp(apiBaseUrl)}/.*`),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
