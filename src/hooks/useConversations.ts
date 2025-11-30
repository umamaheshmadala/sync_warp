import { useEffect, useCallback, useRef } from 'react'
import { useMessagingStore } from '../store/messagingStore'
import { messagingService } from '../services/messagingService'
import { realtimeService } from '../services/realtimeService'
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
    updateConversation,
    addConversation
  } = useMessagingStore()

  const isAppActive = useRef(true)
  const pollInterval = useRef<NodeJS.Timeout>()

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true)
      const data = await messagingService.fetchConversations()
      setConversations(data)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoadingConversations(false)
    }
  }, [setLoadingConversations, setConversations])

  // Subscribe to real-time conversation updates
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToConversations(() => {
      // Simple refresh on any update to ensure consistency
      fetchConversations()
    })

    return () => {
      unsubscribe()
    }
  }, [fetchConversations])

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

  // Platform-specific polling: DISABLED - rely on realtime subscriptions
  useEffect(() => {
    // Initial fetch only
    fetchConversations()

    // Listen for manual refresh events (e.g., after marking as read)
    const handleConversationUpdate = () => {
      console.log('🔄 Conversation updated - refreshing list')
      fetchConversations()
    }
    
    window.addEventListener('conversation-updated', handleConversationUpdate)

    // Polling disabled - we rely on realtime subscriptions for updates
    // This prevents the periodic reloading issue reported by users
    
    // Cleanup function
    return () => {
      window.removeEventListener('conversation-updated', handleConversationUpdate)
    }
  }, [fetchConversations])

  return {
    conversations,
    isLoading: isLoadingConversations,
    fetchConversations,
    refresh: fetchConversations
  }
}
