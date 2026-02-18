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
  initialScrollDone: boolean // Story 8.12.3: Prevent premature load more
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
  onInitialScrollComplete?: () => void
}

/**
 * MessageList Component
 * 
 * Displays a scrollable list of messages with:
 * - Auto-scroll to bottom on new messages
 * - Load more (pagination) on scroll to top
 * - Own vs friend message differentiation
 * - Loading indicator for pagination
 */
export const MessageList = React.forwardRef<HTMLDivElement, MessageListProps>(({
  messages,
  hasMore,
  onLoadMore,
  isLoading = false,
  isFetchingOlder = false,
  initialScrollDone,
  onInitialScrollComplete,
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
  // Ref to lock scroll to bottom during initial load phase
  const stickyBottomLockRef = useRef(false)
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

  // Synchronous Initial Scroll Logic (Story 8.12.3: Zero Layout Shift)
  // Replaces the asynchronous useEffect in ChatScreen
  // Robust Initial Scroll Logic using MutationObserver (Story 8.12.3 Fix)
  // Replaces flaky useLayoutEffect to ensure we only scroll when DOM is truly ready
  useEffect(() => {
    // Requirements:
    // 1. Not done yet
    // 2. Have messages
    // 3. Read status is known
    // 4. Container exists
    if (initialScrollDone) return
    if (messages.length === 0) return
    if (lastReadAt === undefined) return
    if (!scrollRef.current) return

    const scrollContainer = scrollRef.current

    // Helper to perform the actual scroll
    const attemptScroll = () => {
      // Double check container existence
      if (!scrollContainer) return false

      // Check if messages are actually in the DOM
      // We look for message IDs to ensure content is rendered
      const messageNodes = scrollContainer.querySelectorAll('[id^="message-"]')
      if (messageNodes.length === 0) return false

      console.log('⚡️ MutationObserver: Messages detected in DOM, executing scroll headers')

      let targetMessageId: string | null = null

      // A. Determine Target
      if (lastReadAt !== null) {
        // Find first message newer than lastReadAt
        const firstUnread = messages.find(m => {
          const msgDate = new Date(m.created_at)
          const readDate = new Date(lastReadAt)
          return msgDate > readDate && m.sender_id !== currentUserId
        })
        if (firstUnread) {
          targetMessageId = firstUnread.id
          console.log('📍 Initial Load: Found unread message, targeting:', targetMessageId)
        }
      } else {
        // No read history (all unread) - Default to bottom instead of top
        // WhatsApp behavior: Always jump to latest, unless we specifically know where the user left off
        console.log('📍 Initial Load: No read history found, defaulting to bottom')
      }

      // B. Perform Scroll
      if (targetMessageId) {
        const el = document.getElementById(`message-${targetMessageId}`)
        if (el) {
          el.scrollIntoView({ block: 'center' })
          console.log('✅ Scrolled to target message:', targetMessageId)
        } else {
          console.warn('⚠️ Target message element not found despite DOM check, defaulting to bottom')
          scrollContainer.scrollTop = scrollContainer.scrollHeight
          stickyBottomLockRef.current = true // Lock to bottom
          setTimeout(() => { stickyBottomLockRef.current = false }, 1000)
        }
      } else {
        // Default: Scroll to bottom
        console.log('📍 Initial Load: No unread context, snapping to bottom')
        scrollContainer.scrollTop = scrollContainer.scrollHeight
        stickyBottomLockRef.current = true // Lock to bottom
        setTimeout(() => { stickyBottomLockRef.current = false }, 1000)
      }

      // C. Latch and Complete
      // Use double rAF to ensure layout is stable before enabling "Load More"
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // One final check to enforce bottom if that was our target
          if (!targetMessageId && scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight - 100) {
            console.log('⚠️ Scroll didn\'t stick to bottom, forcing again')
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }

          if (onInitialScrollComplete) {
            console.log('✅ Initial scroll complete. scrollTop:', scrollContainer.scrollTop)
            onInitialScrollComplete()
          }
        })
      })

      return true // Scroll attempted successfully
    }

    // Attempt immediately in case already rendered
    if (attemptScroll()) return

    // If not, observe for changes
    const observer = new MutationObserver((mutations) => {
      // Check if nodes were added
      const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0)
      if (hasAddedNodes) {
        if (attemptScroll()) {
          observer.disconnect()
        }
      }
    })

    observer.observe(scrollContainer, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [messages, lastReadAt, initialScrollDone, currentUserId, onInitialScrollComplete])


  // Content ref for ResizeObserver
  const contentRef = useRef<HTMLDivElement>(null)

  // ResizeObserver for handling image loads (Story 8.12.3 Additional Fix)
  // Keeps scroll at bottom if content grows while we are at the bottom
  useEffect(() => {
    if (!contentRef.current || !scrollRef.current) return

    const scrollContainer = scrollRef.current
    let lastHeight = scrollContainer.scrollHeight

    const observer = new ResizeObserver(() => {
      const currentHeight = scrollContainer.scrollHeight

      // If we haven't finished initial scroll, keep forcing it
      if (!initialScrollDone) {
        if (currentHeight > scrollContainer.clientHeight) {
          if (lastReadAt === null || lastReadAt === undefined) {
            const distanceFromBottom = currentHeight - scrollContainer.scrollTop - scrollContainer.clientHeight
            if (distanceFromBottom > 0) {
              scrollContainer.scrollTop = currentHeight
            }
          }
        }
        lastHeight = currentHeight
        return
      }

      // If initial scroll is done, implement "Sticky Bottom"
      // If user was at bottom (within threshold) before resize, keep them there
      // We use a comprehensive threshold because image loads can be large
      const distanceFromBottom = lastHeight - (scrollContainer.scrollTop + scrollContainer.clientHeight)
      const isAtBottom = distanceFromBottom < 150 // 150px threshold

      // If we were at bottom, and height changed, scroll to new bottom
      if (isAtBottom && currentHeight > lastHeight) {
        console.log('🖼️ Resize (image load?) detected, sticky scroll to bottom')
        scrollContainer.scrollTop = currentHeight
      }

      lastHeight = currentHeight
    })

    observer.observe(contentRef.current)

    return () => observer.disconnect()
  }, [initialScrollDone, lastReadAt])


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

    // CRITICAL FIX: Don't start observing until initial scroll is done!
    // This prevents "Load More" from triggering immediately on mount before
    // the auto-scroll has a chance to push us to the bottom.
    if (!scrollContainer || !sentinel || !hasMore || isLoading || !initialScrollDone) return

    console.log('👀 Observer activating. scrollTop:', scrollContainer.scrollTop, 'scrollHeight:', scrollContainer.scrollHeight)

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        // Capture height BEFORE loading new messages
        prevScrollHeight.current = scrollContainer.scrollHeight
        console.log('📡 Load More Triggered. Snapshot height:', prevScrollHeight.current, 'scrollTop:', scrollContainer.scrollTop)
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
  }, [hasMore, isLoading, onLoadMore, initialScrollDone])

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
      className="flex-1 overflow-y-auto message-list-scroll bg-white" // Removed padding/spacing from container
      style={{ overflowAnchor: 'none' }}
    >
      <div ref={contentRef} className="px-4 py-4 space-y-1">
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
      </div>
    </div >
  )
})
