
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCircle, MessageSquare, Tag, UserPlus, Shield, ClipboardList, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InAppNotification } from '@/services/notificationService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: InAppNotification;
  onClick: (notification: InAppNotification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.notification_type) {
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
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.notification_type) {
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
        return notification.title.toLowerCase().includes('published')
          ? 'bg-green-100'
          : 'bg-red-100';
      case 'admin_review_pending':
        return 'bg-orange-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div
      onClick={() => onClick(notification)}
      className={cn(
        'w-full p-4 flex items-start gap-4 transition-colors cursor-pointer border-b hover:bg-gray-50',
        !notification.opened ? 'bg-blue-50/40' : 'bg-white'
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={
            notification.data?.businessAvatar ||
            (notification.notification_type === 'review_moderation' ? undefined : notification.sender_avatar) ||
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
        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <p className="text-xs text-gray-400 mt-1.5">
          {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
        </p>
      </div>

      {!notification.opened && (
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
      )}
    </div>
  );
};
