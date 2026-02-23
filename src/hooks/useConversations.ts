import { useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messagingService } from '../services/messagingService'
import { realtimeService } from '../services/realtimeService'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-hot-toast'
import { usePlatform } from './usePlatform'
import type { ConversationWithDetails } from '../types/messaging'
import { App } from '@capacitor/app'

export function useConversations() {
  const { isMobile } = usePlatform()
  const queryClient = useQueryClient()
  const isAppActive = useRef(true)

  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const authInitialized = useAuthStore((state) => state.initialized);

  const isAuthReady = !authLoading && authInitialized && !!user?.id

  // 1. React Query handles all fetching, caching, deduplication, and loading states
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('🔄 [useConversations] Fetching conversations via React Query...')
      return await messagingService.fetchConversations()
    },
    enabled: isAuthReady, // Automatically pauses when unauthenticated
    staleTime: 1000 * 60 * 5, // 5 minutes cache freshness
  })

  // 2. Subscribe to real-time conversation updates
  useEffect(() => {
    if (!user?.id) return

    const unsubscribeConversations = realtimeService.subscribeToConversations(
      async (payload) => {
        console.log('🔄 [useConversations] Realtime update received:', payload?.table)

        try {
          let conversationId: string | null = null;

          if (payload?.table === 'conversations') {
            conversationId = payload.new?.id || payload.old?.id;
          } else if (payload?.table === 'notification_log') {
            conversationId = payload.new?.data?.conversation_id;
          }

          if (conversationId) {
            console.log(`✨ [useConversations] Fetching single conversation: ${conversationId}`);
            const updatedConversation = await messagingService.fetchSingleConversation(conversationId);

            if (updatedConversation) {
              // React Query Cache Mutation: Upsert and move to top
              queryClient.setQueryData<ConversationWithDetails[]>(['conversations'], (old = []) => {
                const filtered = old.filter(c => c.conversation_id !== updatedConversation.conversation_id);
                return [updatedConversation, ...filtered];
              });
              console.log(`✅ [useConversations] RQ Cache updated successfully`);
            }
          } else {
            console.log('⚠️ [useConversations] Could not extract conversation ID, doing full refetch');
            refetch();
          }
        } catch (err) {
          console.error('Failed to handle conversation update:', err);
          refetch();
        }
      }
    )

    const unsubscribeMute = realtimeService.subscribeToMuteUpdates(
      user.id,
      (payload) => {
        const conversationId = payload.new?.conversation_id || payload.old?.conversation_id
        if (conversationId) {
          const isMuted = payload.eventType !== 'DELETE'
          // React Query Cache Mutation: Update mute status
          queryClient.setQueryData<ConversationWithDetails[]>(['conversations'], (old = []) =>
            old.map(c => c.conversation_id === conversationId ? { ...c, is_muted: isMuted } : c)
          );
        }
      }
    )

    return () => {
      unsubscribeConversations()
      unsubscribeMute()
    }
  }, [user?.id, queryClient, refetch])

  // 3. Mobile lifecycle: resume updates based on app state
  useEffect(() => {
    if (!isMobile) return

    let appStateListener: any;

    const setupListener = async () => {
      appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
        isAppActive.current = isActive
        if (isActive && isAuthReady) {
          console.log('📱 App active - refetching conversations')
          refetch()
        }
      })
    }

    setupListener()
    return () => {
      if (appStateListener) appStateListener.remove()
    }
  }, [isMobile, isAuthReady, refetch])

  // 4. Global manual refresh listener
  useEffect(() => {
    const handleConversationUpdate = () => {
      console.log('🔄 Manual Global Event - refreshing conversations')
      refetch()
    }
    window.addEventListener('conversation-updated', handleConversationUpdate)
    return () => window.removeEventListener('conversation-updated', handleConversationUpdate)
  }, [refetch])

  // Expose stable callback signatures to prevent consumer disruption
  const fetchConversationsWrapper = useCallback(() => refetch().then(() => { }), [refetch])

  return {
    conversations,
    isLoading,
    fetchConversations: fetchConversationsWrapper,
    refresh: fetchConversationsWrapper
  }
}
