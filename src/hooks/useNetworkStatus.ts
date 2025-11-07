import { useState, useEffect } from 'react'
import { Network, ConnectionStatus } from '@capacitor/network'
import { Capacitor } from '@capacitor/core'

export interface NetworkStatus {
  isOnline: boolean
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
  isConnected: boolean
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    connectionType: 'unknown',
    isConnected: true
  })

  useEffect(() => {
    // Get initial network status
    const getInitialStatus = async () => {
      try {
        const status = await Network.getStatus()
        updateNetworkStatus(status)
      } catch (error) {
        console.error('[useNetworkStatus] Error getting initial status:', error)
        // Fallback to navigator.onLine on web
        if (typeof navigator !== 'undefined') {
          setNetworkStatus({
            isOnline: navigator.onLine,
            connectionType: navigator.onLine ? 'unknown' : 'none',
            isConnected: navigator.onLine
          })
        }
      }
    }

    // Update network status helper
    const updateNetworkStatus = (status: ConnectionStatus) => {
      const isOnline = status.connected
      const connectionType = getConnectionType(status.connectionType)
      
      setNetworkStatus({
        isOnline,
        connectionType,
        isConnected: status.connected
      })

      console.log(`[useNetworkStatus] ${isOnline ? 'Online' : 'Offline'} (${connectionType})`)
    }

    // Map Capacitor connection types to our simplified types
    const getConnectionType = (type: string): 'wifi' | 'cellular' | 'none' | 'unknown' => {
      switch (type.toLowerCase()) {
        case 'wifi':
          return 'wifi'
        case 'cellular':
        case '3g':
        case '4g':
        case '5g':
          return 'cellular'
        case 'none':
          return 'none'
        default:
          return 'unknown'
      }
    }

    // Set up network status listener
    const setupListener = async () => {
      try {
        const listener = await Network.addListener('networkStatusChange', (status) => {
          updateNetworkStatus(status)
        })

        // Cleanup function
        return () => {
          listener.remove()
        }
      } catch (error) {
        console.error('[useNetworkStatus] Error setting up listener:', error)
        
        // Fallback to browser events on web
        if (typeof window !== 'undefined') {
          const handleOnline = () => {
            setNetworkStatus(prev => ({
              ...prev,
              isOnline: true,
              isConnected: true,
              connectionType: 'unknown'
            }))
            console.log('[useNetworkStatus] Online (unknown)')
          }

          const handleOffline = () => {
            setNetworkStatus(prev => ({
              ...prev,
              isOnline: false,
              isConnected: false,
              connectionType: 'none'
            }))
            console.log('[useNetworkStatus] Offline (none)')
          }

          window.addEventListener('online', handleOnline)
          window.addEventListener('offline', handleOffline)

          return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
          }
        }
      }
    }

    // Initialize
    getInitialStatus()
    const listenerCleanup = setupListener()

    // Cleanup on unmount
    return () => {
      listenerCleanup.then(cleanup => cleanup?.())
    }
  }, [])

  return networkStatus
}
