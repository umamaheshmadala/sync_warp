
import { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
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
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { InAppNotification } from '@/services/notificationService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { groupNotifications, NotificationGroup, isNotificationGroup } from '@/utils/notificationGrouping';
import { MessageSquare } from 'lucide-react';

export function NotificationCenter() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

    // Access the shared hook
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead
    } = useInAppNotifications();

    // Access the shared hook for navigation
    const { handleNavigation } = useNotificationNavigation();

    // Take top 5 for the dropdown to keep it lightweight
    // Group them first, then slice? Or slice then group? 
    // Better to group all first, then slice, so we show the top 5 *groups/items*.
    const groupedNotifications = groupNotifications(notifications);
    const recentNotifications = groupedNotifications.slice(0, 5);

    const handleNotificationClick = async (notification: InAppNotification | NotificationGroup) => {
        if (isNotificationGroup(notification)) {
            // Mark all in group as read? Or just navigate?
            // Let's assume navigating handles it or we should mark specific ones.
            // For now, mark the group's children as read locally or let the user action do it.
            notification.notifications.forEach(n => {
                if (!n.opened) markAsRead(n.id);
            });

            // Navigate based on the *latest* notification in the group
            handleNavigation(notification.notifications[0]);
        } else {
            if (!notification.opened) {
                markAsRead(notification.id);
            }
            handleNavigation(notification);
        }

        setIsOpen(false);
    };

    const handleMarkAllAsRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isMarkingAllRead) return;

        setIsMarkingAllRead(true);
        try {
            await markAllAsRead();
            // Optional/Optimistic: could set unreadCount to 0 locally if not reactive enough, 
            // but the hook handles invalidation.
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setIsMarkingAllRead(false);
        }
    };

    const handleViewAll = () => {
        navigate('/notifications');
        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
                    aria-label="Notifications"
                >
                    <Bell className="h-7 w-7" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 z-50">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
                    <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            disabled={isMarkingAllRead}
                            className="h-auto px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-6"
                        >
                            {isMarkingAllRead ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                                <Check className="h-3 w-3 mr-1" />
                            )}
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notification List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading && notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                            Loading...
                        </div>
                    ) : recentNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {recentNotifications.map((notification) => {
                                const isGroup = isNotificationGroup(notification);
                                // Type safe access
                                const senderName = isGroup ? notification.sender_name : (notification as InAppNotification).sender_name;
                                const senderAvatar = isGroup ? notification.sender_avatar : (notification as InAppNotification).sender_avatar;
                                const title = isGroup ? notification.title : (notification as InAppNotification).title;
                                const body = isGroup ? notification.body : (notification as InAppNotification).body;
                                const sentAt = notification.sent_at;
                                const opened = isGroup
                                    ? (notification as NotificationGroup).notifications.every(n => n.opened)
                                    : (notification as InAppNotification).opened;

                                return (
                                    <DropdownMenuItem
                                        key={notification.id}
                                        className={cn(
                                            'flex items-start space-x-3 p-4 cursor-pointer focus:bg-gray-50 outline-none',
                                            !opened && 'bg-blue-50/20',
                                            isGroup && 'relative'
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        {/* Stacked effect */}
                                        {isGroup && (
                                            <div className="absolute top-2 left-6 right-6 h-full bg-white border border-gray-200 rounded-lg shadow-sm -z-10 transform translate-y-2 scale-[0.95]" />
                                        )}

                                        <div className="relative">
                                            <Avatar className="h-8 w-8 border flex-shrink-0">
                                                <AvatarImage src={senderAvatar || undefined} />
                                                <AvatarFallback className="text-xs">{senderName?.[0] || '?'}</AvatarFallback>
                                            </Avatar>
                                            {isGroup && (
                                                <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-sm ring-1 ring-white bg-blue-100">
                                                    <MessageSquare className="h-3 w-3 text-blue-600" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 leading-snug truncate">
                                                {title}
                                            </p>
                                            <p className={cn("text-xs text-gray-500 mt-1 line-clamp-2", isGroup && "font-medium text-blue-600")}>
                                                {body}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1.5">
                                                {formatDistanceToNow(new Date(sentAt), { addSuffix: true })}
                                            </p>
                                        </div>

                                        {!opened && (
                                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                        )}
                                    </DropdownMenuItem>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t bg-gray-50/50">
                    <Button
                        variant="ghost"
                        className="w-full text-xs h-9 justify-center font-medium text-gray-600 hover:text-gray-900"
                        onClick={handleViewAll}
                    >
                        View all history
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
