import { useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { realtimeService } from '@/services/realtimeService';
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
                // Custom 2-line banner toast
                toast.custom((t) => (
                    <div
                        onClick={() => {
                            toast.dismiss(t.id);
                            // navigate? (future enhancement)
                        }}
                        style={{
                            opacity: t.visible ? 1 : 0,
                            transform: t.visible ? 'translateY(0)' : 'translateY(-20px)',
                            transition: 'all 0.3s ease',
                            background: '#333',
                            color: '#fff',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            maxWidth: '350px',
                            width: '100%',
                            gap: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ fontSize: '24px' }}>🔔</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{notification.title || 'New Notification'}</div>
                            <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>{messageConfig}</div>
                        </div>
                    </div>
                ), {
                    duration: 4000,
                    id: notification.id,
                    position: 'top-center', // Banners usually look best at top
                });
            }
        };

        // Use RealtimeService to handle subscription with robust mobile support (reconnect, etc.)
        const unsubscribe = realtimeService.subscribeToInAppNotifications(
            user.id,
            (payload) => handleNotificationPayload(payload, 'notification_log')
        );

        // Listen for foreground push notifications as a backup/trigger
        const handleForegroundPush = (event: Event) => {
            console.log('[useRealtimeNotifications] Received foreground push event');
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
        };

        window.addEventListener('foreground-notification', handleForegroundPush);

        return () => {
            console.log(`[useRealtimeNotifications] Unsubscribing`);
            unsubscribe();
            window.removeEventListener('foreground-notification', handleForegroundPush);
        };
    }, [queryClient, user?.id]);
}

