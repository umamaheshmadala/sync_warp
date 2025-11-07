import React, { useState, useEffect } from 'react'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import toast from 'react-hot-toast'
import './OfflineBanner.css'

export interface OfflineBannerProps {
  syncQueueCount?: number
  showConnectionType?: boolean
  onRetry?: () => void
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  syncQueueCount = 0,
  showConnectionType = true,
  onRetry
}) => {
  const { isOnline, connectionType } = useNetworkStatus()
  const [isVisible, setIsVisible] = useState(!isOnline)
  const [justCameOnline, setJustCameOnline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      // Going offline
      setIsVisible(true)
      setJustCameOnline(false)
      if (!wasOffline) {
        setWasOffline(true)
        toast.error('📶 You are offline. Changes will sync when reconnected.', {
          duration: 4000,
          id: 'offline-notification'
        })
      }
    } else if (wasOffline) {
      // Coming back online
      setJustCameOnline(true)
      toast.success('✅ Back online! Syncing your changes...', {
        duration: 3000,
        id: 'online-notification'
      })
      
      const timer = setTimeout(() => {
        setIsVisible(false)
        setJustCameOnline(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      // Default retry: reload the page
      window.location.reload()
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  if (!isVisible) return null

  const getMessage = () => {
    if (justCameOnline) {
      return (
        <div className="offline-banner__message">
          <span className="offline-banner__icon">✅</span>
          <span>Back online! Syncing your changes...</span>
        </div>
      )
    }
    
    if (syncQueueCount > 0) {
      return (
        <div className="offline-banner__message">
          <span className="offline-banner__icon">📶</span>
          <span>You are offline • {syncQueueCount} change{syncQueueCount === 1 ? '' : 's'} waiting to sync</span>
        </div>
      )
    }
    
    return (
      <div className="offline-banner__message">
        <span className="offline-banner__icon">📶</span>
        <span>You are offline • Changes will sync when reconnected</span>
      </div>
    )
  }

  const getConnectionInfo = () => {
    if (!showConnectionType || justCameOnline) return null
    
    const icons = {
      wifi: '📡',
      cellular: '📱',
      none: '🔌',
      unknown: '🌐'
    }

    const labels = {
      wifi: 'No Wi-Fi',
      cellular: 'No cellular data',
      none: 'No connection',
      unknown: 'Connection unavailable'
    }
    
    return (
      <div className="offline-banner__connection-type">
        {icons[connectionType]} {labels[connectionType]}
      </div>
    )
  }

  return (
    <div 
      className={`offline-banner ${justCameOnline ? 'online' : 'offline'}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="offline-banner__content">
        <div className="offline-banner__info">
          {getMessage()}
          {getConnectionInfo()}
        </div>
        
        {!justCameOnline && (
          <div className="offline-banner__actions">
            <button 
              className="offline-banner__button offline-banner__button--secondary"
              onClick={handleRetry}
              aria-label="Retry connection"
            >
              🔄 Retry
            </button>
            <button 
              className="offline-banner__button offline-banner__button--primary"
              onClick={handleRefresh}
              aria-label="Refresh page"
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
