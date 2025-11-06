import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import search service
import searchService from './services/searchService'

// Migrate to secure storage on app startup
import { migrateToSecureStorage } from './lib/storageMigration'
migrateToSecureStorage().catch(console.error)

// Make search service available globally during development
if (import.meta.env.DEV) {
  (window as any).searchService = searchService;
  // Also add simple search service for testing
  const { simpleSearchService } = await import('./services/simpleSearchService');
  (window as any).simpleSearchService = simpleSearchService;
  // Add Supabase client for debugging
  const { supabase } = await import('./lib/supabase');
  (window as any).supabase = supabase;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
