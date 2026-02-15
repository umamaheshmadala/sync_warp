import { useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()

  const {
    addMessage,
    updateMessage,
  } = useMessagingStore()

  const hasMore = useRef(true)
  const isLoadingMore = useRef(false)
  // isFetching is no longer needed as React Query handles fetching state

  // Platform-specific page size
  const pageSize = isMobile ? 25 : 50

  // Use React Query for messages data - this enables caching!
  const { data: messagesData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      console.log('🔄 [useMessages] Fetching messages for:', conversationId)
      if (!conversationId) return { messages: [], hasMore: false }

      // Fetch messages (hidden filtering is now handled server-side by get_messages_v2 RPC)
      const { messages: fetchedMessages, hasMore: more } = await messagingService.fetchMessages(conversationId, pageSize)

      console.log('✅ [useMessages] Fetched', fetchedMessages.length, 'messages')
      return { messages: fetchedMessages, hasMore: more }
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 60, // 1 hour cache
  })

  // Get messages from Zustand store (for optimistic updates)
  const storeMessages = useMessagingStore(
    useCallback((state) => state.messages.get(conversationId!) || [], [conversationId])
  )
  const optimisticMessages = storeMessages.filter(m => m._optimistic)

  // Merge React Query messages with optimistic messages
  // Deduplicate by ID in case an optimistic message was just confirmed but key hasn't updated
  const allMessages = [...(messagesData?.messages || [])]

  optimisticMessages.forEach(optMsg => {
    if (!allMessages.find(m => m.id === optMsg.id)) {
      allMessages.push(optMsg)
    }
  })

  const conversationMessages = allMessages
  hasMore.current = messagesData?.hasMore ?? true

  // DEBUG: Log cache state
  console.log('📊 [useMessages] State:', {
    conversationId,
    hasData: !!messagesData,
    messageCount: conversationMessages.length,
    isLoading,
    isFetching,
    fromCache: !isLoading && !!messagesData
  })

  // Load more (older) messages
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore.current || isLoadingMore.current) return

    const oldestMessage = conversationMessages[0] // Messages sorted DESC by created_at
    if (!oldestMessage) return

    try {
      isLoadingMore.current = true

      // Fetch messages (hidden filtering is now handled server-side)
      const { messages: olderMessages, hasMore: more } = await messagingService.fetchMessages(conversationId, pageSize, oldestMessage.id)

      // Update React Query cache by prepending messages
      queryClient.setQueryData(['messages', conversationId], (old: any) => ({
        messages: [...olderMessages, ...(old?.messages || [])],
        hasMore: more
      }))

      hasMore.current = more
    } catch (error) {
      console.error('Failed to load more messages:', error)
      toast.error('Failed to load older messages')
    } finally {
      isLoadingMore.current = false
    }
  }, [conversationId, conversationMessages, pageSize, queryClient])

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId) return

    const unsubscribeNew = realtimeService.subscribeToMessages(
      conversationId,
      (newMessage: Message) => {
        // Populate parent_message for replies if missing
        if (newMessage.reply_to_id && !newMessage.parent_message) {
          // Get current messages directly from cache to avoid dependency on conversationMessages
          const currentData = queryClient.getQueryData(['messages', conversationId]) as any
          const currentMessages = currentData?.messages || []

          const parentMsg = currentMessages.find((m: Message) => m.id === newMessage.reply_to_id)

          if (parentMsg) {
            newMessage.parent_message = {
              id: parentMsg.id,
              content: parentMsg.content,
              type: parentMsg.type,
              sender_id: parentMsg.sender_id,
              sender_name: parentMsg.sender_id === currentUserId ? 'You' : 'User',
              created_at: parentMsg.created_at
            }
          }
        }

        // Derive status for own messages arriving via realtime
        if (newMessage.sender_id === currentUserId && !newMessage.status) {
          newMessage.status = 'delivered'
        }

        // Update React Query cache
        // Update React Query cache with deduplication
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
          const currentMessages = old?.messages || []

          // Check if message with this ID already exists
          if (currentMessages.some((m: Message) => m.id === newMessage.id)) {
            return old
          }

          // Check for optimistic version match (by temp ID match? No, usually handled by sender swapping ID)
          // For now, simple ID deduplication matches typical optimistic flow where ID is swapped before realtime arrives

          return {
            messages: [...currentMessages, newMessage],
            hasMore: old?.hasMore ?? true
          }
        })

        // Also update Zustand store for backwards compatibility
        addMessage(conversationId, newMessage)
      }
    )

    const unsubscribeUpdates = realtimeService.subscribeToMessageUpdates(
      conversationId,
      (updatedMessage: Message) => {
        // Update React Query cache
        queryClient.setQueryData(['messages', conversationId], (old: any) => ({
          messages: (old?.messages || []).map((msg: Message) =>
            msg.id === updatedMessage.id ? updatedMessage : msg
          ),
          hasMore: old?.hasMore ?? true
        }))

        // Also update Zustand store
        updateMessage(conversationId, updatedMessage.id, updatedMessage)
      }
    )

    const unsubscribeReadReceipts = realtimeService.subscribeToReadReceipts(
      conversationId,
      (receipt: any) => {
        // Update message status to 'read'
        queryClient.setQueryData(['messages', conversationId], (old: any) => ({
          messages: (old?.messages || []).map((msg: Message) =>
            msg.id === receipt.message_id ? { ...msg, status: 'read' } : msg
          ),
          hasMore: old?.hasMore ?? true
        }))

        // Also update Zustand store
        updateMessage(conversationId, receipt.message_id, { status: 'read' })
      }
    )

    return () => {
      unsubscribeNew()
      unsubscribeUpdates()
      unsubscribeReadReceipts()
    }
  }, [conversationId, addMessage, updateMessage, currentUserId, queryClient])

  return {
    messages: conversationMessages,
    isLoading: isLoading && conversationMessages.length === 0, // Only show loading if no cached data
    hasMore: hasMore.current,
    loadMore,
    refresh: refetch
  }
}
