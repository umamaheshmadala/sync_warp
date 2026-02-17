import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { MessageBubble } from './MessageBubble'
import { DateSeparator } from './DateSeparator'
import { Loader2 } from 'lucide-react'
import type { Message } from '../../types/messaging'
import { parseDatabaseDate } from '../../utils/dateUtils'
import { format, isToday, isYesterday, isSameYear, differenceInCalendarDays } from 'date-fns'

interface MessageListProps {
  messages: Message[]
  hasMore: boolean
  onLoadMore: () => void
  isLoading: boolean
  isFetchingOlder?: boolean // Optional for backward compatibility, but we should always pass it
  onRetry?: (message: Message) => void // Story 8.2.7 - Retry failed messages
  onReply?: (message: Message) => void // Story 8.10.5 - Reply to message
  onForward?: (message: Message) => void // Story 8.10.6 - Forward message
  onEdit?: (message: Message) => void // Story 8.5.2 - Edit message (WhatsApp-style)
  onQuoteClick?: (messageId: string) => void // Story 8.10.5 - Click quoted message
  messagesEndRef?: React.RefObject<HTMLDivElement> // Scroll anchor for auto-scroll
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
  isMessagePinned?: (messageId: string) => boolean
  lastReadAt?: string | null | undefined // For persistent unread divider
  friendReadReceiptsEnabled?: boolean
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
export const MessageList = React.forwardRef<HTMLDivElement, MessageListProps>(({
  messages,
  hasMore,
  onLoadMore,
  isLoading = false,
  isFetchingOlder = false,
  onRetry,
  onReply,
  onForward,
  onEdit,
  onQuoteClick,
  messagesEndRef, // We might not need this anymore if we use the main container, but keeping for now
  onPin,
  onUnpin,
  isMessagePinned,
  lastReadAt,
  friendReadReceiptsEnabled = true
}, ref) => {
  const currentUserId = useAuthStore(state => state.user?.id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLoadingMore = useRef(false)
  const prevScrollHeight = useRef(0)
  const { conversationId } = useParams<{ conversationId: string }>()

  // Track the initial last read timestamp for this session
  // undefined = waiting for data, null = no read history, string = timestamp
  const [frozenReadAt, setFrozenReadAt] = useState<string | null | undefined>(undefined)
  const prevConversationId = useRef<string | undefined>(conversationId)

  // Reset frozen timestamp when conversation changes
  if (prevConversationId.current !== conversationId) {
    setFrozenReadAt(undefined) // Reset to loading
    prevConversationId.current = conversationId
  }

  // Capture the last read timestamp once it's available
  // This effectively "freezes" the divider position for the duration of the chat session
  useEffect(() => {
    // Only set if we haven't set it yet (frozenReadAt is undefined)
    // AND lastReadAt has been fetched (it is not undefined)
    if (frozenReadAt === undefined && lastReadAt !== undefined) {
      console.log('❄️ Freezing divider at:', lastReadAt)
      setFrozenReadAt(lastReadAt)
    }
  }, [lastReadAt, frozenReadAt])

  // Sync forwarded ref with local ref
  useEffect(() => {
    if (!ref) return
    if (typeof ref === 'function') {
      ref(scrollRef.current)
    } else {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = scrollRef.current
    }
  }, [ref])

  // Scroll Anchor Maintenance Logic
  // Story 8.12.3: Prevent visual jumping when loading older messages
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Use LayoutEffect to interact with DOM before paint
  React.useLayoutEffect(() => {
    if (!scrollRef.current) return

    const currentScrollHeight = scrollRef.current.scrollHeight
    const heightCheck = currentScrollHeight - prevScrollHeight.current

    // If height increased significantly (suggesting prepend), restore position
    // We only do this if we were previously tracking a height (i.e., a load occurred)
    if (prevScrollHeight.current > 0 && heightCheck > 0) {
      console.log('⚓️ Restoring scroll anchor:', {
        prev: prevScrollHeight.current,
        curr: currentScrollHeight,
        delta: heightCheck
      })
      scrollRef.current.scrollTop += heightCheck
      prevScrollHeight.current = 0 // Reset
    }
  }, [messages]) // Run synchronously when messages update

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const scrollContainer = scrollRef.current
    const sentinel = sentinelRef.current

    if (!scrollContainer || !sentinel || !hasMore || isLoading) return

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        // Capture height BEFORE loading new messages
        prevScrollHeight.current = scrollContainer.scrollHeight
        console.log('📡 Load More Triggered. Snapshot height:', prevScrollHeight.current)
        onLoadMore()
      }
    }, {
      root: scrollContainer,
      rootMargin: '200px 0px 0px 0px', // Trigger 200px before top
      threshold: 0
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoading, onLoadMore])

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

  // Helper to format date labels
  const formatDateLabel = (dateString: string) => {
    const date = parseDatabaseDate(dateString)
    if (!date) return ''

    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'

    const now = new Date()
    const diffInDays = differenceInCalendarDays(now, date)

    // Show day name for the last 7 days
    if (diffInDays < 7 && diffInDays > 0) {
      return format(date, 'EEEE') // "Monday"
    }

    if (isSameYear(date, now)) return format(date, 'MMMM d') // "February 14"
    return format(date, 'MMMM d, yyyy') // "February 14, 2024"
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 message-list-scroll bg-white"
      style={{ overflowAnchor: 'none' }} // Disable browser auto-anchoring (Story 8.12.3)
    >
      {/* Sentinel & Loading Indicator */}
      <div ref={sentinelRef} className="h-px w-full" />

      {(isFetchingOlder || (isLoading && hasMore)) && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Start of Conversation Indicator */}
      {!hasMore && messages.length > 0 && (
        <div className="flex justify-center py-6 pb-8">
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            Start of conversation
          </span>
        </div>
      )}

      {/* Message Bubbles with Date Separators */}
      {(() => {
        // Deduplicate messages first
        const uniqueMessages = messages.reduce((acc, message) => {
          if (!acc.find(m => m.id === message.id)) {
            acc.push(message)
          }
          return acc
        }, [] as Message[])

        // Sort by created_at ascending (oldest first)
        const sortedMessages = uniqueMessages.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        let lastDate: string | null = null

        // Find index of first unread message using the FROZEN read timestamp
        let firstUnreadIndex = -1

        // Defensive check: If the latest message is sent by the current user, 
        // effectively everything is "read" by us (we don't need a divider).
        const lastMessage = sortedMessages[sortedMessages.length - 1]
        const isLastMessageOutgoing = lastMessage?.sender_id === currentUserId

        console.log('📊 MessageList Divider Calc:', {
          frozenReadAt,
          msgCount: sortedMessages.length,
          lastMsgOutgoing: isLastMessageOutgoing
        })

        if (isLastMessageOutgoing) {
          firstUnreadIndex = -1
        } else if (frozenReadAt === undefined) {
          // Still loading read status, don't show divider yet
          firstUnreadIndex = -1
        } else if (frozenReadAt !== null) {
          // We have a timestamp. Find first message NEWER than it.
          const firstUnread = sortedMessages.findIndex(m => {
            const msgDate = new Date(m.created_at)
            const readDate = new Date(frozenReadAt)
            return msgDate > readDate
          })

          if (firstUnread !== -1) {
            console.log('📍 Found first unread message at index:', firstUnread)
            firstUnreadIndex = firstUnread
          }
        } else if (uniqueMessages.length > 0) {
          // No read history found (frozenReadAt is null). Assume all unread.
          // BUT only if we have messages.
          console.log('⚠️ No frozenReadAt (null), treating start matching unread')
          firstUnreadIndex = 0
        }

        return uniqueMessages.map((message, index) => {
          // Show timestamp every 10 messages or on first message
          const showTimestamp = index === 0 || index % 10 === 0

          // Check if message is from another user to justify "New Messages" divider
          const isIncoming = message.sender_id !== currentUserId;

          // Show unread divider before this message if:
          // 1. We have a valid unread index (>= 0)
          // 2. This matches the index
          // 3. The message is incoming
          const showUnreadDivider = firstUnreadIndex >= 0 &&
            index === firstUnreadIndex &&
            isIncoming

          // Date Separator Logic
          const messageDate = parseDatabaseDate(message.created_at)
          const dateKey = messageDate ? format(messageDate, 'yyyy-MM-dd') : null

          let showDateSeparator = false
          if (dateKey && dateKey !== lastDate) {
            showDateSeparator = true
            lastDate = dateKey
          }

          return (
            <React.Fragment key={message.id}>
              {showDateSeparator && (
                <DateSeparator label={formatDateLabel(message.created_at)} />
              )}
              {showUnreadDivider && (
                <div className="flex items-center gap-3 py-3 px-2">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full shadow-sm">
                    New Messages
                  </span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                </div>
              )}
              <div id={`message-${message.id}`}>
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
                  friendReadReceiptsEnabled={friendReadReceiptsEnabled}
                />
              </div>
            </React.Fragment>
          )
        })
      })()}

      {/* Scroll anchor - positioned at end of messages */}
      {messagesEndRef && <div ref={messagesEndRef} />}
    </div >
  )
})
