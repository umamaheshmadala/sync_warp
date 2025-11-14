import React, { useState, useEffect } from 'react'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import './OfflineIndicator.css'

export interface OfflineIndicatorProps {
  syncQueueCount?: number
  showConnectionType?: boolean
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  syncQueueCount = 0,
  showConnectionType = false 
}) => {
  const { isOnline, connectionType } = useNetworkStatus()
  const [isVisible, setIsVisible] = useState(!isOnline)
  const [justCameOnline, setJustCameOnline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      // Show immediately when going offline
      setIsVisible(true)
      setJustCameOnline(false)
    } else {
      // Show "Back online" message briefly, then hide
      setJustCameOnline(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setJustCameOnline(false)
      }, 3000) // Show for 3 seconds

      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (!isVisible) return null

  const getMessage = () => {
    if (justCameOnline) {
      return '✅ Back online! Syncing your changes...'
    }
    
    if (syncQueueCount > 0) {
      return `📶 You're offline • ${syncQueueCount} change${syncQueueCount === 1 ? '' : 's'} waiting to sync`
    }
    
    return "📶 You're offline • Changes will sync when reconnected"
  }

  const getConnectionInfo = () => {
    if (!showConnectionType || justCameOnline) return null
    
    return (
      <div className="offline-indicator__connection-type">
        {connectionType === 'wifi' && '📡 No Wi-Fi'}
        {connectionType === 'cellular' && '📱 No cellular data'}
        {connectionType === 'none' && '🔌 No connection'}
      </div>
    )
  }

  return (
    <div 
      className={`offline-indicator ${justCameOnline ? 'online' : 'offline'}`}
      role="status"
      aria-live="polite"
    >
      <div className="offline-indicator__content">
        <div className="offline-indicator__message">
          {getMessage()}
        </div>
        {getConnectionInfo()}
      </div>
    </div>
  )
}
