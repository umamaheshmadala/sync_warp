import { useCallback } from 'react'
import { useMessagingStore } from '../store/messagingStore'
import { useAuthStore } from '../store/authStore'
import { messagingService } from '../services/messagingService'
import { offlineQueueService } from '../services/offlineQueueService'
import { triggerPushNotification } from '../services/pushNotificationSender'
import { useNetworkStatus } from './useNetworkStatus'
import { toast } from 'react-hot-toast'
import type { SendMessageParams, Message } from '../types/messaging'
import * as blockService from '../services/blockService'

/**
 * Hook to send messages with optimistic updates, loading state, and error handling
 * 
 * Features (Story 8.2.7):
 * - Optimistic UI updates (message appears immediately)
 * - Sends messages via messagingService
 * - Tracks sending state (isSending)
 * - Displays toast notifications on error
 * - Supports retry mechanism for failed messages
 * - Returns message ID on success
 * 
 * @returns sendMessage function, retryMessage function, and isSending state
 * 
 * @example
 * ```tsx
 * function MessageInput({ conversationId }: { conversationId: string }) {
 *   const [text, setText] = useState('')
 *   const { sendMessage, isSending } = useSendMessage()
 *   
 *   const handleSend = async () => {
 *     try {
 *       await sendMessage({
 *         conversationId,
 *         content: text,
 *         type: 'text'
 *       })
 *       setText('') // Clear input on success
 *     } catch (error) {
 *       // Error is already toasted by hook
 *     }
 *   }
 *   
 *   return (
 *     <div>
 *       <input value={text} onChange={(e) => setText(e.target.value)} />
 *       <button onClick={handleSend} disabled={isSending}>
 *         {isSending ? 'Sending...' : 'Send'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useSendMessage() {
  const {
    isSendingMessage,
    setSendingMessage,
    addOptimisticMessage,
    replaceOptimisticMessage,
    markMessageFailed,
    messages // Access messages to look up parent message
  } = useMessagingStore()

  // Get current user ID from auth store
  const currentUserId = useAuthStore(state => state.user?.id)

  // Get network status for offline detection
  const { isOnline } = useNetworkStatus()

  /**
   * Send a message with optimistic UI updates and offline support
   * 
   * Flow:
   * 1. Generate temp message with _optimistic flag
   * 2. Add temp message to store immediately (optimistic UI)
   * 3. Check if online:
   *    - Online: Send to server, replace with real message on success
   *    - Offline: Queue for later, mark as 'queued' status
   * 4. On failure: mark temp message as failed
   */
  const sendMessage = useCallback(async (params: SendMessageParams) => {
    // Generate temporary ID for optimistic message
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Look up parent message if this is a reply
    let parentMessage = null
    if (params.replyToId) {
      const conversationMessages = messages.get(params.conversationId) || []
      const parentMsg = conversationMessages.find(m => m.id === params.replyToId)
      if (parentMsg) {
        parentMessage = {
          id: parentMsg.id,
          content: parentMsg.content,
          type: parentMsg.type,
          sender_id: parentMsg.sender_id,
          sender_name: 'User', // Will be populated from backend
          created_at: parentMsg.created_at
        }
      }
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId, // Temporary ID
      conversation_id: params.conversationId,
      sender_id: currentUserId || 'unknown', // Use actual user ID from auth store
      content: params.content,
      type: params.type || 'text',
      media_urls: params.mediaUrls || null,
      thumbnail_url: params.thumbnailUrl || null,
      link_previews: params.linkPreviews || null,
      shared_coupon_id: params.sharedCouponId || null,
      shared_deal_id: params.sharedDealId || null,
      reply_to_id: params.replyToId || null,
      parent_message: parentMessage, // Include parent message data for replies
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _optimistic: true,
      _tempId: tempId,
      _failed: false,
      status: 'sending'
    }

    try {
      // 1. Add optimistic message immediately (instant UI feedback)
      addOptimisticMessage(params.conversationId, optimisticMessage)

      setSendingMessage(true)

      // 2. Check if online - if offline, queue message for later
      if (!isOnline) {
        console.log('📴 Offline - queueing message for later sync')

        // Queue the message for later sync
        const queueId = await offlineQueueService.queueMessage({
          conversationId: params.conversationId,
          senderId: currentUserId || 'unknown',
          content: params.content,
          type: params.type || 'text',
          mediaUrls: params.mediaUrls || undefined,
          thumbnailUrl: params.thumbnailUrl || undefined,
          replyToId: params.replyToId || undefined
        })

        // Mark message as queued (not failed)
        replaceOptimisticMessage(params.conversationId, tempId, {
          ...optimisticMessage,
          _queued: true,
          _queueId: queueId,
          status: 'queued'
        })

        console.log(`📤 Message queued: ${queueId}`)
        toast('Message saved. Will send when back online.', { icon: '📴' })
        return tempId
      }

      // 3. Online - send actual message to server
      const messageId = await messagingService.sendMessage(params)

      // 4. Replace optimistic message with real message from server
      // Note: The real message should be received via realtime subscription
      // but we also replace it here immediately for better UX
      replaceOptimisticMessage(params.conversationId, tempId, {
        ...optimisticMessage,
        id: messageId,
        _optimistic: undefined,
        _failed: undefined,
        _tempId: undefined,
        _queued: undefined,
        _queueId: undefined,
        status: 'delivered' // In DB = delivered (recipient can fetch it)
      })

      // 5. Trigger push notification to other participants (async, non-blocking)
      // REVERTED: Using backend trigger via pg_net to handle this reliably without CORS issues
      // triggerPushNotification({
      //   conversationId: params.conversationId,
      //   senderId: currentUserId || 'unknown',
      //   content: params.content || '',
      //   messageType: params.type || 'text'
      // }).catch(err => console.error('[Push] Failed to trigger:', err))

      console.log('✅ Message sent:', messageId)
      return tempId // Return tempId for progress tracking
    } catch (error) {
      console.error('❌ Failed to send message:', error)

      // Check if it's a blocking-related error (RLS policy violation)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isBlockError =
        errorMessage.includes('blocked') ||
        errorMessage.includes('PGRST116') || // PostgreSQL RLS policy violation
        errorMessage.includes('new row violates row-level security policy')

      if (isBlockError) {
        console.log('🚫 Message blocked by RLS policy (user is blocked)')
        markMessageFailed(params.conversationId, tempId)
        toast.error('Unable to send message. This user may have blocked you.')
        throw error
      }

      // Check if it's a network error - queue instead of fail
      const isNetworkError = error instanceof TypeError &&
        (error.message.includes('fetch') || error.message.includes('network'))

      if (isNetworkError) {
        console.log('📴 Network error - queueing message for later sync')

        try {
          const queueId = await offlineQueueService.queueMessage({
            conversationId: params.conversationId,
            senderId: currentUserId || 'unknown',
            content: params.content,
            type: params.type || 'text',
            mediaUrls: params.mediaUrls || undefined,
            thumbnailUrl: params.thumbnailUrl || undefined,
            replyToId: params.replyToId || undefined
          })

          replaceOptimisticMessage(params.conversationId, tempId, {
            ...optimisticMessage,
            _queued: true,
            _queueId: queueId,
            status: 'queued'
          })

          toast('Message saved. Will send when back online.', { icon: '📴' })
          return tempId
        } catch (queueError) {
          console.error('❌ Failed to queue message:', queueError)
        }
      }

      // Mark message as failed (show retry button)
      markMessageFailed(params.conversationId, tempId)

      toast.error('Failed to send message. Tap to retry.')
      throw error
    } finally {
      setSendingMessage(false)
    }
  }, [setSendingMessage, addOptimisticMessage, replaceOptimisticMessage, markMessageFailed, isOnline, currentUserId])

  /**
   * Retry sending a failed message
   * 
   * @param failedMessage - The failed message to retry
   */
  const retryMessage = useCallback(async (failedMessage: Message) => {
    if (!failedMessage._tempId) {
      console.error('Cannot retry message without _tempId')
      return
    }

    try {
      // Re-send the message with same content
      await sendMessage({
        conversationId: failedMessage.conversation_id,
        content: failedMessage.content,
        type: failedMessage.type
      })

      // Note: The failed message will be replaced by the new optimistic message
      // created in sendMessage(), so no explicit cleanup needed
    } catch (error) {
      console.error('Retry failed:', error)
      // sendMessage already handles error toasts
    }
  }, [sendMessage])

  return {
    sendMessage,
    retryMessage,
    isSending: isSendingMessage
  }
}
