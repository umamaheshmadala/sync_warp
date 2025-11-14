import { useCallback } from 'react'
import { useMessagingStore } from '../store/messagingStore'
import { messagingService } from '../services/messagingService'
import { toast } from 'react-hot-toast'
import type { SendMessageParams, Message } from '../types/messaging'

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
 *         contentType: 'text'
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
    markMessageFailed 
  } = useMessagingStore()

  /**
   * Send a message with optimistic UI updates
   * 
   * Flow:
   * 1. Generate temp message with _optimistic flag
   * 2. Add temp message to store immediately (optimistic UI)
   * 3. Send actual message to server
   * 4. On success: replace temp message with real message
   * 5. On failure: mark temp message as failed
   */
  const sendMessage = useCallback(async (params: SendMessageParams) => {
    // Generate temporary ID for optimistic message
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId, // Temporary ID
      conversation_id: params.conversationId,
      sender_id: 'current_user', // TODO: Get from auth context
      content: params.content,
      type: params.contentType === 'text' ? 'text' : 'media',
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _optimistic: true,
      _tempId: tempId,
      _failed: false
    }

    try {
      // 1. Add optimistic message immediately (instant UI feedback)
      addOptimisticMessage(params.conversationId, optimisticMessage)
      
      setSendingMessage(true)

      // 2. Send actual message to server
      const messageId = await messagingService.sendMessage(params)

      // 3. Replace optimistic message with real message from server
      // Note: The real message should be received via realtime subscription
      // but we also replace it here immediately for better UX
      replaceOptimisticMessage(params.conversationId, tempId, {
        ...optimisticMessage,
        id: messageId,
        _optimistic: undefined,
        _failed: undefined,
        _tempId: undefined
      })

      console.log('✅ Message sent:', messageId)
      return messageId
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      
      // Mark message as failed (show retry button)
      markMessageFailed(params.conversationId, tempId)
      
      toast.error('Failed to send message. Tap to retry.')
      throw error
    } finally {
      setSendingMessage(false)
    }
  }, [setSendingMessage, addOptimisticMessage, replaceOptimisticMessage, markMessageFailed])

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
        contentType: failedMessage.type === 'text' ? 'text' : 'media'
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
