import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Ensure relative paths for Capacitor
  define: {
    '__BUILD_TIMESTAMP__': JSON.stringify(new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })),
  },
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   injectRegister: 'auto',
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
    //     maximumFileSizeToCacheInBytes: 3000000, // 3MB
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'supabase-api',
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 60 * 24 // 24 hours
    //           },
    //           cacheableResponse: {
    //             statuses: [0, 200]
    //           }
    //         }
    //       }
    //     ]
    //   },
    //   manifest: {
    //     name: 'SynC - Connect, Collaborate, Create',
    //     short_name: 'SynC',
    //     description: 'Discover local businesses and share amazing deals',
    //     theme_color: '#6366f1',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'zustand-vendor': ['zustand']
        },
        // Preserve module names to prevent mangling
        preserveModules: false,
        // Ensure exports are preserved
        exports: 'named'
      }
    }
  }
})