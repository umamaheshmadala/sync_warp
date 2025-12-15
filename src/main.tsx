import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Custom Typography System
// Inter - Body Copy
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// Outfit - Headings
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';

// Mount React immediately - don't wait for anything
const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
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
