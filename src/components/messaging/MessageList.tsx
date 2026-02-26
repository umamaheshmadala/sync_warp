import React, { useEffect, useRef, useState, useMemo, useImperativeHandle } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { MessageBubble } from './MessageBubble'
import { DateSeparator } from './DateSeparator'
import { Loader2 } from 'lucide-react'
import type { Message } from '../../types/messaging'
import { parseDatabaseDate } from '../../utils/dateUtils'
import { format, isToday, isYesterday, isSameYear, differenceInCalendarDays } from 'date-fns'
import { GroupedVirtuoso, GroupedVirtuosoHandle } from 'react-virtuoso'

export interface MessageListHandle {
  scrollToMessage: (messageId: string) => boolean;
}

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
  listHandleRef?: React.Ref<MessageListHandle>
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
  friendReadReceiptsEnabled = true,
  listHandleRef
}, ref) => {
  const currentUserId = useAuthStore(state => state.user?.id)

  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null)

  // O(N) deduplication + sorting via useMemo (Performance Fix)
  // Previously this was O(N^2) inside the render body, causing 250k+ iterations per frame
  const sortedMessages = useMemo(() => {
    const seen = new Map<string, Message>()
    for (const msg of messages) {
      // Keep the latest version of each message (by id)
      seen.set(msg.id, msg)
    }
    return Array.from(seen.values()).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [messages])

  useImperativeHandle(listHandleRef, () => ({
    scrollToMessage: (messageId: string) => {
      if (!virtuosoRef.current) return false;
      const index = sortedMessages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        virtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
        // Give Virtuoso time to render the DOM node, then apply flash
        setTimeout(() => {
          const el = document.getElementById(`message-${messageId}`);
          if (el) {
            el.classList.add('search-highlight-flash');
            setTimeout(() => {
              el.classList.remove('search-highlight-flash');
            }, 2000);
          }
        }, 100); // 100ms should be enough for virtualization engine
        return true;
      }
      return false;
    }
  }), [sortedMessages]);

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

  const viewModels = useMemo(() => {
    let firstUnreadIndex = -1
    const lastMessage = sortedMessages[sortedMessages.length - 1]
    const isLastMessageOutgoing = lastMessage?.sender_id === currentUserId

    if (isLastMessageOutgoing) {
      firstUnreadIndex = -1
    } else if (frozenReadAt !== undefined && frozenReadAt !== null) {
      firstUnreadIndex = sortedMessages.findIndex(m => {
        return new Date(m.created_at).getTime() > new Date(frozenReadAt).getTime()
      })
    } else if (frozenReadAt === null && sortedMessages.length > 0) {
      firstUnreadIndex = 0
    }

    let lastDate: string | null = null
    const groupLabels: string[] = []
    const groupCounts: number[] = []
    let currentGroupCount = 0
    let currentGroupLabel: string | null = null

    const flatViewModels = sortedMessages.map((message, index) => {
      const showTimestamp = index === 0 || index % 10 === 0
      const isIncoming = message.sender_id !== currentUserId
      const showUnreadDivider = firstUnreadIndex >= 0 && index === firstUnreadIndex && isIncoming

      const messageDate = parseDatabaseDate(message.created_at)
      const dateKey = messageDate ? format(messageDate, 'yyyy-MM-dd') : null

      let dateLabel = currentGroupLabel || ''
      if (dateKey !== currentGroupLabel && messageDate) {
        if (isToday(messageDate)) dateLabel = 'Today'
        else if (isYesterday(messageDate)) dateLabel = 'Yesterday'
        else {
          const now = new Date()
          const diffInDays = differenceInCalendarDays(now, messageDate)
          if (diffInDays < 7 && diffInDays > 0) dateLabel = format(messageDate, 'EEEE')
          else if (isSameYear(messageDate, now)) dateLabel = format(messageDate, 'MMMM d')
          else dateLabel = format(messageDate, 'MMMM d, yyyy')
        }

        if (currentGroupLabel !== null) {
          groupCounts.push(currentGroupCount)
          groupLabels.push(currentGroupLabel)
        }
        currentGroupCount = 0
        currentGroupLabel = dateLabel
      }

      currentGroupCount++;

      return {
        message,
        showTimestamp,
        showUnreadDivider,
        dateLabel
      }
    })

    if (currentGroupLabel !== null) {
      groupCounts.push(currentGroupCount)
      groupLabels.push(currentGroupLabel)
    }

    return { flatViewModels, groupCounts, groupLabels }
  }, [sortedMessages, currentUserId, frozenReadAt])

  // Fire onInitialScrollComplete once on mount since Virtuoso handles scroll
  useEffect(() => {
    // If not done AND we have messages AND frozenReadAt is settled
    if (!initialScrollDone && messages.length > 0 && frozenReadAt !== undefined) {
      if (onInitialScrollComplete) {
        onInitialScrollComplete()
      }
    }
  }, [initialScrollDone, messages.length, frozenReadAt, onInitialScrollComplete])

  // Start reached callback
  const handleStartReached = React.useCallback(() => {
    if (hasMore && !isLoading && initialScrollDone) {
      onLoadMore()
    }
  }, [hasMore, isLoading, initialScrollDone, onLoadMore])

  // Determine initial scroll index ONLY once per chat session
  const initialTopMostItemIndex = useMemo(() => {
    if (frozenReadAt === undefined || viewModels.flatViewModels.length === 0) return undefined

    // Find the first unread message to jump to
    const index = viewModels.flatViewModels.findIndex(v => v.showUnreadDivider)
    if (index !== -1) return { index, align: 'center' as const }

    // If no unread messages, virtuoso auto-scrolls to bottom if we omit this or use 'LAST'
    return { index: 'LAST' as const, align: 'end' as const }
  }, [frozenReadAt, viewModels])

  return (
    <div className="relative flex-1 flex flex-col h-full min-h-0 bg-white">
      {frozenReadAt !== undefined ? (
        <GroupedVirtuoso
          ref={virtuosoRef}
          scrollerRef={(el) => {
            if (typeof ref === 'function') ref(el as HTMLDivElement);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el as HTMLDivElement;
          }}
          data={viewModels.flatViewModels}
          className="message-list-scroll scrollbar-hide"
          groupCounts={viewModels.groupCounts}
          groupContent={(index) => {
            return <DateSeparator label={viewModels.groupLabels[index]} />
          }}
          initialTopMostItemIndex={initialTopMostItemIndex}
          startReached={handleStartReached}
          alignToBottom
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          components={{
            TopItemList: React.forwardRef(({ style, ...props }: React.HTMLAttributes<HTMLDivElement>, ref) => (
              <div
                {...props}
                ref={ref as any}
                style={{ ...style, zIndex: 50 }}
                className="pointer-events-none"
              />
            )),
            Group: React.forwardRef(({ style, ...props }: React.HTMLAttributes<HTMLDivElement>, ref) => (
              <div
                {...props}
                ref={ref as any}
                style={{ ...style, zIndex: 20 }}
                className="pointer-events-none"
              />
            )),
            Header: () => (
              <div className="flex flex-col items-center">
                {messagesEndRef && <div ref={messagesEndRef} className="hidden" />}
                {(isFetchingOlder || (isLoading && hasMore)) && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                )}
                {!hasMore && messages.length > 0 && (
                  <div className="flex justify-center py-6 pb-8">
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      Start of conversation
                    </span>
                  </div>
                )}
              </div>
            )
          }}
          itemContent={(index, groupIndex) => {
            const vm = viewModels.flatViewModels[index];
            if (!vm) return null;
            const { message, showTimestamp, showUnreadDivider } = vm;
            return (
              <div className="px-4 pb-1">
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
              </div>
            )
          }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      )}
    </div>
  )
})
