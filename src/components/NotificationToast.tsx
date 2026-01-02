import React, { useState, useEffect } from 'react'
import { NotificationRouter, NotificationData } from '../services/notificationRouter'
import { Bell, MessageCircle, UserPlus, Tag, X } from 'lucide-react'

export interface NotificationToastProps {
  title: string
  body: string
  data: NotificationData
  onDismiss: () => void
  onTap: () => void
}

/**
 * NotificationToast
 * 
 * Displays an in-app toast notification for foreground push notifications.
 * valid types: 'message', 'friend_req', 'system', 'promotion' (mapped in router)
 */
export const NotificationToast: React.FC<NotificationToastProps> = ({
  title,
  body,
  data,
  onDismiss,
  onTap
}) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss()
    }, 300) // Wait for exit animation
  }

  const handleTap = () => {
    setIsVisible(false)
    setTimeout(() => {
      onTap()
      onDismiss()
    }, 300)
  }

  // Determine styles based on notification type
  let bgClass = 'bg-gray-800'
  let icon = <Bell className="w-5 h-5 text-white" />

  switch (data.type) {
    case 'message':
      bgClass = 'bg-indigo-500' // Messages -> Indigo
      icon = <MessageCircle className="w-5 h-5 text-white" />
      break
    case 'friend_request':
    case 'friend_accepted':
    case 'follower':
    case 'birthday_reminder':
      bgClass = 'bg-emerald-500' // Social -> Green
      icon = <UserPlus className="w-5 h-5 text-white" />
      break
    case 'offer':
    case 'deal_shared':
    case 'business':
    case 'review':
      bgClass = 'bg-purple-500' // Business/Promo -> Purple
      icon = <Tag className="w-5 h-5 text-white" />
      break
    case 'test':
    default:
      bgClass = 'bg-gray-800' // System/Test -> Dark Gray
      icon = <Bell className="w-5 h-5 text-white" />
      break
  }

  // If not visible, render nothing (or handle exit animation via CSS classes/motion)
  // For simplicity with Tailwind, we'll use a fixed position container in App.tsx generally,
  // but here we are rendered conditionally.
  // We'll add animation classes.

  if (!isVisible && !title) return null; // Safety check

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-md px-4 pointer-events-none transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
    >
      <div
        className={`${bgClass} shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}
        onClick={handleTap}
        role="alert"
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="bg-white/20 rounded-full p-1.5">
                {icon}
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-white mb-0.5">
                {title}
              </p>
              <p className="text-sm font-medium text-white/90">
                {body}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/20">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDismiss()
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
