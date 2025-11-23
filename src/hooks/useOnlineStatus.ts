/**
 * useOnlineStatus Hook - Real-time Online Status Consumer
 * Story 9.3.7: Online Status & Badges (Real-time Implementation)
 * 
 * Consumes global presence state from usePresenceStore.
 * - isUserOnline(userId) - Check if user is currently online
 * - getLastSeen(userId) - Get user's last online timestamp
 * - onlineUsers - Map of all online users
 */

import { usePresenceStore } from '../store/presenceStore';

export function useOnlineStatus() {
    const onlineUsers = usePresenceStore(state => state.onlineUsers);

    /**
     * Check if a user is currently online
     * A user is considered online if they are in the presence map
     * (Presence map is maintained by Realtime sync events)
     */
    const isUserOnline = (userId: string): boolean => {
        const onlineAt = onlineUsers.get(userId);
        if (!onlineAt) return false;

        // Optional: Double check timestamp freshness if needed
        // But Realtime 'leave' events should handle this.
        const diff = new Date().getTime() - new Date(onlineAt).getTime();
        return diff < 65000; // 65s buffer (heartbeat is 30s)
    };

    /**
     * Get the last seen timestamp for a user
     */
    const getLastSeen = (userId: string): string | null => {
        return onlineUsers.get(userId) || null;
    };

    return {
        isUserOnline,
        getLastSeen,
        onlineUsers,
        onlineCount: onlineUsers.size
    };
}
