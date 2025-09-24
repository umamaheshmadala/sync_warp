import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import AppRouter from './router/Router'
import { FriendIntegration } from './components/FriendIntegration'
import { AuthDebugPanel } from './router/ProtectedRoute'
import RouterDebugger from './components/debug/RouterDebugger'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <RouterDebugger enabled={true} />
        <Layout>
          <AppRouter />
          <FriendIntegration />
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
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
              error: {
                duration: 5000,
                theme: {
                  primary: 'red',
                  secondary: 'black',
                },
              },
            }}
          />
        </Layout>
      </Router>
    </QueryClientProvider>
  )
}

export default App