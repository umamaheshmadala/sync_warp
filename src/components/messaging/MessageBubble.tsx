import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Check, CheckCheck, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import type { Message } from '../../types/messaging'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
  onRetry?: (message: Message) => void // Callback for retry button (Story 8.2.7)
}

/**
 * MessageBubble Component
 * 
 * Displays a single message with:
 * - Different styling for own vs friend messages
 * - Timestamp (relative time)
 * - Edited indicator
 * - Deleted message handling
 * - Message status icons (sent/delivered/read)
 * - Optimistic UI state (sending...)
 * - Failed state with retry button (Story 8.2.7)
 * 
 * @example
 * ```tsx
 * <MessageBubble
 *   message={message}
 *   isOwn={message.sender_id === currentUserId}
 *   showTimestamp={true}
 *   onRetry={(msg) => handleRetry(msg)}
 * />
 * ```
 */
export function MessageBubble({ 
  message, 
  isOwn, 
  showTimestamp = false,
  onRetry
}: MessageBubbleProps) {
  const {
    content,
    created_at,
    is_edited,
    is_deleted,
    _optimistic,
    _failed
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
      <div className="flex items-end gap-2">
        {/* Failed Retry Button */}
        {_failed && isOwn && onRetry && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onRetry(message)}
            aria-label="Retry sending message"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        <div className={cn(
          "max-w-[70%] px-4 py-2 rounded-lg break-words",
          isOwn 
            ? _failed
              ? "bg-red-100 text-red-900 rounded-br-none border border-red-300" // Failed state
              : "bg-blue-600 text-white rounded-br-none" 
            : "bg-gray-200 text-gray-900 rounded-bl-none"
        )}>
          {/* Message Content */}
          <p className="text-sm whitespace-pre-wrap">{content}</p>
          
          {/* Timestamp & Status Row */}
          <div className="flex items-center justify-end gap-1 mt-1">
            {is_edited && (
              <span className={cn(
                "text-xs",
                isOwn ? (_failed ? "text-red-600" : "text-blue-100") : "text-gray-500"
              )}>
                edited
              </span>
            )}
            
            {showTimestamp && (
              <span className={cn(
                "text-xs",
                isOwn ? (_failed ? "text-red-600" : "text-blue-100") : "text-gray-500"
              )}>
                {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
              </span>
            )}
            
            {/* Message Status Icons (for own messages) */}
            {isOwn && (
              <span className={cn(
                _failed ? "text-red-600" : "text-blue-100"
              )}>
                {_failed ? (
                  // Failed state
                  <AlertCircle className="h-3 w-3" />
                ) : _optimistic ? (
                  // Sending state (optimistic)
                  <Clock className="h-3 w-3 animate-pulse" />
                ) : (
                  // Sent/Delivered state
                  <CheckCheck className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
