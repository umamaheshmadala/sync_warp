
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
    const recentNotifications = notifications.slice(0, 5);

    const handleNotificationClick = async (notification: InAppNotification) => {
        if (!notification.opened) {
            markAsRead(notification.id);
        }

        handleNavigation(notification);
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
                            {recentNotifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={cn(
                                        'flex items-start space-x-3 p-4 cursor-pointer focus:bg-gray-50 outline-none',
                                        !notification.opened && 'bg-blue-50/20'
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <Avatar className="h-8 w-8 border flex-shrink-0">
                                        <AvatarImage src={notification.sender_avatar || undefined} />
                                        <AvatarFallback className="text-xs">{notification.sender_name?.[0] || '?'}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 leading-snug truncate">
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                            {notification.body}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1.5">
                                            {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                                        </p>
                                    </div>

                                    {!notification.opened && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                    )}
                                </DropdownMenuItem>
                            ))}
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
