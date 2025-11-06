import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import AppLayout from './components/layout/AppLayout'
import AppRouter from './router/Router'
import { AuthDebugPanel } from './router/ProtectedRoute'
import { ErrorBoundary } from './components/error'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useAuthStore } from './store/authStore'

const queryClient = new QueryClient()

function App() {
  const user = useAuthStore(state => state.user)
  
  // Automatically register push notifications when user logs in
  const pushState = usePushNotifications(user?.id ?? null)

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
    <ErrorBoundary level="page">
      <QueryClientProvider client={queryClient}>
        <Router 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AppLayout>
            <AppRouter />
            <AuthDebugPanel />
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
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App