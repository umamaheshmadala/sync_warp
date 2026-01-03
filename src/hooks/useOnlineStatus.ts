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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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

/**
 * Hook to check if current user can see another user's online status
 * Uses the can_see_online_status RPC which respects privacy settings
 */
export function useCanSeeOnlineStatus(targetUserId: string) {
    const { user } = useAuthStore();

    const { data: canSee, isLoading } = useQuery({
        queryKey: ['canSeeOnlineStatus', user?.id, targetUserId],
        queryFn: async () => {
            if (!user?.id || !targetUserId) return false;

            // User can always see their own status
            if (user.id === targetUserId) return true;

            const { data, error } = await supabase.rpc('can_see_online_status', {
                viewer_id: user.id,
                target_id: targetUserId
            });

            if (error) {
                console.error('[useCanSeeOnlineStatus] RPC error:', error);
                return false;
            }

            return data as boolean;
        },
        enabled: !!user?.id && !!targetUserId,
        staleTime: 10 * 1000, // Cache for 10 seconds
        gcTime: 60 * 1000, // Keep in cache for 1 minute
        refetchInterval: 10 * 1000, // Auto-refresh every 10 seconds
    });

    return { canSee: canSee ?? false, isLoading };
}

