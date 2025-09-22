import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import AppRouter from './router/Router'
import { FriendIntegration } from './components/FriendIntegration'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <AppRouter />
          <FriendIntegration />
        </Layout>
      </Router>
    </QueryClientProvider>
  )
}

export default App