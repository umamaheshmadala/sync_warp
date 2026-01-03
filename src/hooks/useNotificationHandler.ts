import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { useQueryClient } from '@tanstack/react-query'
import { NotificationRouter, NotificationData } from '../services/notificationRouter'
import { messagingService } from '../services/messagingService'

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
 * - [Story 10.2] Trigger background data prefresh on receipt
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
  const queryClient = useQueryClient()
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
      async (notification: PushNotificationSchema) => {
        console.log('[useNotificationHandler] Received in foreground:', notification)

        try {
          const data = notification.data as NotificationData

          // [Story 10.2] Background Data Sync / Prefetching
          // Trigger a fetch immediately when notification arrives
          if (data.conversation_id) {
            console.log(`⚡ [useNotificationHandler] Prefetching messages for ${data.conversation_id}`)
            queryClient.prefetchQuery({
              queryKey: ['messages', data.conversation_id],
              queryFn: () => messagingService.fetchMessages(data.conversation_id, 20),
              staleTime: 1000 * 30 // 30s freshness
            }).catch(e => console.error('Prefetch failed:', e))
          }

          // STRICT SUPPRESSION: If it's a message, NEVER show a foreground toast
          // We rely on useRealtimeNotifications for message toasts to avoid duplicates
          const type = data.type as string
          const isMessage =
            type === 'message' ||
            type === 'new_message' ||
            type?.includes('message') ||
            !!data.conversationId ||
            !!data.conversation_id;

          if (isMessage) {
            console.log('[useNotificationHandler] Suppressing toast/alert for message notification (handled by Realtime)', { type: data.type, id: data.conversation_id })
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
  }, [navigate, queryClient])

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
