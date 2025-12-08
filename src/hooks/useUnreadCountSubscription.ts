import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useMessagingStore } from '../store/messagingStore';
import { useAuthStore } from '../store/authStore';
import { messagingService } from '../services/messagingService';

/**
 * Global hook to keep the unread message badge updated in real-time.
 * Consumed by App.tsx to ensure it persists across navigation.
 * 
 * Uses the same proven mechanism as the Messages page to ensure reliability.
 */
export function useUnreadCountSubscription() {
  const { user } = useAuthStore();
  const setConversations = useMessagingStore((state) => state.setConversations);

  useEffect(() => {
    if (!user?.id) return;

    console.log('[useUnreadCountSubscription] Initializing badge subscription');

    // Fetch conversations - this updates the store which automatically recalculates badge
    // This is the SAME approach that works on the Messages page
    const fetchAndUpdateBadge = async () => {
      try {
        console.log('[useUnreadCountSubscription] Fetching conversations for badge update');
        const conversations = await messagingService.fetchConversations();
        setConversations(conversations);
        console.log('[useUnreadCountSubscription] Badge updated via conversation fetch');
      } catch (error) {
        console.error('[useUnreadCountSubscription] Failed to fetch conversations:', error);
      }
    };

    // Initial fetch
    fetchAndUpdateBadge();

    // Subscribe to notifications table - this is the reliable trigger
    // When a notification arrives, we fetch fresh conversation data
    const notificationChannel = supabase
      .channel('global-unread-badge-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        },
        async (payload) => {
          console.log('[useUnreadCountSubscription] Notification INSERT - refreshing badge');
          await fetchAndUpdateBadge();
        }
      )
      .subscribe((status) => {
        console.log('[useUnreadCountSubscription] Notification channel status:', status);
      });

    // Also subscribe to message_read_receipts to catch when messages are marked read
    const readReceiptChannel = supabase
      .channel('global-unread-badge-receipts')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'message_read_receipts'
        },
        async (payload) => {
          console.log('[useUnreadCountSubscription] Message marked read - refreshing badge');
          await fetchAndUpdateBadge();
        }
      )
      .subscribe((status) => {
        console.log('[useUnreadCountSubscription] Read receipt channel status:', status);
      });

    return () => {
      console.log('[useUnreadCountSubscription] Cleaning up badge subscription');
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(readReceiptChannel);
    };
  }, [user?.id, setConversations]);
}
