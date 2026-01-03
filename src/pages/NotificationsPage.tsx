
import React, { useEffect } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { Button } from '@/components/ui/button';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { InAppNotification } from '@/services/notificationService';
import { getNotificationRoute } from '@/utils/notificationRouter';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { ref, inView } = useInView();
  const {
    notifications,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    markAsRead,
    markAllAsRead,
    unreadCount
  } = useInAppNotifications();

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const handleNotificationClick = async (notification: InAppNotification) => {
    if (!notification.opened) {
      markAsRead(notification.id); // Validates query automatically via hook
    }

    // Use router helper if available, or manual logic
    try {
        // The data usually contains 'action_url' or we derive it
        const actionUrl = notification.data?.action_url;
        if (actionUrl) {
            navigate(actionUrl);
        } else {
             // Fallback routing logic
             // Ideally imported from utils/notificationRouter if compatible
             if (notification.notification_type.includes('message')) {
                 navigate(`/messages/${notification.data.conversation_id}`);
             }
        }
    } catch (e) {
        console.error("Navigation error", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 safe-top flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        </div>
        {unreadCount > 0 && (
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-medium"
                onClick={() => markAllAsRead()}
            >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
            </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl w-full mx-auto">
        {isLoading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 text-sm">Loading notifications...</p>
            </div>
        ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Check className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="text-gray-500 mt-2 max-w-xs">You have no notifications right now.</p>
            </div>
        ) : (
            <div className="bg-white shadow-sm sm:rounded-b-xl min-h-full">
                {notifications.map((notification) => (
                    <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                        onClick={handleNotificationClick} 
                    />
                ))}

                {/* Loading More Spinner */}
                {(hasNextPage || isFetchingNextPage) && (
                    <div ref={ref} className="py-6 flex justify-center">
                        <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
