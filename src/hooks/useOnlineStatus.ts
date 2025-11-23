/**
 * Hook to track online status of users via Supabase Presence
 * Story 9.3.7: Online Status & Badges
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useOnlineStatus() {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);

    useEffect(() => {
        // Create presence channel
        const presenceChannel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: 'user_id',
                },
            },
        });

        // Subscribe to presence changes
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const online = new Set<string>();

                // Extract user IDs from presence state
                Object.values(state).forEach((presences: any) => {
                    presences.forEach((presence: any) => {
                        if (presence.user_id) {
                            online.add(presence.user_id);
                        }
                    });
                });

                setOnlineUsers(online);
            })
            .subscribe();

        setChannel(presenceChannel);

        // Cleanup on unmount
        return () => {
            if (presenceChannel) {
                supabase.removeChannel(presenceChannel);
            }
        };
    }, []);

    return {
        onlineUsers,
        isOnline: (userId: string) => onlineUsers.has(userId),
        onlineCount: onlineUsers.size
    };
}
