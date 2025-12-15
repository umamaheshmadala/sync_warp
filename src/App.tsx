import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { Toaster, toast } from 'react-hot-toast'
import React, { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import AppLayout from './components/layout/AppLayout'
import AppRouter from './router/Router'
import { ErrorBoundary } from './components/error'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useNotificationHandler } from './hooks/useNotificationHandler'
import { NotificationToast } from './components/NotificationToast'
import { useAuthStore } from './store/authStore'
import { OfflineBanner } from './components/ui/OfflineBanner'
import DevMenu from './components/DevMenu'
import { useUpdateOnlineStatus } from './hooks/useUpdateOnlineStatus'
import { usePresence } from './hooks/usePresence'
import { useRealtimeFriends } from './hooks/friends/useRealtimeFriends'
import { realtimeService } from './services/realtimeService'
import { spamConfigService } from './services/SpamConfigService'

// Configure React Query with stale-while-revalidate pattern
// Shows cached data immediately, then fetches fresh data in background
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 24 hours
      gcTime: 1000 * 60 * 60 * 24,

      // Consider data fresh for 30 minutes
      // Within this time, won't refetch at all (instant cache hit)
      staleTime: 1000 * 60 * 30,

      // When data becomes stale (after 30min), show cached version immediately
      // then refetch in background - this is the key setting!
      refetchOnMount: true,  // Refetch stale data on mount (but show cache first)

      // Disable refetch on window focus to prevent jarring updates
      refetchOnWindowFocus: false,

      // Refetch when reconnecting to network
      refetchOnReconnect: true,

      // Retry failed requests
      retry: 2,
    },
  },
})

// Create persister for localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

// Component that needs Router context
function AppContent() {
  const user = useAuthStore(state => state.user)

  // DEBUG: Verify build version
  React.useEffect(() => {
    console.log('🚀 APP VERSION: BUILD_TIMESTAMP_CHECK_001')
    toast.success('New Build Loaded: v001', { duration: 5000 })
  }, [])

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
      <AppLayout>
        <AppRouter />
      </AppLayout>
      <DevMenu />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
        }}
      />
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

  // Don't block on hydration - show app immediately with default state
  // Hydration will happen in background

  return (
    <ErrorBoundary level="page">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
        onSuccess={() => {
          // Hydration complete - cached data is now available
          console.log('[React Query] Cache hydrated from storage')
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