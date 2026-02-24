import { useEffect, useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messagingService } from '../services/messagingService'
import { realtimeService } from '../services/realtimeService'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-hot-toast'
import { usePlatform } from './usePlatform'
import { supabase } from '../lib/supabase'
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

  const hasMore = useRef(true)
  const [isFetchingOlder, setIsFetchingOlder] = useState(false)
  const isLoadingMoreRef = useRef(false) // Keep ref for preventing duplicate calls logic
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

  const conversationMessages: Message[] = messagesData?.messages || []
  hasMore.current = messagesData?.hasMore ?? true

  // DEBUG: Log cache state
  console.log('📊 [useMessages] State:', {
    conversationId,
    hasData: !!messagesData,
    messageCount: conversationMessages.length,
    isLoading,
    isFetching,
    isFetchingOlder,
    fromCache: !isLoading && !!messagesData
  })

  // Load more (older) messages
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore.current || isLoadingMoreRef.current) return

    const oldestMessage = conversationMessages[0] // Messages sorted DESC by created_at
    if (!oldestMessage) return

    try {
      isLoadingMoreRef.current = true
      setIsFetchingOlder(true)

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
      isLoadingMoreRef.current = false
      setIsFetchingOlder(false)
    }
  }, [conversationId, conversationMessages, pageSize, queryClient])

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId) return

    const unsubscribeNew = realtimeService.subscribeToMessages(
      conversationId,
      (newMessage: Message) => {
        const enrichMessageWithParent = async () => {
          if (newMessage.reply_to_id && !newMessage.parent_message) {
            // 1. Try Cache First
            const currentData = queryClient.getQueryData(['messages', conversationId]) as any
            const currentMessages = currentData?.messages || []
            const parentMsg = currentMessages.find((m: Message) => m.id === newMessage.reply_to_id)

            if (parentMsg) {
              newMessage.parent_message = {
                id: parentMsg.id,
                content: parentMsg.content,
                type: parentMsg.type,
                sender_id: parentMsg.sender_id,
                sender_name: parentMsg.sender_id === currentUserId ? 'You' : 'User', // Fallback
                created_at: parentMsg.created_at
              }
            } else {
              // 2. Fetch from DB if not in cache (Slow path, but ensures consistency)
              try {
                // Fetch message + sender profile name
                const { data, error } = await supabase
                  .from('messages')
                  .select('content, type, sender_id, created_at, sender:sender_id(full_name)')
                  .eq('id', newMessage.reply_to_id)
                  .single()

                if (data && !error) {
                  const senderName = (data.sender as any)?.full_name || 'User'
                  newMessage.parent_message = {
                    id: newMessage.reply_to_id!,
                    content: data.content,
                    type: data.type,
                    sender_id: data.sender_id,
                    sender_name: data.sender_id === currentUserId ? 'You' : senderName,
                    created_at: data.created_at
                  }
                }
              } catch (err) {
                console.error('Failed to fetch reply context:', err)
              }
            }
          }
        }

        // Execute enrichment then update state
        enrichMessageWithParent().then(() => {
          const processedMessage = { ...newMessage };

          // Derive status for own messages arriving via realtime
          if (processedMessage.sender_id === currentUserId && !processedMessage.status) {
            processedMessage.status = 'delivered'
          }

          // Update React Query cache with deduplication
          queryClient.setQueryData(['messages', conversationId], (old: any) => {
            const currentMessages = old?.messages || []

            // If message already exists (e.g. optimistic), merge parent_message context
            if (currentMessages.some((m: Message) => m.id === processedMessage.id)) {
              return {
                ...old,
                messages: currentMessages.map((m: Message) => {
                  if (m.id === processedMessage.id && !m.parent_message && processedMessage.parent_message) {
                    return { ...m, parent_message: processedMessage.parent_message }
                  }
                  return m
                })
              }
            }

            return {
              messages: [...currentMessages, processedMessage],
              hasMore: old?.hasMore ?? true
            }
          })
        })


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
      }
    )

    return () => {
      unsubscribeNew()
      unsubscribeUpdates()
      unsubscribeReadReceipts()
    }
  }, [conversationId, currentUserId, queryClient])

  return {
    messages: conversationMessages,
    isLoading: isLoading && conversationMessages.length === 0, // Only show loading if no cached data
    isFetchingOlder, // Exposed for UI loading indicators
    hasMore: hasMore.current,
    loadMore,
    refresh: refetch
  }
}
