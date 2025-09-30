import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import AppRouter from './router/Router'
import { AuthDebugPanel } from './router/ProtectedRoute'
import { ErrorBoundary } from './components/error'

const queryClient = new QueryClient()

function App() {
  return (
    <ErrorBoundary level="page">
      <QueryClientProvider client={queryClient}>
        <Router 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Layout>
            <AppRouter />
            <AuthDebugPanel />
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
          </Layout>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App