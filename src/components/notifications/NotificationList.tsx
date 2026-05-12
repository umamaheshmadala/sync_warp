import React, { useState } from 'react';
import { Check, Inbox } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { InAppNotification } from '../../services/notificationService';
import { groupNotifications, NotificationGroup } from '../../utils/notificationGrouping';

interface NotificationListProps {
  notifications: InAppNotification[];
  loading: boolean;
  onNotificationClick: (notification: InAppNotification | NotificationGroup) => void;
  onDeleteNotification?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  maxHeight?: string;
}

export function NotificationList({
  notifications,
  loading,
  onNotificationClick,
  onDeleteNotification,
  onMarkAllAsRead,
  maxHeight = '480px',
}: NotificationListProps) {
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const unreadCount = notifications.filter(n => !n.opened).length;
  const hasUnread = unreadCount > 0;

  // Group notifications
  const groupedNotifications = groupNotifications(notifications);

  const handleMarkAllAsRead = async () => {
    if (!onMarkAllAsRead || !hasUnread) return;

    try {
      setIsMarkingAllRead(true);
      await onMarkAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Inbox className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No notifications
        </h3>
        <p className="text-sm text-gray-500">
          You're all caught up! Check back later for updates.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {hasUnread && (
            <p className="text-xs text-gray-500 mt-0.5">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {hasUnread && onMarkAllAsRead && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead}
            className="
              flex items-center gap-1.5 px-3 py-1.5 
              text-xs font-medium text-blue-600 
              hover:bg-blue-50 rounded-md
              transition-colors disabled:opacity-50
            "
          >
            <Check className="w-3.5 h-3.5" />
            {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div
        className="overflow-y-auto bg-white"
        style={{ maxHeight }}
      >
        {groupedNotifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={() => onNotificationClick(notification)}
          />
        ))}
      </div>

      {/* Footer */}
      {notifications.length >= 50 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            Showing latest 50 notifications
          </p>
        </div>
      )}
    </div>
  );
}
