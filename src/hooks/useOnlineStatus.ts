/**
 * useOnlineStatus Hook - Real-time Online Status Consumer
 * Story 9.3.7: Online Status & Badges (Real-time Implementation)
 * 
 * Subscribes to Supabase Realtime Presence channel and provides:
 * - isUserOnline(userId) - Check if user is currently online
 * - getLastSeen(userId) - Get user's last online timestamp
 * - onlineUsers - Map of all online users
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOnlineStatus() {
    const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        console.log('[OnlineStatus] Subscribing to presence channel');

        const channel = supabase.channel('online-users');

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const online = new Map<string, string>();

                // Extract all online users from presence state
                Object.values(state).forEach(presences => {
                    presences.forEach((presence: any) => {
                        if (presence.user_id && presence.online_at) {
                            online.set(presence.user_id, presence.online_at);
                        }
                    });
                });

                console.log('[OnlineStatus] Updated online users:', online.size);
                setOnlineUsers(online);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('[OnlineStatus] User joined:', key);
                setOnlineUsers(prev => {
                    const updated = new Map(prev);
                    newPresences.forEach((presence: any) => {
                        if (presence.user_id && presence.online_at) {
                            updated.set(presence.user_id, presence.online_at);
                        }
                    });
                    return updated;
                });
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('[OnlineStatus] User left:', key);
                setOnlineUsers(prev => {
                    const updated = new Map(prev);
                    leftPresences.forEach((presence: any) => {
                        if (presence.user_id) {
                            updated.delete(presence.user_id);
                        }
                    });
                    return updated;
                });
            })
            .subscribe();

        return () => {
            console.log('[OnlineStatus] Unsubscribing from presence channel');
            supabase.removeChannel(channel);
        };
    }, []);

    /**
     * Check if a user is currently online
     * A user is considered online if their heartbeat was within the last 60 seconds
     */
    const isUserOnline = (userId: string): boolean => {
        const onlineAt = onlineUsers.get(userId);
        if (!onlineAt) return false;

        // Consider online if heartbeat within last 60 seconds
        const diff = new Date().getTime() - new Date(onlineAt).getTime();
        return diff < 60000; // 1 minute
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
