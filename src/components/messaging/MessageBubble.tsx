import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Check, CheckCheck } from 'lucide-react'
import type { Message } from '../../types/messaging'
import { cn } from '../../lib/utils'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
}

/**
 * MessageBubble Component
 * 
 * Displays a single message with:
 * - Different styling for own vs friend messages
 * - Timestamp (relative time)
 * - Edited indicator
 * - Deleted message handling
 * - Message status icons (optional)
 * 
 * @example
 * ```tsx
 * <MessageBubble
 *   message={message}
 *   isOwn={message.sender_id === currentUserId}
 *   showTimestamp={true}
 * />
 * ```
 */
export function MessageBubble({ 
  message, 
  isOwn, 
  showTimestamp = false 
}: MessageBubbleProps) {
  const {
    content,
    created_at,
    is_edited,
    is_deleted
  } = message

  // Deleted message
  if (is_deleted) {
    return (
      <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
        <div className="max-w-[70%] px-4 py-2 rounded-lg bg-gray-100 text-gray-400 italic text-sm">
          Message deleted
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[70%] px-4 py-2 rounded-lg break-words",
        isOwn 
          ? "bg-blue-600 text-white rounded-br-none" 
          : "bg-gray-200 text-gray-900 rounded-bl-none"
      )}>
        {/* Message Content */}
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        
        {/* Timestamp & Status Row */}
        <div className="flex items-center justify-end gap-1 mt-1">
          {is_edited && (
            <span className={cn(
              "text-xs",
              isOwn ? "text-blue-100" : "text-gray-500"
            )}>
              edited
            </span>
          )}
          
          {showTimestamp && (
            <span className={cn(
              "text-xs",
              isOwn ? "text-blue-100" : "text-gray-500"
            )}>
              {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
            </span>
          )}
          
          {/* Message Status Icons (for own messages) */}
          {isOwn && (
            <span className="text-blue-100">
              {/* TODO: Add status based on message.status field when implemented */}
              {/* For now, just show delivered (double check) */}
              <CheckCheck className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
