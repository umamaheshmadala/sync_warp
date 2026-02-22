import { useMessagingStore } from '../store/messagingStore';

/**
 * useUnreadCount Hook
 * EPIC 15 — Story 15.5
 * 
 * Provides the total unread message count via an optimized Zustand selector.
 * Use this hook instead of accessing messagingStore directly.
 * 
 * Returns:
 * - totalUnreadCount: number (excludes muted conversations)
 * - hasUnread: boolean (convenience boolean for rendering badges)
 * - formattedCount: string (e.g., "9+" for counts > 9)
 */
export function useUnreadCount() {
    const totalUnreadCount = useMessagingStore(s => s.totalUnreadCount);

    return {
        totalUnreadCount,
        hasUnread: totalUnreadCount > 0,
        formattedCount: totalUnreadCount > 9 ? '9+' : String(totalUnreadCount),
    };
}
