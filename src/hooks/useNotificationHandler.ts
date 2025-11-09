import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { NotificationRouter, NotificationData } from '../services/notificationRouter'

interface ForegroundNotification {
  title: string
  body: string
  data: NotificationData
}

/**
 * useNotificationHandler
 * 
 * Handles push notification actions and routing.
 * 
 * Features:
 * - Displays in-app toast for foreground notifications
 * - Routes to appropriate screen when notification is tapped
 * - Works for both foreground and background/killed states
 * - Validates notification data structure
 * 
 * Usage:
 * ```tsx
 * const { foregroundNotification, handleToastTap, handleToastDismiss } = useNotificationHandler()
 * 
 * {foregroundNotification && (
 *   <NotificationToast
 *     {...foregroundNotification}
 *     onTap={handleToastTap}
 *     onDismiss={handleToastDismiss}
 *   />
 * )}
 * ```
 */
export const useNotificationHandler = () => {
  const navigate = useNavigate()
  const [foregroundNotification, setForegroundNotification] = useState<ForegroundNotification | null>(null)

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[useNotificationHandler] Skipping - not on native platform')
      return
    }

    console.log('[useNotificationHandler] Setting up notification handlers')

    // Handle notifications received while app is in foreground
    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[useNotificationHandler] Received in foreground:', notification)
        
        try {
          const data = notification.data as NotificationData
          
          // Validate notification data
          if (!NotificationRouter.isValid(data)) {
            console.warn('[useNotificationHandler] Invalid notification data:', data)
            return
          }
          
          // Show in-app toast
          setForegroundNotification({
            title: notification.title || 'Notification',
            body: notification.body || '',
            data
          })
        } catch (error) {
          console.error('[useNotificationHandler] Error processing foreground notification:', error)
        }
      }
    )

    // Handle notification taps (background/killed state)
    const notificationTappedListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('[useNotificationHandler] Notification tapped:', action)
        
        try {
          const data = action.notification.data as NotificationData
          
          // Validate notification data
          if (!NotificationRouter.isValid(data)) {
            console.warn('[useNotificationHandler] Invalid notification data:', data)
            return
          }
          
          // Navigate to appropriate screen
          NotificationRouter.route(data, navigate)
        } catch (error) {
          console.error('[useNotificationHandler] Error handling notification tap:', error)
        }
      }
    )

    // Cleanup listeners on unmount
    return () => {
      notificationReceivedListener.remove()
      notificationTappedListener.remove()
      console.log('[useNotificationHandler] Cleanup - removed listeners')
    }
  }, [navigate])

  /**
   * Handle tap on foreground notification toast
   * Routes to the appropriate screen and dismisses the toast
   */
  const handleToastTap = useCallback(() => {
    if (foregroundNotification) {
      console.log('[useNotificationHandler] Toast tapped, routing to:', foregroundNotification.data.type)
      NotificationRouter.route(foregroundNotification.data, navigate)
    }
  }, [foregroundNotification, navigate])

  /**
   * Dismiss the foreground notification toast
   */
  const handleToastDismiss = useCallback(() => {
    console.log('[useNotificationHandler] Toast dismissed')
    setForegroundNotification(null)
  }, [])

  return {
    foregroundNotification,
    handleToastTap,
    handleToastDismiss
  }
}
