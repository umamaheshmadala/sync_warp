import React from 'react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export const NetworkStatusBadge: React.FC = () => {
  const { isOnline, connectionType } = useNetworkStatus()

  const getStatusIcon = () => {
    if (!isOnline) return '🔴'
    if (connectionType === 'wifi') return '📶'
    if (connectionType === 'cellular') return '📱'
    return '🌐'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (connectionType === 'wifi') return 'Wi-Fi'
    if (connectionType === 'cellular') return 'Cellular'
    return 'Online'
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '12px',
      backgroundColor: isOnline ? '#D4EDDA' : '#F8D7DA',
      color: isOnline ? '#155724' : '#721C24',
      fontSize: '12px',
      fontWeight: '500',
      gap: '6px'
    }}>
      <span>{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
    </div>
  )
}
