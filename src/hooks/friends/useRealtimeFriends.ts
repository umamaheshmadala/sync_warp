/**
 * Realtime Subscriptions Hook for Friends
 * Story 9.4.4: Realtime Subscriptions for Friends
 * 
 * Subscribes to Supabase realtime events for friendships, friend requests, and profiles
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useFriendsStore } from '../../store/friendsStore';
import { useAuthStore } from '../../store/authStore';

/**
 * Simple throttle implementation
 * Ensures function is called at most once per specified delay
 */
function throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastRan = 0;

    return function (this: any, ...args: Parameters<T>) {
        const now = Date.now();

        if (now - lastRan >= delay) {
            func.apply(this, args);
            lastRan = now;
        } else {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastRan = Date.now();
            }, delay - (now - lastRan));
        }
    };
}

/**
 * Hook to subscribe to realtime friend updates
 * Should be called once at app level (e.g., in App.tsx)
 */
export function useRealtimeFriends() {
    const user = useAuthStore(state => state.user);
    const queryClient = useQueryClient();
    const { addFriend, removeFriend, addRequest, removeRequest, setOnlineFriendsCount } = useFriendsStore();

    // Use refs to avoid recreating throttled functions on every render
    const throttledHandlers = useRef({
        handleFriendAdded: throttle((payload: any) => {
            console.log('[Realtime] New friend added:', payload);
            // Invalidate friends query to refetch with new friend
            queryClient.invalidateQueries({ queryKey: ['friends'] });
        }, 1000),

        handleFriendRemoved: throttle((payload: any) => {
            console.log('[Realtime] Friend removed:', payload);
            if (payload.old?.friend_id) {
                removeFriend(payload.old.friend_id);
            }
            queryClient.invalidateQueries({ queryKey: ['friends'] });
        }, 1000),

        handleFriendRequestChange: throttle((payload: any) => {
            console.log('[Realtime] Friend request update:', payload);
            // Invalidate friend requests queries
            queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
        }, 1000),

        handleProfileUpdate: throttle((payload: any) => {
            console.log('[Realtime] Profile updated:', payload);
            // Invalidate friends query to update online status
            queryClient.invalidateQueries({ queryKey: ['friends'] });
        }, 2000),
    });

    useEffect(() => {
        if (!user) return;

        console.log('[Realtime] Setting up friend subscriptions for user:', user.id);

        // Subscribe to friendships changes
        const friendshipsChannel = supabase
            .channel('friendships-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'friendships',
                    filter: `user_id=eq.${user.id}`,
                },
                throttledHandlers.current.handleFriendAdded
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'friendships',
                    filter: `user_id=eq.${user.id}`,
                },
                throttledHandlers.current.handleFriendRemoved
            )
            .subscribe();

        // Subscribe to friend requests (both received and sent)
        const requestsChannel = supabase
            .channel('friend-requests-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friend_requests',
                    filter: `receiver_id=eq.${user.id}`,
                },
                throttledHandlers.current.handleFriendRequestChange
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friend_requests',
                    filter: `sender_id=eq.${user.id}`,
                },
                throttledHandlers.current.handleFriendRequestChange
            )
            .subscribe();

        // Subscribe to profiles for online status updates
        const profilesChannel = supabase
            .channel('profiles-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                },
                throttledHandlers.current.handleProfileUpdate
            )
            .subscribe();

        return () => {
            console.log('[Realtime] Cleaning up friend subscriptions');
            supabase.removeChannel(friendshipsChannel);
            supabase.removeChannel(requestsChannel);
            supabase.removeChannel(profilesChannel);
        };
    }, [user, queryClient, removeFriend]);
}
