// src/components/notifications/NotificationItem.tsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';
import type { Notification } from '../../types/notification';
import {
  getNotificationIcon,
  getNotificationColor,
  iconComponents,
} from '../../utils/notificationRouter';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export function NotificationItem({
  notification,
  onClick,
  onDelete,
  showDelete = true,
}: NotificationItemProps) {
  const iconName = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);
  const IconComponent = iconComponents[iconName as keyof typeof iconComponents];

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex items-start gap-3 p-4 
        hover:bg-gray-50 cursor-pointer transition-colors
        border-b border-gray-100 last:border-b-0
        ${!notification.is_read ? 'bg-blue-50/50' : ''}
      `}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-2 top-6 w-2 h-2 bg-blue-600 rounded-full" />
      )}

      {/* Icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-full 
          flex items-center justify-center
          ${notification.is_read ? 'bg-gray-100' : 'bg-blue-100'}
        `}
      >
        {IconComponent && (
          <IconComponent className={`w-5 h-5 ${colorClass}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Sender avatar & name */}
        {notification.sender_name && (
          <div className="flex items-center gap-2 mb-1">
            {notification.sender_avatar ? (
              <img
                src={notification.sender_avatar}
                alt={notification.sender_name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                {notification.sender_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-gray-900">
              {notification.sender_name}
            </span>
          </div>
        )}

        {/* Title */}
        <p
          className={`
            text-sm text-gray-900 mb-1 line-clamp-1
            ${!notification.is_read ? 'font-semibold' : 'font-medium'}
          `}
        >
          {notification.title}
        </p>

        {/* Message */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
          {notification.message}
        </p>

        {/* Timestamp */}
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Delete button */}
      {showDelete && onDelete && (
        <button
          onClick={handleDelete}
          className="
            opacity-0 group-hover:opacity-100 transition-opacity
            flex-shrink-0 p-1 rounded-full hover:bg-gray-200
            text-gray-400 hover:text-gray-600
          "
          aria-label="Delete notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
