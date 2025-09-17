// src/components/AuthStoreTest.tsx
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function AuthStoreTest() {
  const { signUp, loading, user } = useAuthStore()
  const [status, setStatus] = useState('Initializing...')
  const [isTestRunning, setIsTestRunning] = useState(false)

  useEffect(() => {
    setStatus(`Store loaded. Loading: ${loading}, User: ${user ? 'present' : 'null'}`)
  }, [loading, user])

  const runTest = async () => {
    setIsTestRunning(true)
    setStatus('Starting signup test...')

    try {
      const testEmail = `test-${Date.now()}@example.com`
      setStatus(`Testing with email: ${testEmail}`)
      
      await signUp(testEmail, 'TestPassword123!', {
        full_name: 'Test User'
      })
      
      setStatus('✅ Signup successful!')
    } catch (error: any) {
      setStatus(`❌ Signup failed: ${error.message}`)
    } finally {
      setIsTestRunning(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">AuthStore Test</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Current Status:</h3>
          <p className="text-sm mt-2">{status}</p>
        </div>
        
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Store State:</h3>
          <ul className="text-sm space-y-1">
            <li>Loading: <span className={loading ? 'text-yellow-600' : 'text-green-600'}>{loading ? 'true' : 'false'}</span></li>
            <li>User: <span className={user ? 'text-green-600' : 'text-gray-600'}>{user ? user.email : 'null'}</span></li>
            <li>Test Running: <span className={isTestRunning ? 'text-yellow-600' : 'text-gray-600'}>{isTestRunning ? 'true' : 'false'}</span></li>
          </ul>
        </div>
        
        <button
          onClick={runTest}
          disabled={isTestRunning || loading}
          className={`w-full py-2 px-4 rounded font-medium ${
            (isTestRunning || loading)
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {(isTestRunning || loading) ? 'Testing...' : 'Run Signup Test'}
        </button>
      </div>
    </div>
  )
}