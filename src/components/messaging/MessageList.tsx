import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'
import type { Message } from '../../types/messaging'

interface MessageListProps {
  messages: Message[]
  hasMore: boolean
  onLoadMore: () => void
  isLoading?: boolean
  onRetry?: (message: Message) => void // Story 8.2.7 - Retry failed messages
  onReply?: (message: Message) => void // Story 8.10.5 - Reply to message
  onForward?: (message: Message) => void // Story 8.10.6 - Forward message
  onEdit?: (message: Message) => void // Story 8.5.2 - Edit message (WhatsApp-style)
  onQuoteClick?: (messageId: string) => void // Story 8.10.5 - Click quoted message
  messagesEndRef?: React.RefObject<HTMLDivElement> // Scroll anchor for auto-scroll
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
  isMessagePinned?: (messageId: string) => boolean
  onMessageVisible?: (messageId: string) => void // Visibility-based read receipts
}

/**
 * MessageList Component
 * 
 * Displays a scrollable list of messages with:
 * - Auto-scroll to bottom on new messages
 * - Load more (pagination) on scroll to top
 * - Own vs friend message differentiation
 * - Loading indicator for pagination
 * 
 * @example
 * ```tsx
 * <MessageList
 *   messages={messages}
 *   hasMore={hasMore}
 *   onLoadMore={loadMore}
 *   isLoading={isLoading}
 *   onRetry={(msg) => handleRetry(msg)}
 * />
 * ```
 */
export function MessageList({ 
  messages, 
  hasMore, 
  onLoadMore,
  isLoading = false,
  onRetry,
  onReply,
  onForward,
  onEdit,
  onQuoteClick,
  messagesEndRef,
  onPin,
  onUnpin,
  isMessagePinned,
  onMessageVisible
}: MessageListProps) {
  const currentUserId = useAuthStore(state => state.user?.id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLoadingMore = useRef(false)
  const prevScrollHeight = useRef(0)

  // Handle scroll to load more messages
  const handleScroll = () => {
    if (!scrollRef.current || !hasMore || isLoadingMore.current) return

    const { scrollTop } = scrollRef.current
    
    // Load more when scrolled near top (within 100px)
    if (scrollTop < 100) {
      isLoadingMore.current = true
      prevScrollHeight.current = scrollRef.current.scrollHeight
      onLoadMore()
      
      // Reset loading flag after delay
      setTimeout(() => {
        isLoadingMore.current = false
      }, 1000)
    }
  }

  // Restore scroll position after loading more messages
  useEffect(() => {
    if (scrollRef.current && prevScrollHeight.current > 0) {
      const newScrollHeight = scrollRef.current.scrollHeight
      const heightDifference = newScrollHeight - prevScrollHeight.current
      
      if (heightDifference > 0) {
        scrollRef.current.scrollTop = heightDifference
        prevScrollHeight.current = 0
      }
    }
  }, [messages.length])

  // Add scroll listener
  useEffect(() => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [hasMore])

  // Empty state
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-lg font-medium text-gray-700 mb-2">
            No messages yet
          </p>
          <p className="text-sm text-gray-500">
            Send a message to start the conversation
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 message-list-scroll bg-white"
    >
      {/* Load More Indicator */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}
      
      {/* Message Bubbles */}
      {(() => {
        // Deduplicate messages by ID (handles optimistic + realtime duplicates)
        const uniqueMessages = messages.reduce((acc, message) => {
          if (!acc.find(m => m.id === message.id)) {
            acc.push(message)
          }
          return acc
        }, [] as Message[])

        return uniqueMessages.map((message, index) => {
          // Show timestamp every 10 messages or on first message
          const showTimestamp = index === 0 || index % 10 === 0
          
          return (
            <div key={message.id} id={`message-${message.id}`}>
              <MessageBubble
                message={message}
                isOwn={message.sender_id === currentUserId}
                showTimestamp={showTimestamp}
                onRetry={onRetry}
                onReply={onReply}
                onForward={onForward}
                onEdit={onEdit}
                onQuoteClick={onQuoteClick}
                currentUserId={currentUserId || ''}
                onPin={onPin}
                onUnpin={onUnpin}
                isMessagePinned={isMessagePinned}
                onMessageVisible={onMessageVisible}
              />
            </div>
          )
        })
      })()}
      
      {/* Scroll anchor - positioned at end of messages */}
      {messagesEndRef && <div ref={messagesEndRef} />}
    </div>
  )
}
