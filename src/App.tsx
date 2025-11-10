import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import AppLayout from './components/layout/AppLayout'
import AppRouter from './router/Router'
import { ErrorBoundary } from './components/error'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useNotificationHandler } from './hooks/useNotificationHandler'
import { NotificationToast } from './components/NotificationToast'
import { useAuthStore } from './store/authStore'
import { OfflineBanner } from './components/ui/OfflineBanner'

const queryClient = new QueryClient()

// Component that needs Router context
function AppContent() {
  const user = useAuthStore(state => state.user)
  
  // Automatically register push notifications when user logs in
  const pushState = usePushNotifications(user?.id ?? null)

  // Handle notification routing and foreground display (needs Router context)
  const { foregroundNotification, handleToastTap, handleToastDismiss } = useNotificationHandler()

  // Monitor push notification status
  useEffect(() => {
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

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#666'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '10px'
          }}>Loading...</div>
          <div style={{ fontSize: '14px' }}>Restoring your session</div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary level="page">
      <QueryClientProvider client={queryClient}>
        <Router 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AppContent />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App