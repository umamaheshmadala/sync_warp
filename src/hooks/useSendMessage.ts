import { useCallback } from 'react'
import { useMessagingStore } from '../store/messagingStore'
import { messagingService } from '../services/messagingService'
import { toast } from 'react-hot-toast'
import type { SendMessageParams } from '../types/messaging'

/**
 * Hook to send messages with loading state and error handling
 * 
 * Features:
 * - Sends messages via messagingService
 * - Tracks sending state (isSending)
 * - Displays toast notifications on error
 * - Returns message ID on success
 * 
 * @returns sendMessage function and isSending state
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
  const { isSendingMessage, setSendingMessage } = useMessagingStore()

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    try {
      setSendingMessage(true)

      const messageId = await messagingService.sendMessage(params)

      console.log('✅ Message sent:', messageId)
      return messageId
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      toast.error('Failed to send message. Please try again.')
      throw error
    } finally {
      setSendingMessage(false)
    }
  }, [setSendingMessage])

  return { 
    sendMessage, 
    isSending: isSendingMessage 
  }
}
