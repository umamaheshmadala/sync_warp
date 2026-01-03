import React, { useState, useEffect } from 'react'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import './SyncStatusIndicator.css'

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

export interface SyncStatusIndicatorProps {
  syncState?: SyncState
  queuedItemsCount?: number
  lastSyncTime?: Date | null
  compact?: boolean
  className?: string
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncState: externalSyncState,
  queuedItemsCount = 0,
  lastSyncTime = null,
  compact = false,
  className = ''
}) => {
  const { isOnline } = useNetworkStatus()
  const [internalSyncState, setInternalSyncState] = useState<SyncState>('idle')
  const [showDetail, setShowDetail] = useState(false)

  // Determine effective sync state
  const syncState = externalSyncState ?? (isOnline ? internalSyncState : 'offline')

  // Auto-detect syncing when coming online with queued items
  useEffect(() => {
    if (isOnline && queuedItemsCount > 0 && !externalSyncState) {
      setInternalSyncState('syncing')
      
      // Simulate sync completion after 2 seconds if no external state
      const timer = setTimeout(() => {
        setInternalSyncState('synced')
        setTimeout(() => setInternalSyncState('idle'), 3000)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isOnline, queuedItemsCount, externalSyncState])

  const getIcon = () => {
    switch (syncState) {
      case 'syncing':
        return <span className="sync-status-icon sync-status-icon--syncing">🔄</span>
      case 'synced':
        return <span className="sync-status-icon">✓</span>
      case 'error':
        return <span className="sync-status-icon">⚠️</span>
      case 'offline':
        return <span className="sync-status-icon">📶</span>
      default:
        return <span className="sync-status-icon sync-status-icon--idle">●</span>
    }
  }

  const getLabel = () => {
    switch (syncState) {
      case 'syncing':
        return queuedItemsCount > 0 
          ? `Syncing ${queuedItemsCount} item${queuedItemsCount === 1 ? '' : 's'}...` 
          : 'Syncing...'
      case 'synced':
        return 'All changes saved'
      case 'error':
        return 'Sync failed'
      case 'offline':
        return queuedItemsCount > 0 
          ? `${queuedItemsCount} pending` 
          : 'Offline'
      default:
        return 'Saved'
    }
  }

  const getStatusColor = () => {
    switch (syncState) {
      case 'syncing':
        return 'sync-status--syncing'
      case 'synced':
        return 'sync-status--synced'
      case 'error':
        return 'sync-status--error'
      case 'offline':
        return 'sync-status--offline'
      default:
        return 'sync-status--idle'
    }
  }

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return null
    
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return lastSyncTime.toLocaleDateString()
  }

  if (compact) {
    return (
      <div 
        className={`sync-status sync-status--compact ${getStatusColor()} ${className}`}
        title={getLabel()}
      >
        {getIcon()}
      </div>
    )
  }

  return (
    <div 
      className={`sync-status ${getStatusColor()} ${className}`}
      onClick={() => setShowDetail(!showDetail)}
      role="button"
      tabIndex={0}
      aria-label={`Sync status: ${getLabel()}`}
    >
      <div className="sync-status__main">
        {getIcon()}
        <span className="sync-status__label">{getLabel()}</span>
      </div>
      
      {showDetail && lastSyncTime && (
        <div className="sync-status__detail">
          Last synced: {formatLastSyncTime()}
        </div>
      )}
    </div>
  )
}
