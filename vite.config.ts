import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWA is temporarily disabled to debug build issues
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external connections (for mobile testing)
    open: true,
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
    minify: 'terser', // Use terser for better control over minification
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
      mangle: {
        keep_classnames: true,
        keep_fnames: true, // Keep function names to prevent mangling
      },
    },
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
