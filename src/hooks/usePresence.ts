/**
 * usePresence Hook - Real-time Presence Tracking
 * Story 9.3.7: Online Status & Badges (Real-time Implementation)
 * 
 * Implements industry-standard presence tracking:
 * - Heartbeat every 30 seconds
 * - Supabase Realtime Presence channel
 * - Auto-away on tab hidden
 * - Auto-offline on disconnect
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function usePresence() {
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (!user) return;

        console.log('[Presence] Starting presence tracking for user:', user.id);

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        // Track presence events
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                console.log('[Presence] Sync - Online users:', Object.keys(state).length);
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                console.log('[Presence] User joined:', key);
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                console.log('[Presence] User left:', key);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Presence] Channel subscribed, tracking user');

                    // Track this user as online
                    await channel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });

                    // Update database
                    await supabase
                        .from('profiles')
                        .update({
                            is_online: true,
                            last_active: new Date().toISOString()
                        })
                        .eq('id', user.id);
                }
            });

        // Heartbeat: Send presence update every 30 seconds
        const heartbeat = setInterval(async () => {
            if (!document.hidden) {
                console.log('[Presence] Heartbeat');

                await channel.track({
                    user_id: user.id,
                    online_at: new Date().toISOString(),
                });

                // Also update database for persistence
                await supabase
                    .from('profiles')
                    .update({
                        is_online: true,
                        last_active: new Date().toISOString()
                    })
                    .eq('id', user.id);
            }
        }, 30000); // 30 seconds (industry standard)

        // Handle visibility changes (tab hidden/shown)
        const handleVisibilityChange = async () => {
            if (document.hidden) {
                console.log('[Presence] Tab hidden - untracking');
                await channel.untrack();

                // Mark as offline in database
                await supabase
                    .from('profiles')
                    .update({
                        is_online: false,
                        last_active: new Date().toISOString()
                    })
                    .eq('id', user.id);
            } else {
                console.log('[Presence] Tab visible - tracking again');
                await channel.track({
                    user_id: user.id,
                    online_at: new Date().toISOString(),
                });

                // Mark as online in database
                await supabase
                    .from('profiles')
                    .update({
                        is_online: true,
                        last_active: new Date().toISOString()
                    })
                    .eq('id', user.id);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            console.log('[Presence] Cleaning up presence tracking');
            clearInterval(heartbeat);
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            // Untrack and mark offline
            channel.untrack();
            supabase
                .from('profiles')
                .update({
                    is_online: false,
                    last_active: new Date().toISOString()
                })
                .eq('id', user.id);

            supabase.removeChannel(channel);
        };
    }, [user]);
}
