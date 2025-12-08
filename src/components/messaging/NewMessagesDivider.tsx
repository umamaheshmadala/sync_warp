import React from 'react'

interface NewMessagesDividerProps {
  unreadCount: number
}

/**
 * WhatsApp-style "New Messages" divider
 * Displays above the first unread message in a conversation
 */
export const NewMessagesDivider: React.FC<NewMessagesDividerProps> = ({ unreadCount }) => {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-gray-300" />
      <span className="text-[13px] font-medium text-gray-600 uppercase tracking-wide">
        {unreadCount} New Message{unreadCount > 1 ? 's' : ''}
      </span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  )
}
