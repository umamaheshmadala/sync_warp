/**
 * usePresence Hook - Real-time Presence Tracking
 * Story 9.3.7: Online Status & Badges (Real-time Implementation)
 * 
 * Implements industry-standard presence tracking:
 * - Heartbeat every 30 seconds
 * - Supabase Realtime Presence channel
 * - Auto-away on tab hidden (Web)
 * - Auto-away on app background (Mobile/Capacitor)
 * - Auto-offline on disconnect
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePresenceStore } from '../store/presenceStore';

export function usePresence() {
    const user = useAuthStore(state => state.user);
    const { initialize, cleanup } = usePresenceStore();

    useEffect(() => {
        if (!user) return;

        initialize(user.id);

        return () => {
            // We don't necessarily want to cleanup on every unmount if it's global
            // But if the user logs out (user becomes null), we should.
            // For now, let's keep it alive unless user changes.
        };
    }, [user, initialize]);

    // Cleanup on unmount of the app (or when user changes)
    useEffect(() => {
        return () => {
            // cleanup(); // Optional: decide if we want to cleanup on component unmount
        }
    }, []);
}
