import { useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { realtimeService } from '@/services/realtimeService';
import { notificationSettingsService } from '@/services/notificationSettingsService';
import { useNotificationPreferences, NotificationPreferences } from './useNotificationPreferences';
import { useSystemNotificationSettings } from '@/hooks/useSystemNotificationSettings';
import { NotificationSettings } from '@/services/notificationSettingsService';

export function useRealtimeNotifications() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Debug Log: Check if hook is mounting
    if (user?.id) {
        // console.log('[useRealtimeNotifications] Hook rendered for user:', user.id);
    }

    // Ensure preferences are fetched/cached
    useNotificationPreferences();
    useSystemNotificationSettings();


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
            console.log('[useRealtimeNotifications] ⏳ User not authenticated yet, skipping subscription');
            return;
        }

        console.log('[useRealtimeNotifications] 🚀 Starting subscription setup for user:', user.id);

        // Track recently processed notification IDs to prevent duplicates
        const processedIds = new Set<string>();

        const handleNotificationPayload = (payload: any, source: 'notifications' | 'notification_log') => {
            console.log(`[useRealtimeNotifications] 🔔 Received INSERT from ${source}:`, JSON.stringify(payload));

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });

            // NOTE: Conversation list updates are now handled by realtime subscription in useConversations
            // No need to dispatch conversation-updated event - it triggers unnecessary full refreshes

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

                    // CRITICAL FIX: Invalidate specific conversation messages query
                    // This ensures that if the user navigates to the chat, useMessages will refetch
                    // instead of serving stale data (since useMessages defaults to 5min staleTime)
                    if (conversationId) {
                        console.log(`[useRealtimeNotifications] 🔄 Invalidating messages cache for ${conversationId}`);
                        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                        // Also invalidate conversation list to ensure snippet/unread count is sync (though useConversations also listens)
                        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
                    }

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
                // Check Quiet Hours
                const systemSettings = queryClient.getQueryData<NotificationSettings>(['system-notification-settings', user.id]);

                if (systemSettings) {
                    const isQuietHours = notificationSettingsService.isInQuietHours(systemSettings);
                    console.log('[useRealtimeNotifications] 🔍 Quiet Hours Check:', {
                        enabled: systemSettings.quiet_hours_enabled,
                        start: systemSettings.quiet_hours_start,
                        end: systemSettings.quiet_hours_end,
                        timezone: systemSettings.timezone,
                        isQuietMatches: isQuietHours
                    });

                    if (isQuietHours) {
                        console.log(`[useRealtimeNotifications] 🌙 Suppressing toast: Quiet Hours active (${systemSettings.quiet_hours_start} - ${systemSettings.quiet_hours_end})`);
                        shouldShowToast = false;
                    }
                } else {
                    console.warn('[useRealtimeNotifications] ⚠️ System settings not found in cache during check');
                }
            }

            if (shouldShowToast) {
                // Check Global Push Preference
                const prefs = queryClient.getQueryData<NotificationPreferences>(['notification-preferences', user.id]);
                console.log('[useRealtimeNotifications] 🔍 Push Prefs Check:', { enabled: prefs?.push_enabled });

                if (prefs && !prefs.push_enabled) {
                    console.log(`[useRealtimeNotifications] 🚫 Suppressing toast: Push disabled in settings`);
                    shouldShowToast = false;
                }
            }

            if (shouldShowToast) {
                console.log(`[useRealtimeNotifications] ✅ Showing toast for: '${type}'`);

                // Use standard toast which triggers the global CustomToast component
                // We default to 'success' style (Green) for positive interactions or 'blank' for neutral
                // The user seems to prefer the "Green" style.
                // Or we can use toast(msg) which defaults to gray.
                // Let's use toast() (gray) for general notifications but ensure CustomToast makes it look good.

                toast(
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm">{notification.title || 'New Notification'}</span>
                        <span className="text-xs opacity-90 leading-tight">{messageConfig}</span>
                    </div>,
                    {
                        id: notification.id,
                        duration: 4000,
                        // Add an icon if needed, though CustomToast handles default icons
                        icon: '🔔'
                    }
                );
            }
        };

        // Use RealtimeService to handle subscription with robust mobile support (reconnect, etc.)
        // NOTE: Due to a Supabase limitation, this subscription may not fire if another subscription
        // to the same table exists. We work around this by also listening to a custom event
        // dispatched by useInAppNotifications.
        // Use RealtimeService to handle subscription with robust mobile support
        let unsubscribe = () => { };

        try {
            console.log('[useRealtimeNotifications] 📞 Calling realtimeService.subscribeToInAppNotifications...');
            unsubscribe = realtimeService.subscribeToInAppNotifications(
                user.id,
                (payload) => handleNotificationPayload(payload, 'notification_log')
            );
            console.log('[useRealtimeNotifications] ✅ Subscription initiated successfully');
        } catch (err) {
            console.error('[useRealtimeNotifications] ❌ Failed to initiate subscription:', err);
        }

        // WORKAROUND: Listen to custom event from useInAppNotifications
        // This ensures we receive notification events even if the direct Realtime subscription doesn't fire
        const handleCustomEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            console.log('[useRealtimeNotifications] Received custom event from useInAppNotifications');
            handleNotificationPayload(customEvent.detail, 'notification_log');
        };
        window.addEventListener('notification-log-insert', handleCustomEvent);

        // Listen for foreground push notifications as a backup/trigger
        const handleForegroundPush = (event: Event) => {
            console.log('[useRealtimeNotifications] Received foreground push event');
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
            // NOTE: Conversation list updates handled by realtime subscription
        };

        window.addEventListener('foreground-notification', handleForegroundPush);

        return () => {
            console.log(`[useRealtimeNotifications] Unsubscribing`);
            unsubscribe();
            window.removeEventListener('notification-log-insert', handleCustomEvent);
            window.removeEventListener('foreground-notification', handleForegroundPush);
        };
    }, [queryClient, user?.id]);
}

