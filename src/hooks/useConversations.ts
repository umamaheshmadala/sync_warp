import { useEffect, useCallback, useRef } from 'react'
import { useMessagingStore } from '../store/messagingStore'
import { messagingService } from '../services/messagingService'
import { realtimeService } from '../services/realtimeService'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-hot-toast'
import { usePlatform } from './usePlatform'
import type { ConversationWithDetails } from '../types/messaging'
import { App } from '@capacitor/app'

/**
 * Hook to manage conversation list with realtime updates
 * 
 * Features:
 * - Fetches conversations on mount
 * - Subscribes to realtime conversation updates
 * - Mobile lifecycle handling (pauses updates in background)
 * - Platform-specific polling intervals (30s mobile / 10s web)
 * - Automatic cleanup on unmount
 * 
 * @returns Conversation list and loading state
 * 
 * @example
 * ```tsx
 * function ConversationList() {
 *   const { conversations, isLoading, refresh } = useConversations()
 *   
 *   return (
 *     <div>
 *       {isLoading && <Spinner />}
 *       {conversations.map(c => <ConversationItem key={c.id} {...c} />)}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useConversations() {
  const { isMobile } = usePlatform()
  const {
    conversations,
    isLoadingConversations,
    setLoadingConversations,
    setConversations,
    upsertConversation,
    updateConversation,
    addConversation,
    removeConversation
  } = useMessagingStore()

  const isAppActive = useRef(true)
  const pollInterval = useRef<NodeJS.Timeout>()
  const isFetchingRef = useRef(false)

  const shouldRefetchRef = useRef(false)

  // Fetch conversations - using useRef to make it stable
  const fetchConversationsRef = useRef(async () => {
    // Prevent concurrent fetches but mark for retry
    if (isFetchingRef.current) {
      console.log('⏭️ Fetch in progress - marking for retry')
      shouldRefetchRef.current = true
      return
    }

    try {
      isFetchingRef.current = true
      setLoadingConversations(true)

      // Loop to handle queued refreshes (e.g., block action while polling)
      do {
        shouldRefetchRef.current = false
        const data = await messagingService.fetchConversations()
        setConversations(data)
      } while (shouldRefetchRef.current)

    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoadingConversations(false)
      isFetchingRef.current = false
    }
  })

  // Stable fetch function
  const fetchConversations = useCallback(() => {
    return fetchConversationsRef.current()
  }, [])

  const { user } = useAuthStore()

  // Subscribe to real-time conversation updates (conversations + new messages)
  useEffect(() => {
    if (!user?.id) return

    // Use subscribeToConversations which subscribes to BOTH:
    // 1. Conversation table changes (INSERT/UPDATE/DELETE)
    // 2. Message INSERT events (to update last_message_content in sidebar)
    const unsubscribeConversations = realtimeService.subscribeToConversations(
      async (payload) => {
        console.log('🔄 [useConversations] Realtime update received:', payload?.table)

        // OPTIMIZED: Fetch only the updated conversation instead of entire list
        try {
          let conversationId: string | null = null;

          // Extract conversation ID from payload
          if (payload?.table === 'conversations') {
            conversationId = payload.new?.id || payload.old?.id;
          } else if (payload?.table === 'notification_log') {
            conversationId = payload.new?.data?.conversation_id;
          }

          if (conversationId) {
            console.log(`✨ [useConversations] Fetching single conversation: ${conversationId}`);

            // Fetch only this conversation
            const updatedConversation = await messagingService.fetchSingleConversation(conversationId);

            if (updatedConversation) {
              // Upsert into store (add if new, update and move to top if exists)
              upsertConversation(updatedConversation);
              console.log(`✅ [useConversations] Single conversation updated successfully`);
            } else {
              console.log(`ℹ️ [useConversations] Conversation ${conversationId} not found, might be deleted`);
              // Could potentially remove from list here if needed
            }
          } else {
            // Fallback: If we can't extract ID, do full refresh
            console.log('⚠️ [useConversations] Could not extract conversation ID, doing full refresh');
            fetchConversations();
          }
        } catch (err) {
          console.error('Failed to handle conversation update:', err);
          // On error, fall back to full refresh
          fetchConversations();
        }
      }
    )


    const unsubscribeMute = realtimeService.subscribeToMuteUpdates(
      user.id,
      (payload) => {
        const conversationId = payload.new?.conversation_id || payload.old?.conversation_id
        if (conversationId) {
          const isMuted = payload.eventType !== 'DELETE'
          updateConversation(conversationId, { is_muted: isMuted })
        }
      }
    )

    return () => {
      unsubscribeConversations()
      unsubscribeMute()
    }
  }, [user?.id, fetchConversations, updateConversation])

  // Mobile lifecycle: pause/resume updates based on app state
  useEffect(() => {
    if (!isMobile) return

    let appStateListener: any;

    const setupListener = async () => {
      appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
        isAppActive.current = isActive

        if (isActive) {
          // App came to foreground - refresh conversations
          console.log('📱 App active - refreshing conversations')
          fetchConversations()
        } else {
          // App went to background - stop polling
          console.log('📱 App inactive - pausing conversation updates')
          if (pollInterval.current) {
            clearInterval(pollInterval.current)
          }
        }
      })
    }

    setupListener()

    return () => {
      if (appStateListener) {
        appStateListener.remove()
      }
    }
  }, [isMobile, fetchConversations])

  // Initial fetch and manual refresh event listener
  useEffect(() => {
    // Initial fetch only ONCE
    fetchConversations()

    // Listen for manual refresh events (e.g., after blocking/unblocking)
    const handleConversationUpdate = () => {
      console.log('🔄 Conversation updated - refreshing list')
      fetchConversations()
    }

    window.addEventListener('conversation-updated', handleConversationUpdate)

    // Cleanup function
    return () => {
      window.removeEventListener('conversation-updated', handleConversationUpdate)
    }
    // Empty deps array - only run once on mount
  }, [])

  return {
    conversations,
    isLoading: isLoadingConversations,
    fetchConversations,
    refresh: fetchConversations
  }
}
