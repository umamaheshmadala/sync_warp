
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { notificationService, InAppNotification } from '../services/notificationService';
import { useAuthStore } from '../store/authStore';

// Standalone hook for just the Badge count
export const useUnreadNotificationCount = () => {
    const { user } = useAuthStore();
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['notifications', 'unread', user?.id], // valid query key
        queryFn: notificationService.getUnreadCount,
        refetchInterval: 60000, 
        enabled: !!user,
    });
    return unreadCount;
};

export const useInAppNotifications = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const unreadCount = useUnreadNotificationCount();

    // Infinite Query for Notifications List
    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useInfiniteQuery({
        queryKey: ['notifications', user?.id], // Unique per user
        queryFn: ({ pageParam = 0 }) => notificationService.getNotifications(pageParam as number, 20),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            // Robust checks
            if (!lastPage || !allPages || !Array.isArray(allPages)) return undefined;
            
            const loadedCount = allPages.length * 20;
            const totalCount = lastPage.count || 0;
            
            if (loadedCount < totalCount) {
                return allPages.length; // Next page index
            }
            return undefined;
        },
        enabled: !!user,
        refetchOnWindowFocus: true, 
    });


    // Realtime Subscription
    useEffect(() => {
        if (!user) return; // Guard
        
        const channel = supabase
            .channel('notification-center-realtime-v2') // unique channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notification_log',
                },
                (payload) => {
                    console.log('[useInAppNotifications] New notification log detected. Refreshing list.');
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, user]);

    return {
        // Flatten pages into a single array
        notifications: data?.pages.flatMap(page => page.data) || [],
        totalCount: data?.pages[0]?.count || 0,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        unreadCount,
        markAsRead: async (id: string) => {
            await notificationService.markAsRead(id);
            if (user) {
                queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', user.id] });
            }
        },
        markAllAsRead: async () => {
            await notificationService.markAllAsRead();
             if (user) {
                queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', user.id] });
            }
        }
    };
};
