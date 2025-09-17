// src/components/SignUpDebug.tsx
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export default function SignUpDebug() {
  const { signUp, loading, user } = useAuthStore()
  const [testEmail, setTestEmail] = useState('test@example.com')
  const [testPassword, setTestPassword] = useState('TestPassword123!')
  const [testName, setTestName] = useState('Test User')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `${timestamp}: ${message}`])
    console.log(`SignUpDebug: ${message}`)
  }

  useEffect(() => {
    addLog(`Component mounted. Loading: ${loading}, User: ${user ? 'present' : 'null'}`)
  }, [])

  useEffect(() => {
    addLog(`Auth loading state changed: ${loading}`)
  }, [loading])

  useEffect(() => {
    if (user) {
      addLog(`User authenticated: ${user.email}`)
      setSuccess('User successfully signed up!')
    }
  }, [user])

  const handleTestSignup = async () => {
    addLog('Starting signup test...')
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      addLog(`Local loading state: ${isSubmitting}, Store loading state: ${loading}`)
      
      await signUp(testEmail, testPassword, {
        full_name: testName
      })
      
      addLog('Signup completed successfully')
      setSuccess('Account created successfully!')
      
    } catch (err: any) {
      addLog(`Signup failed: ${err.message}`)
      setError(err.message || 'Signup failed')
    } finally {
      setIsSubmitting(false)
      addLog('Signup process finished, local loading state reset')
    }
  }

  const resetTest = () => {
    setError('')
    setSuccess('')
    setLogs([])
    addLog('Test reset')
  }

  const testLoadingStates = () => {
    addLog(`Current loading states - Local: ${isSubmitting}, Store: ${loading}`)
    addLog(`Button should be ${(isSubmitting || loading) ? 'disabled' : 'enabled'}`)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">SignUp Debug Console</h2>
        
        {/* Test Form */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Test SignUp</h3>
          
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="test@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TestPassword123!"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Test User"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleTestSignup}
              disabled={isSubmitting || loading}
              className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                (isSubmitting || loading)
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {(isSubmitting || loading) ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </div>
              ) : (
                'Test SignUp'
              )}
            </button>
            
            <button
              onClick={testLoadingStates}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Check Loading States
            </button>
            
            <button
              onClick={resetTest}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Reset Test
            </button>
          </div>
        </div>
        
        {/* Status Display */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Current Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Local Loading (isSubmitting):</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${isSubmitting ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                {isSubmitting ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <strong>Store Loading:</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${loading ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                {loading ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <strong>Button State:</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${(isSubmitting || loading) ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                {(isSubmitting || loading) ? 'disabled' : 'enabled'}
              </span>
            </div>
            <div>
              <strong>User:</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${user ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                {user ? `${user.email}` : 'not signed in'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Results */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md">
            <strong>Success:</strong> {success}
          </div>
        )}
        
        {/* Debug Logs */}
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Debug Logs</h3>
          <div className="bg-black text-green-400 p-4 rounded-md text-sm font-mono max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div>No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Environment Info */}
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Environment Info</h3>
          <div className="text-sm space-y-1">
            <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</div>
            <div><strong>Supabase Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'Not set'}</div>
            <div><strong>Environment:</strong> {import.meta.env.VITE_APP_ENV || 'Not set'}</div>
            <div><strong>Mode:</strong> {import.meta.env.MODE}</div>
          </div>
        </div>
      </div>
    </div>
  )
}