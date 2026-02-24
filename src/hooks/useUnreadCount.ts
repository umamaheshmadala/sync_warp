import { useQuery } from '@tanstack/react-query';
import type { ConversationWithDetails } from '../types/messaging';
import { messagingService } from '../services/messagingService';

/**
 * useUnreadCount Hook
 * EPIC 15 — Story 15.5 & 15.7
 * 
 * Provides the total unread message count by deriving it from the 
 * React Query cached conversations list.
 * 
 * Returns:
 * - totalUnreadCount: number (excludes muted conversations)
 * - hasUnread: boolean (convenience boolean for rendering badges)
 * - formattedCount: string (e.g., "9+" for counts > 9)
 */
export function useUnreadCount() {
    const { data: conversations = [] } = useQuery<ConversationWithDetails[]>({
        queryKey: ['conversations'],
        // provide queryFn to prevent React Query v5 missing queryFn error
        queryFn: async () => await messagingService.fetchConversations(),
        // Only read from cache, do not trigger fetch here unless explicitly forced
        staleTime: Infinity,
        enabled: false,
    });

    const totalUnreadCount = conversations.reduce((total, conv) => {
        // Only include counts from unmuted conversations
        if (!conv.is_muted && conv.unread_count && conv.unread_count > 0) {
            return total + conv.unread_count;
        }
        return total;
    }, 0);

    return {
        totalUnreadCount,
        hasUnread: totalUnreadCount > 0,
        formattedCount: totalUnreadCount > 9 ? '9+' : String(totalUnreadCount),
    };
}
