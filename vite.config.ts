import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Custom plugin to provide live build timestamp
const buildInfoPlugin = () => {
  const virtualModuleId = 'virtual:build-info'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vite-plugin-build-info',
    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id: string) {
      if (id === resolvedVirtualModuleId) {
        const now = new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        return `export const timestamp = ${JSON.stringify(now)}`
      }
    },
    handleHotUpdate({ server, modules }: any) {
      // Find the virtual module in the graph
      const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
      if (mod) {
        // Invalidate it so 'load' is called again
        server.moduleGraph.invalidateModule(mod)
        // Add it to the list of updated modules so HMR propagates to importers
        return [...modules, mod]
      }
      return modules
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use absolute paths for web (Netlify), relative for Capacitor mobile builds
  base: mode === 'capacitor' ? './' : '/',
  plugins: [
    react(),
    buildInfoPlugin(),
    ...(mode !== 'capacitor' ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'favicon.ico'],
      workbox: {
        // Only precache the app shell — not dynamic API data
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Don't precache chunks larger than 1000KB (matches chunkSizeWarningLimit)
        maximumFileSizeToCacheInBytes: 1000 * 1024,
        // Runtime caching for API responses
        runtimeCaching: [
          {
            // Cache Supabase Storage images for 1 year
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-media',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache wsrv.nl proxy images
            urlPattern: /^https:\/\/wsrv\.nl\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wsrv-media',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Network-first for API calls (Supabase REST)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      },
      manifest: {
        name: 'SynC - Connect, Collaborate, Create',
        short_name: 'SynC',
        description: 'Connect with local businesses, discover offers, and collaborate with your community',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external connections (for mobile testing)
    open: false, // Disabled - manually open in Antigravity browser agent
    hmr: {
      // Prevent HMR from triggering on tab focus changes
      overlay: false
    },
    watch: {
      ignored: ['**/android/**', '**/ios/**']
    },
    fs: {
      deny: ['**/.git/**', '**/android/**', '**/ios/**']
    }
  },
  // Optimize for better development experience
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  // Production build optimization
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message.includes('is dynamically imported by')) {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }
          if (id.includes('node_modules/zustand')) {
            return 'zustand-vendor';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'recharts-vendor';
          }
          if (id.includes('node_modules/emoji-picker-react')) {
            return 'emoji-vendor';
          }
          if (id.includes('node_modules/@dnd-kit')) {
            return 'dnd-vendor';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-vendor';
          }
        },
        // Preserve module names to prevent mangling
        preserveModules: false,
        // Ensure exports are preserved
        exports: 'named'
      }
    }
  }
}))