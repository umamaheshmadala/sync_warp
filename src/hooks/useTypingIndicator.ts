import { useEffect, useCallback, useRef } from 'react'
import { useMessagingStore } from '../store/messagingStore'
import { realtimeService } from '../services/realtimeService'
import { useAuthStore } from '../store/authStore'

const TYPING_TIMEOUT = 3000 // 3 seconds

/**
 * Hook to manage typing indicators for a conversation
 * 
 * Features:
 * - Broadcasts typing status to other participants
 * - Auto-stops after 3 seconds of inactivity
 * - Subscribes to other users' typing status
 * - Filters out current user from typing list
 * - Automatic cleanup on unmount
 * 
 * @param conversationId - ID of the conversation
 * @returns Typing state and controls
 * 
 * @example
 * ```tsx
 * function MessageInput({ conversationId }: { conversationId: string }) {
 *   const [text, setText] = useState('')
 *   const { isTyping, typingUserIds, handleTyping, stopTyping } = 
 *     useTypingIndicator(conversationId)
 *   
 *   const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
 *     setText(e.target.value)
 *     handleTyping() // Broadcast typing on every keystroke
 *   }
 *   
 *   return (
 *     <div>
 *       {isTyping && <p>{typingUserIds.length} user(s) typing...</p>}
 *       <input 
 *         value={text} 
 *         onChange={handleChange}
 *         onBlur={stopTyping} // Stop typing when input loses focus
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useTypingIndicator(conversationId: string | null) {
  const currentUserId = useAuthStore((state) => state.user?.id)
  const { typingUsers, addTypingUser, removeTypingUser } = useMessagingStore()
  
  const typingTimeout = useRef<NodeJS.Timeout>()
  const isTyping = useRef(false)

  // Get typing users for this conversation (excluding current user)
  const otherTypingUsers = conversationId 
    ? Array.from(typingUsers.get(conversationId) || []).filter(id => id !== currentUserId)
    : []

  // Broadcast typing indicator
  const setTyping = useCallback((typing: boolean) => {
    if (!conversationId) return

    isTyping.current = typing
    realtimeService.broadcastTyping(conversationId, typing)

    // Auto-stop typing after timeout
    if (typing) {
      clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => {
        setTyping(false)
      }, TYPING_TIMEOUT)
    }
  }, [conversationId])

  // Handle typing event (call on every keystroke)
  const handleTyping = useCallback(() => {
    if (!isTyping.current) {
      setTyping(true)
    } else {
      // Reset timeout
      clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => {
        setTyping(false)
      }, TYPING_TIMEOUT)
    }
  }, [setTyping])

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId) return

    const unsubscribe = realtimeService.subscribeToTyping(
      conversationId,
      (userId, typing) => {
        if (userId === currentUserId) return // Ignore own typing

        if (typing) {
          addTypingUser(conversationId, userId)
          
          // Auto-remove after timeout (in case broadcast fails)
          setTimeout(() => {
            removeTypingUser(conversationId, userId)
          }, TYPING_TIMEOUT + 1000)
        } else {
          removeTypingUser(conversationId, userId)
        }
      }
    )

    return () => {
      unsubscribe()
      clearTimeout(typingTimeout.current)
      if (isTyping.current) {
        setTyping(false)
      }
    }
  }, [conversationId, currentUserId, addTypingUser, removeTypingUser, setTyping])

  return {
    isTyping: otherTypingUsers.length > 0,
    typingUserIds: otherTypingUsers,
    handleTyping,
    stopTyping: () => setTyping(false)
  }
}
