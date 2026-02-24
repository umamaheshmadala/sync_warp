
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCircle, MessageSquare, Tag, UserPlus, Shield, ClipboardList, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InAppNotification } from '@/services/notificationService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import {
  NotificationGroup,
  isNotificationGroup
} from '@/utils/notificationGrouping';

interface NotificationItemProps {
  notification: InAppNotification | NotificationGroup;
  onClick: (notification: InAppNotification | NotificationGroup) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
  const navigate = useNavigate();
  const isGroup = isNotificationGroup(notification);

  const getIcon = () => {
    // If it's a group, typically messages
    if (isGroup) {
      if (notification.type === 'message_group') {
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      }
      return <Bell className="h-4 w-4 text-gray-600" />;
    }

    const singleNotification = notification as InAppNotification;
    switch (singleNotification.notification_type) {
      case 'new_message':
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-indigo-600" />;
      case 'friend_accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'deal_shared':
      case 'coupon_shared_message':
        return <Tag className="h-4 w-4 text-purple-600" />;
      case 'review_moderation':
        return notification.title.toLowerCase().includes('published')
          ? <CheckCircle className="h-4 w-4 text-green-600" />
          : <XCircle className="h-4 w-4 text-red-600" />;
      case 'admin_review_pending':
        return <ClipboardList className="h-4 w-4 text-orange-600" />;
      case 'business_approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'business_rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    if (isGroup) {
      if (notification.type === 'message_group') {
        return 'bg-blue-100';
      }
      return 'bg-gray-100';
    }

    const singleNotification = notification as InAppNotification;
    switch (singleNotification.notification_type) {
      case 'new_message':
      case 'message':
        return 'bg-blue-100';
      case 'friend_request':
        return 'bg-indigo-100';
      case 'friend_accepted':
        return 'bg-green-100';
      case 'deal_shared':
      case 'coupon_shared_message':
        return 'bg-purple-100';
      case 'review_moderation':
        return singleNotification.title.toLowerCase().includes('published')
          ? 'bg-green-100'
          : 'bg-red-100';
      case 'admin_review_pending':
        return 'bg-orange-100';
      case 'business_approved':
        return 'bg-green-100';
      case 'business_rejected':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const isOpened = isGroup
    ? (notification as NotificationGroup).notifications.every(n => n.opened) // Group is read if all are read? Or just check if count > 0 unread? 
    // Actually, usually if *any* is unread, the group is unread.
    // Let's assume for simpler logic: if the *group* object itself doesn't explicitly track read status separate from children, we check children.
    // In our utility, we didn't set 'opened' on the group.
    // Let's derive it:
    : (notification as InAppNotification).opened;

  // Check unread status for group: sensitive!
  // If ANY child is unread, show as unread.
  const showUnreadIndicator = isGroup
    ? (notification as NotificationGroup).notifications.some(n => !n.opened)
    : !(notification as InAppNotification).opened;

  return (
    <div
      onClick={() => onClick(notification)}
      className={cn(
        'w-full p-4 flex items-start gap-4 transition-colors cursor-pointer border-b hover:bg-gray-50',
        !showUnreadIndicator ? 'bg-white' : 'bg-blue-50/40',
        isGroup && 'relative' // For stacked effect
      )}
    >
      {/* Stacked card effect behind the main item if it's a group */}
      {isGroup && (
        <>
          <div className="absolute top-2 left-6 right-6 h-full bg-white border border-gray-200 rounded-lg shadow-sm -z-10 transform translate-y-2 scale-[0.95]" />
        </>
      )}

      <div className="relative">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={
            notification.data?.businessAvatar ||
            (isGroup ? notification.sender_avatar : (notification as InAppNotification).notification_type === 'review_moderation' ? undefined : notification.sender_avatar) ||
            undefined
          } />
          <AvatarFallback>
            {(notification.data?.businessName || notification.sender_name)?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full bg-white shadow-sm ring-1 ring-white", getBgColor())}>
          {getIcon()}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {notification.title}
        </p>
        <p className={cn("text-sm text-gray-600 line-clamp-2 mt-0.5", isGroup && "font-medium text-blue-600")}>
          {notification.body}
        </p>
        <p className="text-xs text-gray-400 mt-1.5">
          {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
        </p>
      </div>

      {showUnreadIndicator && (
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
      )}
    </div>
  );
};
