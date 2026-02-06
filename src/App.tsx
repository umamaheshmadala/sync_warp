import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { Toaster, toast } from 'react-hot-toast'
import React, { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { TextZoom } from '@capacitor/text-zoom'
import { asyncStorage } from './lib/asyncStorage'
import AppLayout from './components/layout/AppLayout'
import AppRouter from './router/Router'
import { ErrorBoundary } from './components/error'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useNotificationHandler } from './hooks/useNotificationHandler'
import { NotificationToast } from './components/NotificationToast'
import { CustomToast } from './components/ui/CustomToast'
import { useAuthStore } from './store/authStore'
import { OfflineBanner } from './components/ui/OfflineBanner'
import DevMenu from './components/DevMenu'
import { useUpdateOnlineStatus } from './hooks/useUpdateOnlineStatus'
import { usePresence } from './hooks/usePresence'
import { useRealtimeFriends } from './hooks/friends/useRealtimeFriends'
import { AppDataPrefetcher } from './components/AppDataPrefetcher'
import { realtimeService } from './services/realtimeService'
import { spamConfigService } from './services/SpamConfigService'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { DeepLinkModalProvider } from './components/providers/DeepLinkModalProvider'
import { ShareClickTracker } from './components/analytics/ShareClickTracker'

import { queryClient } from './lib/react-query'

// Create persister for IndexedDB (Async Storage)
// This replaces the old localStorage (Sync) persister to remove the 5MB limit
const persister = createAsyncStoragePersister({
  storage: asyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
})

// Component that needs Router context
function AppContent() {
  const user = useAuthStore(state => state.user)

  // Automatically register push notifications when user logs in
  const pushState = usePushNotifications(user?.id ?? null)

  // Track user's online status in database
  useUpdateOnlineStatus()

  // Track real-time presence via Supabase Realtime
  usePresence()

  // Track real-time friends via Supabase Realtime
  useRealtimeFriends()

  // Handle notification routing and foreground display (needs Router context)
  const { foregroundNotification, handleToastTap, handleToastDismiss } = useNotificationHandler()

  // Monitor push notification status
  useEffect(() => {
    // Initialize RealtimeService for robust mobile handling
    const initRealtime = async () => {
      try {
        await realtimeService.init();
        await spamConfigService.initialize(); // [Story 8.7.5] Initialize spam config
      } catch (err) {
        console.error('Failed to init services', err);
      }
    };
    initRealtime();

    if (!Capacitor.isNativePlatform()) return

    // Cap Text Zoom to 1.2x to prevent UI clutter
    TextZoom.getPreferred().then((value) => {
      console.log('📱 System Text Zoom:', value.value);
      const CAPPED_ZOOM = 1.2;
      if (value.value > CAPPED_ZOOM) {
        console.log(`🔍 Capping Text Zoom from ${value.value} to ${CAPPED_ZOOM}`);
        TextZoom.set({ value: CAPPED_ZOOM });
      } else {
        // Ensure we respect user preference if it's within bounds (or reset if they lowered it)
        TextZoom.set({ value: value.value });
      }
    }).catch(err => console.error('Failed to set text zoom', err));

    if (pushState.isRegistered && pushState.syncedToBackend) {
      console.log('✅ Push notifications fully enabled')
    } else if (pushState.isRegistered && !pushState.syncedToBackend) {
      console.warn('⚠️ Push token saved locally but not synced to backend')
    } else if (pushState.error) {
      console.error('❌ Push notification error:', pushState.error)
    }
  }, [pushState.isRegistered, pushState.syncedToBackend, pushState.error])

  return (
    <>
      <OfflineBanner />
      <FavoritesProvider>
        <AppLayout>
          <AppDataPrefetcher />
          <AppRouter />
        </AppLayout>
        <DeepLinkModalProvider />
        <ShareClickTracker />
      </FavoritesProvider>
      <DevMenu />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          // Remove default styles as CustomToast handles them
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        }}
      >
        {(t) => <CustomToast t={t} />}
      </Toaster>
      {/* Show in-app notification toast for foreground notifications */}
      {foregroundNotification && (
        <NotificationToast
          title={foregroundNotification.title}
          body={foregroundNotification.body}
          data={foregroundNotification.data}
          onTap={handleToastTap}
          onDismiss={handleToastDismiss}
        />
      )}
    </>
  )
}

// Main App component
function App() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isStorageMigrated, setIsStorageMigrated] = useState(false)

  // Wait for Zustand to hydrate from storage
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
      console.log('[App] State hydrated from storage')
    })

    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true)
    }

    return unsubscribe
  }, [])

  // Migration from localStorage to IndexedDB
  useEffect(() => {
    const migrateCache = async () => {
      const key = 'REACT_QUERY_OFFLINE_CACHE'
      const oldData = window.localStorage.getItem(key)

      if (oldData) {
        console.log('📦 Found legacy cache in localStorage. Migrating to IndexedDB...')
        try {
          await asyncStorage.setItem(key, oldData)
          window.localStorage.removeItem(key)
          console.log('✅ Migration to IndexedDB successful!')
          toast.success('App upgraded to high-capacity storage', { icon: '🚀' })
        } catch (e) {
          console.error('❌ Storage migration failed:', e)
        }
      }
      setIsStorageMigrated(true)
    }

    migrateCache()
  }, [])

  // Don't render until both state and storage are ready
  // This ensures we don't start a fresh cache if we have one waiting to be migrated
  if (!isStorageMigrated) {
    return null // or a splash screen
  }

  return (
    <ErrorBoundary level="page">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
        onSuccess={() => {
          // Hydration complete - cached data is now available
          console.log('[React Query] Cache hydrated from Async Storage')
        }}
      >
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AppContent />
        </Router>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  )
}

export default App