/**
 * Hook to track current user's presence
 * Sends heartbeat to Supabase Presence channel
 * Story 9.3.7: Online Status & Badges
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function usePresence() {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        let presenceChannel: RealtimeChannel | null = null;

        const trackPresence = async () => {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Create presence channel
            presenceChannel = supabase.channel('online-users', {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            });

            // Track user presence
            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    // Presence synced
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        // Send presence
                        await presenceChannel?.track({
                            user_id: user.id,
                            online_at: new Date().toISOString(),
                        });
                    }
                });

            channelRef.current = presenceChannel;
        };

        trackPresence();

        // Handle visibility change (tab active/inactive)
        const handleVisibilityChange = async () => {
            if (document.hidden) {
                // Tab is hidden, untrack presence
                await channelRef.current?.untrack();
            } else {
                // Tab is visible, track presence again
                const { data: { user } } = await supabase.auth.getUser();
                if (user && channelRef.current) {
                    await channelRef.current.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup on unmount
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (channelRef.current) {
                channelRef.current.untrack();
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    return null; // This hook doesn't return anything, just tracks presence
}
