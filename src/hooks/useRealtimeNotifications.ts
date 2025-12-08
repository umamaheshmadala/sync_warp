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
            // console.debug('[useRealtimeNotifications] No user ID, skipping subscription');
            return;
        }

        console.log('[useRealtimeNotifications] Subscribing to notifications for user:', user.id);

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
                    console.log('[useRealtimeNotifications] Received INSERT event:', payload);

                    // Invalidate notifications query
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    queryClient.invalidateQueries({ queryKey: ['all-notifications'] });

                    // Show toast for new notification (excluding messages)
                    const notification = payload.new as any;
                    
                    // Check both 'type' and 'notification_type' (DB column might be notification_type)
                    const notifType = notification.type || notification.notification_type;
                    
                    const messageTypes = ['message', 'new_message', 'message_received', 'message_reply', 'coupon_shared_message', 'deal_shared_message'];
                    
                    if (!messageTypes.includes(notifType)) {
                        toast(notification.message, {
                            icon: '🔔',
                            duration: 4000,
                        });
                    }
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
                    console.log('[useRealtimeNotifications] Received UPDATE event:', payload);
                    // Invalidate on updates (mark as read)
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
                }
            )
            .subscribe((status) => {
                console.log('[useRealtimeNotifications] Subscription status:', status);
            });

        // Listen for foreground push notifications as a backup/trigger
        const handleForegroundPush = (event: Event) => {
            console.log('[useRealtimeNotifications] Received foreground push event');
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
