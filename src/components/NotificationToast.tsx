import React, { useState, useEffect } from 'react'
import { NotificationRouter, NotificationData } from '../services/notificationRouter'
import './NotificationToast.css'

export interface NotificationToastProps {
  title: string
  body: string
  data: NotificationData
  onDismiss: () => void
  onTap: () => void
}

/**
 * NotificationToast
 * 
 * Displays an in-app toast notification when notifications are received
 * while the app is in the foreground.
 * 
 * Features:
 * - Auto-dismisses after 5 seconds
 * - Tappable to navigate to destination
 * - Close button for manual dismissal
 * - Animated slide-in from right
 * - Type-specific styling
 */
export const NotificationToast: React.FC<NotificationToastProps> = ({
  title,
  body,
  data,
  onDismiss,
  onTap
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    console.log('[NotificationToast] Dismissing...')
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300) // Wait for exit animation
  }

  const handleTap = () => {
    console.log('[NotificationToast] Tapped! Triggering navigation immediately.')
    onTap() // Trigger navigation immediately
    
    setIsExiting(true)
    setTimeout(() => {
      console.log('[NotificationToast] Dismissing after animation')
      setIsVisible(false)
      onDismiss()
    }, 200)
  }

  if (!isVisible) return null

  const typeLabel = NotificationRouter.getTypeLabel(data.type)
  const typeColor = NotificationRouter.getTypeColor(data.type)

  return (
    <div 
      className={`notification-toast ${isExiting ? 'notification-toast--exiting' : ''}`}
      onClick={handleTap}
      role="alert"
      aria-live="polite"
    >
      <div className="notification-toast__content">
        <div className="notification-toast__header">
          <span 
            className="notification-toast__type"
            style={{ color: typeColor }}
          >
            {typeLabel}
          </span>
          <button 
            className="notification-toast__close"
            onClick={(e) => {
              e.stopPropagation()
              handleDismiss()
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
        
        <div className="notification-toast__title">{title}</div>
        {body && <div className="notification-toast__body">{body}</div>}
        
        <div className="notification-toast__tap-hint">
          Tap to view
        </div>
      </div>
    </div>
  )
}
