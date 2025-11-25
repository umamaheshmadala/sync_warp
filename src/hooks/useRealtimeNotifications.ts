import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export function useRealtimeNotifications() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.id) {
            console.error('[useRealtimeNotifications] No user ID, skipping subscription');
            return;
        }

        console.error('[useRealtimeNotifications] Subscribing to notifications for user:', user.id);

        const channel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.error('[useRealtimeNotifications] Received INSERT event:', payload);

                    // Invalidate notifications query
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    queryClient.invalidateQueries({ queryKey: ['all-notifications'] });

                    // Show toast for new notification
                    const notification = payload.new as any;
                    toast(notification.message, {
                        icon: '🔔',
                        duration: 4000,
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.error('[useRealtimeNotifications] Received UPDATE event:', payload);
                    // Invalidate on updates (mark as read)
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
                }
            )
            .subscribe((status) => {
                console.error('[useRealtimeNotifications] Subscription status:', status);
            });

        // Listen for foreground push notifications as a backup/trigger
        const handleForegroundPush = (event: Event) => {
            console.error('[useRealtimeNotifications] Received foreground push event');
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
        };

        window.addEventListener('foreground-notification', handleForegroundPush);

        return () => {
            console.log('[useRealtimeNotifications] Unsubscribing');
            supabase.removeChannel(channel);
            window.removeEventListener('foreground-notification', handleForegroundPush);
        };
    }, [queryClient, user?.id]);
}
