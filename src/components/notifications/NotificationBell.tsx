// src/components/notifications/NotificationBell.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { NotificationList } from './NotificationList';
import { useNotifications } from '../../hooks/useNotifications';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    handleNotificationClick,
    deleteNotification,
    markAllAsRead,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown when notification is clicked
  const handleNotificationItemClick = (notification: any) => {
    handleNotificationClick(notification);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          relative p-2 text-gray-600 hover:text-gray-900 
          hover:bg-gray-100 rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-6 h-6" />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="
            absolute -top-1 -right-1 
            min-w-[20px] h-5 px-1.5
            flex items-center justify-center
            bg-red-600 text-white text-xs font-bold
            rounded-full border-2 border-white
            animate-pulse
          ">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Pulse indicator for new notifications */}
        {unreadCount > 0 && (
          <span className="
            absolute -top-1 -right-1 
            w-5 h-5 bg-red-600 rounded-full
            animate-ping opacity-75
          " />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute right-0 mt-2 
            w-96 max-w-[calc(100vw-2rem)]
            bg-white rounded-lg shadow-xl 
            border border-gray-200
            z-50 overflow-hidden
          "
        >
          <NotificationList
            notifications={notifications}
            loading={loading}
            onNotificationClick={handleNotificationItemClick}
            onDeleteNotification={deleteNotification}
            onMarkAllAsRead={markAllAsRead}
          />
        </div>
      )}
    </div>
  );
}
