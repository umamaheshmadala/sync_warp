import React from 'react'
import { useOfflineBusinessStore } from '../store/offlineBusinessStore'

export const CacheStatus: React.FC = () => {
  const { lastSyncTimestamp, isOfflineMode } = useOfflineBusinessStore()

  if (!isOfflineMode && !lastSyncTimestamp) {
    return null // No status if online and never synced
  }

  const getTimeSinceSync = () => {
    if (!lastSyncTimestamp) return 'Never'
    
    const minutes = Math.floor((Date.now() - lastSyncTimestamp) / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div style={{
      padding: '8px 16px',
      backgroundColor: isOfflineMode ? '#FFF3CD' : '#D1ECF1',
      borderBottom: '1px solid ' + (isOfflineMode ? '#FFC107' : '#0DCAF0'),
      fontSize: '14px',
      color: '#333',
      textAlign: 'center'
    }}>
      {isOfflineMode ? (
        <>📦 Viewing cached data (last updated {getTimeSinceSync()})</>
      ) : (
        <>✅ Online - Data synced {getTimeSinceSync()}</>
      )}
    </div>
  )
}
