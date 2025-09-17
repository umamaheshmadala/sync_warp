import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import SignUp from './components/SignUp'
import SignUpDebug from './components/SignUpDebug'
import AuthStoreTest from './components/AuthStoreTest'
import Onboarding from './components/Onboarding'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/debug/signup" element={<SignUpDebug />} />
            <Route path="/debug/auth" element={<AuthStoreTest />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App