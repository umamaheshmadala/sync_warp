import { useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { notificationSettingsService } from '@/services/notificationSettingsService';

export function useRealtimeNotifications() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();


    // Ensure we have muted conversations loaded for suppression logic
    // We use a query to cache this list
    useQuery({
        queryKey: ['muted_conversations', user?.id],
        queryFn: async () => {
             if (!user?.id) return [];
             const muted = await notificationSettingsService.getMutedConversations();
             return muted.map(m => m.conversation_id);
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });


    useEffect(() => {
        if (!user?.id) {
            return;
        }

        console.log('[useRealtimeNotifications] Subscribing to notifications for user:', user.id);
        
        // Track recently processed notification IDs to prevent duplicates
        const processedIds = new Set<string>();

        const handleNotificationPayload = (payload: any, source: 'notifications' | 'notification_log') => {
            console.log(`[useRealtimeNotifications] 🔔 Received INSERT from ${source}:`, JSON.stringify(payload));
            
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });

            const notification = payload.new as any;
            
            // Deduplication check
            if (notification.id && processedIds.has(notification.id)) {
                console.log(`[useRealtimeNotifications] ⚠️ Duplicate notification ID ${notification.id}, skipping toast.`);
                return;
            }
            if (notification.id) {
                processedIds.add(notification.id);
                // Clear from set after 5 seconds to prevent memory leak
                setTimeout(() => processedIds.delete(notification.id), 5000);
            }

            // Map fields based on source table
            const type = notification.type || notification.notification_type || 'unknown';
            const messageConfig = notification.message || notification.body || 'New notification';
            const data = notification.data || {};
            
            // Comprehensive list of message-related types to suppress
            const messageTypes = [
                'message', 'new_message', 
                'message_received', 'message_reply', 
                'text', 'image', 'video', 'voice', 'location',
                'group_message', 'direct_message' 
            ];
            
            const isMessage = messageTypes.some(t => t.toLowerCase() === type.toLowerCase()) || 
                                type.toLowerCase().includes('message');

            let shouldShowToast = true;

            if (isMessage) {
                try {
                    const conversationId = data.conversation_id || notification.conversation_id;
                    
                    // A. Check if user is currently reading this conversation
                    const currentPath = window.location.pathname;
                    if (conversationId && currentPath.includes(`/messages/${conversationId}`)) {
                        console.log(`[useRealtimeNotifications] 🚫 Suppressing toast: User is in conversation ${conversationId}`);
                        shouldShowToast = false;
                    }

                    // B. Check if conversation is muted (using Query Cache)
                    if (shouldShowToast && conversationId) {
                        const mutedList = queryClient.getQueryData<string[]>(['muted_conversations', user.id]) || [];
                        if (mutedList.includes(conversationId)) {
                                console.log(`[useRealtimeNotifications] 🚫 Suppressing toast: Conversation ${conversationId} is muted`);
                                shouldShowToast = false;
                        }
                    }
                } catch (err) {
                    console.error('[useRealtimeNotifications] Error checking suppression logic', err);
                }
            }

            if (shouldShowToast) {
                console.log(`[useRealtimeNotifications] ✅ Showing toast for: '${type}'`);
                toast(messageConfig, {
                    icon: '🔔',
                    duration: 4000,
                    id: notification.id,
                });
            }
        };

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
<<<<<<< HEAD
                (payload) => handleNotificationPayload(payload, 'notifications')
=======
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
>>>>>>> b4e7571cc7cda3da8d999a83d39fc8057e63e889
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notification_log',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => handleNotificationPayload(payload, 'notification_log')
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

