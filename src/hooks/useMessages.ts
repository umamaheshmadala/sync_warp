import { useEffect, useCallback, useRef } from 'react'
import { useMessagingStore } from '../store/messagingStore'
import { messagingService } from '../services/messagingService'
import { messageDeleteService } from '../services/messageDeleteService'
import { realtimeService } from '../services/realtimeService'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-hot-toast'
import { usePlatform } from './usePlatform'
import type { Message } from '../types/messaging'

/**
 * Hook to manage message history with pagination and realtime updates
 * 
 * Features:
 * - Platform-specific pagination (25 messages mobile / 50 web)
 * - Cursor-based pagination with loadMore()
 * - Auto-marks messages as read when received
 * - Subscribes to realtime new messages and edits
 * - Prevents duplicate message fetches
 * - Filters out messages hidden by "Delete for me" (Story 8.5.3)
 * 
 * @param conversationId - ID of the conversation to fetch messages for
 * @returns Messages, loading state, and pagination controls
 * 
 * @example
 * ```tsx
 * function MessageList({ conversationId }: { conversationId: string }) {
 *   const { messages, isLoading, hasMore, loadMore } = useMessages(conversationId)
 *   
 *   return (
 *     <InfiniteScroll
 *       loadMore={loadMore}
 *       hasMore={hasMore}
 *     >
 *       {messages.map(m => <MessageBubble key={m.id} {...m} />)}
 *     </InfiniteScroll>
 *   )
 * }
 * ```
 */
export function useMessages(conversationId: string | null) {
  const { isMobile } = usePlatform()
  const currentUserId = useAuthStore((state) => state.user?.id)
  
  const {
    messages,
    isLoadingMessages,
    setLoadingMessages,
    setMessages,
    addMessage,
    updateMessage,
    prependMessages
  } = useMessagingStore()

  const conversationMessages = conversationId ? messages.get(conversationId) || [] : []
  
  const hasMore = useRef(true)
  const isLoadingMore = useRef(false)
  const isFetching = useRef(false)

  // Platform-specific page size
  const pageSize = isMobile ? 25 : 50

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId || isFetching.current) return

    try {
      isFetching.current = true
      setLoadingMessages(true)
      
      // Fetch messages and hidden message IDs in parallel
      const [{ messages: fetchedMessages, hasMore: more }, hiddenIds] = await Promise.all([
        messagingService.fetchMessages(conversationId, pageSize),
        messageDeleteService.getHiddenMessageIds()
      ])
      
      // Filter out messages hidden by "Delete for me" (Story 8.5.3)
      const hiddenSet = new Set(hiddenIds)
      const visibleMessages = fetchedMessages.filter(msg => !hiddenSet.has(msg.id))
      
      setMessages(conversationId, visibleMessages)
      hasMore.current = more
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
      isFetching.current = false
    }
  }, [conversationId, pageSize, setLoadingMessages, setMessages])

  // Load more (older) messages
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore.current || isLoadingMore.current) return

    const oldestMessage = conversationMessages[0] // Messages sorted DESC by created_at
    if (!oldestMessage) return

    try {
      isLoadingMore.current = true
      
      // Fetch messages and hidden IDs in parallel
      const [{ messages: olderMessages, hasMore: more }, hiddenIds] = await Promise.all([
        messagingService.fetchMessages(conversationId, pageSize, oldestMessage.id),
        messageDeleteService.getHiddenMessageIds()
      ])
      
      // Filter out hidden messages (Story 8.5.3)
      const hiddenSet = new Set(hiddenIds)
      const visibleMessages = olderMessages.filter(msg => !hiddenSet.has(msg.id))
      
      prependMessages(conversationId, visibleMessages)
      hasMore.current = more
    } catch (error) {
      console.error('Failed to load more messages:', error)
      toast.error('Failed to load older messages')
    } finally {
      isLoadingMore.current = false
    }
  }, [conversationId, conversationMessages, pageSize, prependMessages])

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId) return

    const unsubscribeNew = realtimeService.subscribeToMessages(
      conversationId,
      (newMessage: Message) => {
        // Populate parent_message for replies if missing (Story 8.10.5)
        if (newMessage.reply_to_id && !newMessage.parent_message) {
          // Use getState() to get fresh messages without adding dependency
          const currentMessages = useMessagingStore.getState().messages.get(conversationId) || []
          const parentMsg = currentMessages.find(m => m.id === newMessage.reply_to_id)
          
          if (parentMsg) {
            newMessage.parent_message = {
              id: parentMsg.id,
              content: parentMsg.content,
              type: parentMsg.type,
              sender_id: parentMsg.sender_id,
              sender_name: parentMsg.sender_id === currentUserId ? 'You' : 'User', // Fallback as Message type doesn't have sender_name
              created_at: parentMsg.created_at
            }
          }
        }

        // Derive status for own messages arriving via realtime
        // If this is our own message (got it back from server), mark as delivered
        if (newMessage.sender_id === currentUserId && !newMessage.status) {
          newMessage.status = 'delivered'
        }

        addMessage(conversationId, newMessage)
        
        // NOTE: DO NOT auto-mark messages as read here!
        // Messages should only be marked as read when the user is actively viewing 
        // the ChatScreen component. See ChatScreen.tsx for visibility-based marking.
      }
    )

    const unsubscribeUpdates = realtimeService.subscribeToMessageUpdates(
      conversationId,
      (updatedMessage: Message) => {
        updateMessage(conversationId, updatedMessage.id, updatedMessage)
      }
    )

    const unsubscribeReadReceipts = realtimeService.subscribeToReadReceipts(
      conversationId,
      (receipt: any) => {
        // Update message status to 'read' when a receipt is received
        // In a real app, we might check if all participants read it, but for now simple update
        updateMessage(conversationId, receipt.message_id, { status: 'read' })
      }
    )

    // Initial fetch
    fetchMessages()

    return () => {
      unsubscribeNew()
      unsubscribeUpdates()
      unsubscribeReadReceipts()
    }
  }, [conversationId, addMessage, updateMessage, fetchMessages, currentUserId])

  return {
    messages: conversationMessages,
    isLoading: isLoadingMessages,
    hasMore: hasMore.current,
    loadMore,
    refresh: fetchMessages
  }
}
