import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { NotificationRouter, NotificationData } from '../services/notificationRouter'
import { conversationManagementService } from '../services/conversationManagementService'

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
 * - Respects conversation mute settings
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
  const location = useLocation()
  const locationRef = useRef(location)
  const [foregroundNotification, setForegroundNotification] = useState<ForegroundNotification | null>(null)

  // Keep location ref updated
  useEffect(() => {
    locationRef.current = location
  }, [location])

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
      async (notification: PushNotificationSchema) => {
        console.log('[useNotificationHandler] Received in foreground:', notification)
        
        try {

          const data = notification.data as NotificationData
          
          // STRICT SUPPRESSION: If it's a message, NEVER show a foreground toast
          if (data.type === 'message' || data.type?.includes('message')) {
             console.log('[useNotificationHandler] Suppressing toast/alert for message notification (user preference)')
             return
          }
          
          // Validate notification data
          if (!NotificationRouter.isValid(data)) {
            console.warn('[useNotificationHandler] Invalid notification data:', data)
            return
          }
          
          // Show in-app toast for non-message notifications
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
      notificationReceivedListener.then(l => l.remove())
      notificationTappedListener.then(l => l.remove())
      console.log('[useNotificationHandler] Cleanup - removed listeners')
    }
  }, [navigate])

  /**
   * Handle tap on foreground notification toast
   * Routes to the appropriate screen and dismisses the toast
   */
  const handleToastTap = useCallback(() => {
    console.log('[useNotificationHandler] HandleToastTap called')
    if (foregroundNotification && foregroundNotification.data) {
      console.log('[useNotificationHandler] Routing to:', foregroundNotification.data.type, foregroundNotification.data)
      try {
        NotificationRouter.route(foregroundNotification.data, navigate)
      } catch (e) {
        console.error('[useNotificationHandler] Routing failed:', e)
      }
    } else {
      console.warn('[useNotificationHandler] Cannot route - foregroundNotification is null or missing data')
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
