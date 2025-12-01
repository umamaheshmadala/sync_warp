import React, { useState, useRef, useEffect } from 'react'
import { Check, CheckCheck, Clock, AlertCircle, RefreshCw, CornerDownRight } from 'lucide-react'
import type { Message } from '../../types/messaging'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { formatRelativeTime, formatMessageTime } from '../../utils/dateUtils'
import { MessageContextMenu } from './MessageContextMenu'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import toast from 'react-hot-toast'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
  onRetry?: (message: Message) => void // Callback for retry button (Story 8.2.7)
  onReply?: (message: Message) => void // Callback for reply action (Story 8.10.5)
  onQuoteClick?: (messageId: string) => void // Callback for clicking quoted message (Story 8.10.5)
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
 * - Full accessibility support (Story 8.2.8)
 * 
 * Accessibility Features:
 * - role="article" for screen readers
 * - Descriptive ARIA labels with sender and content
 * - Keyboard focusable
 * - Proper semantic HTML
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
  onRetry,
  onReply,
  onQuoteClick
}: MessageBubbleProps) {
  const {
    content,
    created_at,
    is_edited,
    is_deleted,
    _optimistic,
    _failed
  } = message

  // Context menu state
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  // Deleted message
  if (is_deleted) {
    return (
      <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
        <div 
          role="article"
          aria-label={`Deleted message from ${isOwn ? 'you' : 'friend'}`}
          className="px-3 py-2 rounded-lg bg-gray-50 text-gray-400 italic text-sm border border-gray-100"
        >
          Message deleted
        </div>
      </div>
    )
  }

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Get bubble position
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect()
      // Position menu near the message bubble
      setContextMenuPosition({ 
        x: isOwn ? rect.right - 180 : rect.left, // Align to message side
        y: rect.bottom + 5 // Just below the message
      })
      setShowContextMenu(true)
    }
  }

  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (Capacitor.isNativePlatform()) {
      longPressTimer.current = setTimeout(async () => {
        // Haptic feedback
        try {
          await Haptics.impact({ style: ImpactStyle.Medium })
        } catch (error) {
          console.warn('Haptic feedback not available:', error)
        }

        // Get bubble position for mobile
        if (bubbleRef.current) {
          const rect = bubbleRef.current.getBoundingClientRect()
          setContextMenuPosition({ 
            x: isOwn ? rect.right - 180 : rect.left,
            y: rect.bottom + 5
          })
          setShowContextMenu(true)
        }
      }, 500) // 500ms long press
    }
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast.success('Message copied')
  }

  // Generate descriptive ARIA label
  const timeAgo = formatRelativeTime(created_at)
  const statusText = _failed ? 'Failed to send' : _optimistic ? 'Sending' : 'Sent'
  const ariaLabel = `Message from ${isOwn ? 'you' : 'friend'}: ${content}. ${statusText}. ${timeAgo}`

  return (
    <div className={cn("flex mb-1", isOwn ? "justify-end" : "justify-start")}>
      <div className="flex flex-col gap-1 max-w-[85%]">
        {/* Quoted Message (if reply) */}
        {message.parent_message && (
          <button
            onClick={() => onQuoteClick?.(message.parent_message!.id)}
            className={cn(
              'flex items-start gap-2 p-2 rounded text-xs max-w-full',
              'border-l-2 hover:bg-gray-100 transition-colors text-left',
              isOwn
                ? 'bg-blue-100 border-blue-400 self-end'
                : 'bg-gray-100 border-gray-400 self-start'
            )}
          >
            <CornerDownRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-700 truncate">
                {message.parent_message.sender_name}
              </div>
              <div className="text-gray-600 truncate">
                {message.parent_message.type === 'text'
                  ? message.parent_message.content
                  : `[${message.parent_message.type}]`
                }
              </div>
            </div>
          </button>
        )}

        <div className="flex items-end gap-2">
        {/* Failed Retry Button */}
        {_failed && isOwn && onRetry && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onRetry(message)}
            aria-label="Retry sending message"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
        
        <div 
          ref={bubbleRef}
          role="article"
          aria-label={ariaLabel}
          tabIndex={0}
          onContextMenu={handleContextMenu}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          className={cn(
            "px-4 py-2 rounded-2xl break-words text-[15px] leading-relaxed shadow-sm cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            isOwn 
              ? _failed
                ? "bg-red-50 text-red-900 border border-red-200" 
                : "bg-[#0a66c2] text-white rounded-br-sm" // LinkedIn Blue
              : "bg-[#f3f2ef] text-gray-900 rounded-bl-sm" // LinkedIn Gray
          )}
        >
          {/* Message Content */}
          <p className="whitespace-pre-wrap">{content}</p>
          
          {/* Timestamp & Status Row */}
          <div className={cn(
            "flex items-center justify-end gap-1 mt-0.5",
            isOwn ? "text-blue-100/80" : "text-gray-400"
          )}>
            {is_edited && (
              <span className="text-[10px] italic">edited</span>
            )}
            
            <span className="text-[10px]">
              {formatMessageTime(created_at)}
            </span>
            
            {/* Message Status Icons (for own messages) */}
            {isOwn && (
              <span className="ml-0.5">
                {_failed ? (
                  <AlertCircle className="h-3 w-3 text-red-300" />
                ) : _optimistic ? (
                  <Clock className="h-3 w-3 animate-pulse" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <MessageContextMenu
          message={message}
          position={contextMenuPosition}
          isOwn={isOwn}
          onClose={() => setShowContextMenu(false)}
          onReply={() => onReply?.(message)}
          onCopy={handleCopy}
        />
      )}
    </div>
  )
}
