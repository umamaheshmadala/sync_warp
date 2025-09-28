import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import AppRouter from './router/Router'
import { AuthDebugPanel } from './router/ProtectedRoute'
import RouterDebugger from './components/debug/RouterDebugger'
// import FavoritesDebug from './components/debug/FavoritesDebug';
import ComprehensiveFavoritesDebug from './components/debug/ComprehensiveFavoritesDebug';
import HeartIconTest from './components/debug/HeartIconTest';
import FavoritesDataDebug from './components/debug/FavoritesDataDebug';
// import AuthDebug from './components/AuthDebug'

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
        <RouterDebugger enabled={false} />
        <Layout>
          <AppRouter />
          <AuthDebugPanel />
          {/* {process.env.NODE_ENV === 'development' && <ComprehensiveFavoritesDebug />} */}
          {process.env.NODE_ENV === 'development' && <HeartIconTest />}
          {process.env.NODE_ENV === 'development' && <FavoritesDataDebug />}
          {/* {process.env.NODE_ENV === 'development' && <FavoritesDebug />} */}
          {/* {process.env.NODE_ENV === 'development' && <AuthDebug />} */}
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
  )
}

export default App