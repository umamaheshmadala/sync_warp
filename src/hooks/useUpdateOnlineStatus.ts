/**
 * Hook to update user's online status in the database
 * Updates is_online field when user connects/disconnects
 * Story 9.3.7: Online Status & Badges
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useUpdateOnlineStatus() {
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (!user) return;

        // Set user as online when component mounts
        const setOnline = async () => {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_online: true,
                    last_active: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                console.error('Error setting online status:', error);
            } else {
                console.log('✅ User marked as online');
            }
        };

        // Set user as offline when component unmounts or page closes
        const setOffline = async () => {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_online: false,
                    last_active: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                console.error('Error setting offline status:', error);
            }
        };

        // Set online on mount
        setOnline();

        // Handle visibility change (tab becomes hidden/visible)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setOffline();
            } else {
                setOnline();
            }
        };

        // Handle page unload (user closes tab/browser)
        const handleBeforeUnload = () => {
            // Use sendBeacon for reliable offline status update on page close
            const data = new FormData();
            data.append('user_id', user.id);

            // Fallback: try to update via supabase
            setOffline();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Heartbeat: Update last_active every 30 seconds
        const heartbeatInterval = setInterval(async () => {
            if (!document.hidden) {
                await supabase
                    .from('profiles')
                    .update({ last_active: new Date().toISOString() })
                    .eq('id', user.id);
            }
        }, 30000); // 30 seconds

        // Cleanup: Set offline on unmount
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearInterval(heartbeatInterval);
            setOffline();
        };
    }, [user]);
}
