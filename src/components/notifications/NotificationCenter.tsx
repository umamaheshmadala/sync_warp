import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, UserPlus, Check, Share2, X, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useAuthStore } from '@/store/authStore';

interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, any>;
    route_to?: string;
    is_read: boolean;
    created_at: string;
}

const NOTIFICATION_ICONS = {
    friend_request: UserPlus,
    friend_accepted: Check,
    deal_shared: Share2,
    birthday_reminder: Gift,
} as const;

const NOTIFICATION_COLORS = {
    friend_request: 'text-blue-500 bg-blue-50',
    friend_accepted: 'text-green-500 bg-green-50',
    deal_shared: 'text-purple-500 bg-purple-50',
    birthday_reminder: 'text-pink-500 bg-pink-50',
} as const;

export function NotificationCenter() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuthStore();

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .neq('type', 'message_received')
                .neq('type', 'message_reply')
                .neq('type', 'coupon_shared_message')
                .neq('type', 'deal_shared_message')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data as Notification[];
        },
        staleTime: 1000 * 30, // 30 seconds
    });

    // Real-time updates
    useRealtimeNotifications();

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            console.log('[NotificationCenter] Mark all as read triggered');
            if (!user?.id) {
                console.error('[NotificationCenter] No user ID found');
                return;
            }

            console.log('[NotificationCenter] Updating notifications for user:', user.id);
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) {
                console.error('[NotificationCenter] Error marking all as read:', error);
                throw error;
            }
            console.log('[NotificationCenter] Mark all as read success');
        },
        onSuccess: () => {
            console.log('[NotificationCenter] Invalidating queries');
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
        },
    });

    const handleNotificationClick = (notification: Notification) => {
        console.log('[NotificationCenter] Notification clicked:', notification);

        // Mark as read
        if (!notification.is_read) {
            markAsReadMutation.mutate(notification.id);
        }

        // Navigate based on route_to field or fallback to type-based routing
        if (notification.route_to) {
            console.log('[NotificationCenter] Navigating to:', notification.route_to);
            navigate(notification.route_to);
            setIsOpen(false);
        } else {
            // Fallback routing logic if route_to is missing
            console.log('[NotificationCenter] No route_to, using fallback for type:', notification.type);
            switch (notification.type) {
                case 'friend_request':
                    navigate('/friends/requests');
                    break;
                case 'friend_accepted':
                    navigate('/friends');
                    break;
                case 'deal_shared':
                    // Assuming deal_id is in data
                    if (notification.data?.deal_id) {
                        navigate(`/deals/${notification.data.deal_id}`);
                    }
                    break;
                case 'birthday_reminder':
                    // Navigate to friend's profile or chat
                    if (notification.data?.friend_id) {
                        navigate(`/profile/${notification.data.friend_id}`);
                    }
                    break;
            }
            setIsOpen(false);
        }
    };

    const handleMarkAllAsRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        markAllAsReadMutation.mutate();
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Notifications"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            disabled={markAllAsReadMutation.isPending}
                            className="h-auto px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notification List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => {
                                const Icon = NOTIFICATION_ICONS[notification.type as keyof typeof NOTIFICATION_ICONS] || Bell;
                                const colorClass = NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] || 'text-gray-500 bg-gray-50';

                                return (
                                    <DropdownMenuItem
                                        key={notification.id}
                                        className={cn(
                                            'flex items-start space-x-3 p-4 cursor-pointer focus:bg-gray-50 outline-none',
                                            !notification.is_read && 'bg-blue-50/30'
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={`p-2 rounded-full ${colorClass} flex-shrink-0 mt-0.5`}>
                                            <Icon className="h-4 w-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 leading-snug">
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1.5">
                                                {formatDistanceToNow(new Date(notification.created_at), {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                        </div>

                                        {!notification.is_read && (
                                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                                        )}
                                    </DropdownMenuItem>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t bg-gray-50/50">
                    <Button
                        variant="ghost"
                        className="w-full text-xs h-9"
                        onClick={() => {
                            navigate('/notifications');
                            setIsOpen(false);
                        }}
                    >
                        View all notifications
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
