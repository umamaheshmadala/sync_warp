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
    // VitePWA({...}) 
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
}))