// src/components/following/FollowerNotificationBell.tsx
// Notification bell with dropdown showing recent notifications from followed businesses

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { useFollowerNotifications } from '../../hooks/useFollowerNotifications';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const FollowerNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useFollowerNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug: Verify this component is rendering
  console.log('FollowerNotificationBell rendering - notifications:', notifications.length, 'unread:', unreadCount);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle notification click
  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id);

    // Navigate to action URL if available, otherwise business page
    const targetUrl = notification.action_url || getBusinessUrl(
      notification.business_id,
      notification.business?.business_name
    );
    navigate(targetUrl);
    setIsOpen(false);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_product':
        return '📦';
      case 'new_offer':
        return '🎉';
      case 'new_coupon':
        return '🎫';
      case 'announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-6 w-6 text-gray-700" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full animate-fadeIn"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <>
          {isOpen && (
                    <div
                      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
                    >
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
                          >
                            <CheckCheck className="h-4 w-4" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-12 text-center">
                            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No notifications yet</p>
                            <p className="text-gray-400 text-xs mt-1">
                              You'll see updates from businesses you follow here
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.slice(0, 10).map((notification) => (
                              <div
                                key={notification.id}
                                className={cn(
                                  'px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
                                  !notification.is_read && 'bg-indigo-50'
                                )}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="flex items-start space-x-3">
                                  {/* Icon */}
                                  <div className="flex-shrink-0 text-2xl">
                                    {getNotificationIcon(notification.notification_type)}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                          {notification.business?.business_name || 'Unknown Business'}
                                        </p>
                                        <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                                          {notification.title}
                                        </p>
                                      </div>
                                      {!notification.is_read && (
                                        <div className="flex-shrink-0 ml-2">
                                          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                          <button
                            onClick={() => {
                              navigate('/following/feed');
                              setIsOpen(false);
                            }}
                            className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            View all updates
                          </button>
                        </div>
                      )}
                    </div>
                  )}
          </>
    </div>
  );
};

export default FollowerNotificationBell;
