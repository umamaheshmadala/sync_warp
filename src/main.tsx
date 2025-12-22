import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Custom Typography System - using system fonts as per new philosophy

// Mount React immediately - don't wait for anything
const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Unregister any existing service workers to prevent stale asset caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      console.log('Unregistering Service Worker:', registration);
      registration.unregister();
    }
  });
}

// Run initialization tasks AFTER React has mounted
Promise.all([
  // Migrate to secure storage
  import('./lib/storageMigration').then(({ migrateToSecureStorage }) =>
    migrateToSecureStorage().catch(console.error)
  ),

  // Setup dev tools (only in development)
  // Setup dev tools (only in development)
  /*
  import.meta.env.DEV ? (async () => {
    const searchService = (await import('./services/searchService')).default
    const { simpleSearchService } = await import('./services/simpleSearchService')
    const { supabase } = await import('./lib/supabase')

      ; (window as any).searchService = searchService
      ; (window as any).simpleSearchService = simpleSearchService
      ; (window as any).supabase = supabase
  })() : Promise.resolve()
  */
]).catch(console.error)
