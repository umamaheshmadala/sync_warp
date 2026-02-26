import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMessages } from '../../hooks/useMessages'
import { useTypingIndicator } from '../../hooks/useTypingIndicator'
import { useSendMessage } from '../../hooks/useSendMessage'
import { MessageList, type MessageListHandle } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { ChatHeader } from './ChatHeader'
import { TypingIndicator } from './TypingIndicator'
import { ForwardMessageDialog } from './ForwardMessageDialog'
import { MessageSearchBar } from './MessageSearchBar'
import { MessageSearchResults } from './MessageSearchResults'
import { Loader2, Search } from 'lucide-react'
import { useMessageSearch } from '../../hooks/useMessageSearch'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { App } from '@capacitor/app'
import { messagingService } from '../../services/messagingService'
import { conversationManagementService } from '../../services/conversationManagementService'
import type { Message } from '../../types/messaging'
import { usePinnedMessages } from '../../hooks/usePinnedMessages'
import { PinnedMessagesBanner } from './PinnedMessagesBanner'
import { PinDurationDialog } from './PinDurationDialog'
import type { PinDuration } from '../../services/pinnedMessageService'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useMessagingStore } from '../../store/messagingStore'
import { useConversations } from '../../hooks/useConversations'
import './ChatScreen.css'
import { friendsService } from '../../services/friendsService'
import { useFriendProfile } from '../../hooks/friends/useFriendProfile'
import { useScrollPosition } from '../../hooks/useScrollPosition'
import { ScrollToBottomFAB } from './ScrollToBottomFAB'

/**
 * ChatScreen Component
 * 
 * Main chat interface with:
 * - Chat header with back button
 * - Scrollable message list with pagination
 * - Typing indicator
 * - Message composer
 * - Mobile keyboard handling
 * - Auto-scroll on new messages
 * 
 * Features:
 * - Adapts to keyboard show/hide on mobile
 * - Auto-scrolls to bottom on new messages
 * - Load more on scroll up
 * - Realtime message updates
 * 
 * @example
 * ```tsx
 * // In router:
 * <Route path="/messages/:conversationId" element={<ChatScreen />} />
 * ```
 */
export default function ChatScreen() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const setActiveConversation = useMessagingStore((state) => state.setActiveConversation); // For clearing unread count and tracking active
  // Set active conversation on mount
  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId)
    }
    return () => setActiveConversation(null)
  }, [conversationId, setActiveConversation])

  const {
    messages,
    isLoading,
    hasMore,
    loadMore,
    isFetchingOlder
  } = useMessages(conversationId || null)
  const { scrollContainerRef, isAtBottom, scrollToBottom: scrollToBottomHook, showScrollButton: showScrollButtonFromHook } = useScrollPosition()
  const { isTyping, typingUserIds, handleTyping } = useTypingIndicator(conversationId || null)
  const { retryMessage } = useSendMessage() // For retrying failed messages (Story 8.2.7)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const listHandleRef = useRef<MessageListHandle>(null)
  const prevLastMessageId = useRef<string | null>(null)
  const prevMessageCount = useRef<number>(0)

  // Ref to lock scroll to bottom during initial load phase
  const stickyBottomLockRef = useRef(false)

  // Ref to track isAtBottom for event listeners (avoids stale closures) — Story 8.12.1 AC#5
  const isAtBottomRef = useRef(isAtBottom)
  useEffect(() => { isAtBottomRef.current = isAtBottom }, [isAtBottom])

  // Throttle ref for bulk message auto-scroll — Story 8.12.1 AC#9
  const scrollThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Local unread count for FAB (Story 8.12.2)
  const [unreadCountSinceScroll, setUnreadCountSinceScroll] = useState(0)

  // Reset local unread count when we scroll to bottom
  useEffect(() => {
    if (isAtBottom) {
      setUnreadCountSinceScroll(0)
    }
  }, [isAtBottom])

  // Reply state (Story 8.10.5)
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

  // Forward state (Story 8.10.6)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)

  // Edit state (Story 8.5.2 - WhatsApp-style editing)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)

  // Pin state (Story 8.5.7)
  const { pinnedMessages, pinMessage, unpinMessage, isMessagePinned, canPin } = usePinnedMessages(conversationId || '')
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinningMessageId, setPinningMessageId] = useState<string | null>(null)

  // Last read state (for unread divider)
  // undefined = loading, null = no record (all unread), string = timestamp
  const [lastReadAt, setLastReadAt] = useState<string | null | undefined>(undefined)
  const currentUserId = useAuthStore(state => state.user?.id)

  // Fetch last read timestamp when entering conversation
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    const fetchLastRead = async () => {
      try {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select('last_read_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUserId)
          .maybeSingle()

        if (error) throw error

        console.log('📖 Fetched last_read_at:', data?.last_read_at)
        setLastReadAt(data?.last_read_at || null)
      } catch (err) {
        console.error('Failed to fetch last read status:', err)
        setLastReadAt(null)
      }
    }

    fetchLastRead()
  }, [conversationId, currentUserId])



  // Search state (Story 8.5.4)
  const [showSearch, setShowSearch] = useState(false)
  const {
    results: searchResults,
    isSearching,
    selectedIndex,
    search,
    navigate: navigateSearch,
    clearSearch,
    setSelectedIndex
  } = useMessageSearch(conversationId || undefined)

  // Determine Other User ID
  const { conversations } = useConversations();
  const conversation = conversations.find(c => c.conversation_id === conversationId)
  const otherUserId = conversation
    ? (conversation.participant1_id === currentUserId ? conversation.participant2_id : conversation.participant1_id)
    : null

  console.log('👥 ChatScreen resolving user:', {
    conversationFound: !!conversation,
    storeSize: conversations.length,
    currentUserId,
    otherUserId
  })

  // Fetch Friend Profile (for Privacy Settings)
  const { data: friendProfileData, isError: isProfileError, error: profileError } = useFriendProfile(otherUserId || '')
  const friendReadReceiptsEnabled = friendProfileData?.profile?.read_receipts_enabled ?? true


  // Friendship Check
  const [isFriend, setIsFriend] = useState<boolean | null>(null)

  useEffect(() => {
    if (!conversationId || !currentUserId || !otherUserId) return

    const checkFriendship = async () => {
      const areFriends = await friendsService.areFriends(currentUserId, otherUserId)
      setIsFriend(areFriends)
    }

    checkFriendship()
    // Listen for friend updates
    window.addEventListener('friends-updated', checkFriendship)
    return () => window.removeEventListener('friends-updated', checkFriendship)
  }, [conversationId, currentUserId, otherUserId])

  // Scroll to bottom helper (adapts hook to expected interface)
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    scrollToBottomHook(behavior)
  }

  // Auto-scroll to bottom on new messages (Smart Scroll)
  useEffect(() => {
    // If we have no messages, nothing to do
    if (messages.length === 0) return

    // Get the last message
    const lastMessage = messages[messages.length - 1]

    // Check if the current user sent it
    const isUserMessage = lastMessage?.sender_id === currentUserId || (lastMessage?._optimistic)

    // Check if the last message has changed (indicates new message at bottom vs history loaded at top)
    const isNewMessageAtBottom = lastMessage?.id !== prevLastMessageId.current

    // Is this the very first load of messages for this conversation?
    const isInitialLoad = prevMessageCount.current === 0;

    // Scroll automatically if:
    // 1. We have more messages than before AND the last message is new
    // 2. We are NOT on the initial load (Virtuoso handles initial load statically)
    if (!isInitialLoad && messages.length > prevMessageCount.current && isNewMessageAtBottom) {
      if (isUserMessage || isAtBottom) {
        console.log('📜 Smart Scroll: Scrolling to bottom', { isUserMessage, isAtBottom })
        // Throttle auto-scroll for burst messages (Story 8.12.1 AC#9)
        // During rapid message arrival, only the final scroll fires after 150ms of quiet
        if (scrollThrottleRef.current) clearTimeout(scrollThrottleRef.current)
        scrollThrottleRef.current = setTimeout(() => {
          scrollToBottomHook('smooth')
          scrollThrottleRef.current = null
        }, 150)
      } else {
        // We are not at bottom and received a new message -> increment unread count
        // Only if it's NOT a user message (user messages auto-scroll anyway)
        if (!isUserMessage) {
          setUnreadCountSinceScroll(prev => prev + 1)
        }
        console.log('📜 Smart Scroll: staying put (not at bottom)', { isUserMessage, isAtBottom })
      }
    }

    prevMessageCount.current = messages.length
    prevLastMessageId.current = lastMessage?.id || null
  }, [messages.length, messages[messages.length - 1]?.id, isAtBottom, scrollToBottomHook, currentUserId])

  // Initial scroll handling (Smart Load)
  // Handled synchronously in MessageList now for Zero Layout Shift
  const [initialScrollDone, setInitialScrollDone] = useState(false)

  // Reset initial scroll state when conversation changes (Story 8.12.3 fix)
  useEffect(() => {
    setInitialScrollDone(false)
  }, [conversationId])

  // Mark conversation as read ONLY when user is actively viewing
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    // CRITICAL: Wait for lastReadAt to be fetched (not undefined)
    if (lastReadAt === undefined) return

    // Helper to mark as read only if document is visible and focused
    const markAsReadIfVisible = async () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        console.log('👁️ User viewing chat - marking as read:', conversationId)

        try {
          // 1. Call standard RPC (updates message statuses)
          await conversationManagementService.markConversationAsRead(conversationId)

          // 2. Manually update conversation_participants.last_read_at
          // (Since RPC might not update it yet)
          const now = new Date().toISOString()
          const { error, count } = await supabase
            .from('conversation_participants')
            .update({ last_read_at: now })
            .eq('conversation_id', conversationId)
            .eq('user_id', currentUserId)
            .select() // Select to confirm update

          if (error) {
            console.error('❌ Failed to update participant last_read_at:', error)
          } else {
            console.log('✅ Updated last_read_at to:', now)
          }

          // 3. Update React Query cache to clear unread count (fixes badge not updating)
          queryClient.setQueryData<typeof conversations>(['conversations'], (old = []) =>
            old.map(c => c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c)
          )
          console.log('✅ Cleared unread count in store for conversation:', conversationId)

        } catch (err) {
          console.error('Failed to mark conversation as read:', err)
        }
      } else {
        console.log('👁️ Chat not in focus/visible - NOT marking as read')
      }
    }

    // Mark as read on mount
    markAsReadIfVisible()

    // Mark as read when user returns
    const handleVisibilityChange = () => {
      console.log('👁️ Visibility changed:', document.visibilityState)
      if (document.visibilityState === 'visible') {
        markAsReadIfVisible()
      }
    }

    const handleFocus = () => {
      console.log('👁️ Window focused')
      markAsReadIfVisible()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
    // Added messages.length to trigger when new messages arrive while viewing
  }, [conversationId, currentUserId, lastReadAt, messages.length])

  // Mobile keyboard handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Keyboard listeners
    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', () => {
        console.log('⌨️ Keyboard showing')

        // Only auto-scroll when user is already at bottom (Story 8.12.1 AC#5)
        // Prevents yanking user away from history when tapping input
        if (isAtBottomRef.current) {
          setTimeout(() => scrollToBottom('auto'), 100)
        }
      })

      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        console.log('⌨️ Keyboard hiding')
        // Maintain bottom anchor when keyboard dismisses interactively (Story 8.12.1 AC#8)
        if (isAtBottomRef.current) {
          setTimeout(() => scrollToBottom('auto'), 100)
        }
      })
    }

    setupListeners()

    return () => {
      if (showListener) showListener.remove()
      if (hideListener) hideListener.remove()
    }
  }, [])

  // Android back button handling (Story 8.2.8)
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return

    let backListener: any;

    const setupBackListener = async () => {
      backListener = await App.addListener('backButton', () => {
        // Navigate back to conversation list
        navigate('/messages')
      })
    }

    setupBackListener()

    return () => {
      if (backListener) backListener.remove()
    }
  }, [navigate])

  // Retry handler for failed messages
  const handleRetry = useCallback((message: Message) => {
    console.log('🔄 Retrying message:', message.id)
    retryMessage(message)
  }, [retryMessage])

  // Reply handler (Story 8.10.5)
  const handleReply = useCallback((message: Message) => {
    console.log('💬 Replying to message:', message.id)
    setReplyToMessage(message)
  }, [])

  // Cancel reply handler (Story 8.10.5)
  const handleCancelReply = useCallback(() => {
    console.log('❌ Cancelled reply')
    setReplyToMessage(null)
  }, [])

  // Edit handler (Story 8.5.2 - WhatsApp-style)
  const handleEdit = useCallback((message: Message) => {
    console.log('✏️ Editing message:', message.id)
    setEditingMessage(message)
    // Clear reply if any
    setReplyToMessage(null)
  }, [])

  // Cancel edit handler (Story 8.5.2)
  const handleCancelEdit = useCallback(() => {
    console.log('❌ Cancelled edit')
    setEditingMessage(null)
  }, [])

  // Scroll to message with highlight (Story 8.5.4 / 8.12.2 AC#6-7)
  const scrollToMessage = useCallback(async (messageId: string) => {
    // 1. Fast path: try to scroll natively using Virtuoso's imperative handle
    if (listHandleRef.current?.scrollToMessage(messageId)) {
      return
    }

    // 2. Slow path: fetch messages around the target (Story 8.12.2 AC#6-7)
    if (!conversationId) return
    try {
      console.log('📍 Fetching context for message:', messageId)
      const { messages: aroundMessages } = await messagingService.fetchMessagesAround(
        conversationId, messageId
      )
      if (aroundMessages.length > 0) {
        // Replace current message window in store
        queryClient.setQueryData(['messages', conversationId], (old: any) => ({ ...old, messages: aroundMessages }))

        // Wait for React and Virtuoso to render the new state array
        await new Promise(resolve => setTimeout(resolve, 300))

        // Try to scroll natively again now that the data is loaded in Virtuoso
        if (listHandleRef.current?.scrollToMessage(messageId)) {
          return
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch messages around target:', err)
    }

    console.warn('⚠️ Message not found even after fetch-around:', messageId)
  }, [conversationId])

  // Scroll to message handler (Story 8.10.5)
  const handleQuoteClick = useCallback((messageId: string) => {
    console.log('📍 Scrolling to message:', messageId)
    scrollToMessage(messageId)
  }, [scrollToMessage])

  // Handle search result click
  const handleSearchResultClick = useCallback((result: { id: string }) => {
    scrollToMessage(result.id)
    setShowSearch(false)
    clearSearch()
  }, [scrollToMessage, clearSearch])

  // Pin handlers (Story 8.5.7)
  const handlePinRequest = useCallback((messageId: string) => {
    setPinningMessageId(messageId)
    setShowPinDialog(true)
  }, [])

  const handleConfirmPin = useCallback((duration: PinDuration) => {
    if (pinningMessageId) {
      pinMessage(pinningMessageId, duration)
    }
  }, [pinningMessageId, pinMessage])

  // Keyboard shortcut for search (Ctrl/Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Redirect if no conversation ID
  if (!conversationId) {
    navigate('/messages')
    return null
  }

  // Loading state handled inside the main return now
  // if (isLoading && messages.length === 0) {
  //   return (
  //     <div className="flex items-center justify-center h-screen bg-white">
  //       <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  //     </div>
  //   )
  // }



  // Forward handler (Story 8.10.6)
  const handleForward = useCallback((message: Message) => {
    console.log('↪️ Forwarding message:', message.id)
    setForwardMessage(message)
  }, [])



  return (
    <div
      className="flex flex-col flex-1 bg-white chat-screen !pb-0 !mb-0"
    >
      <ChatHeader
        conversationId={conversationId}
        onSearchClick={() => {
          setShowSearch(true)
          // Focus search input after a short delay to allow render
          setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder="Search messages..."]') as HTMLInputElement
            if (searchInput) searchInput.focus()
          }, 100)
        }}
      />

      {/* Pinned Messages Banner (Story 8.5.7) */}
      <PinnedMessagesBanner
        pinnedMessages={pinnedMessages}
        onMessageClick={scrollToMessage}
        onUnpin={unpinMessage}
      />

      {/* Search UI (Story 8.5.4) */}
      {showSearch && (
        <div className="border-b bg-white z-10">
          <MessageSearchBar
            onSearch={search}
            onClose={() => {
              setShowSearch(false)
              clearSearch()
            }}
            onNavigate={navigateSearch}
            isLoading={isSearching}
            resultCount={searchResults.length}
            currentIndex={selectedIndex}
          />
          {searchResults.length > 0 && (
            <MessageSearchResults
              results={searchResults}
              onResultClick={handleSearchResultClick}
              selectedIndex={selectedIndex}
            />
          )}
        </div>
      )}

      {isLoading && messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Start the conversation</h3>
          <p className="text-sm text-gray-500">Say hello and send your first message!</p>
        </div>
      ) : (
        <MessageList
          ref={scrollContainerRef}
          messages={messages}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isLoading={isLoading}
          initialScrollDone={initialScrollDone}
          onInitialScrollComplete={() => setInitialScrollDone(true)}
          isFetchingOlder={isFetchingOlder} // New prop for pagination loading
          onRetry={handleRetry}
          onReply={handleReply}
          onForward={handleForward}
          onEdit={handleEdit}
          onQuoteClick={handleQuoteClick}
          messagesEndRef={messagesEndRef}
          onPin={handlePinRequest}
          onUnpin={unpinMessage}
          isMessagePinned={isMessagePinned}
          lastReadAt={lastReadAt}
          friendReadReceiptsEnabled={friendReadReceiptsEnabled}
          listHandleRef={listHandleRef}
        />
      )}

      <ScrollToBottomFAB
        isVisible={showScrollButtonFromHook}
        unreadCount={unreadCountSinceScroll}
        onPress={() => scrollToBottom('smooth')}
      />

      {isTyping && (
        <TypingIndicator
          userIds={typingUserIds}
          names={typingUserIds.map(userId => {
            // For each typing user ID, find the name
            // 1. Check if it's the other participant in a DM
            const conversation = conversations.find(c => c.conversation_id === conversationId)
            if (conversation) {
              // If this is a DM, we can use the other_participant_name from details
              if (conversation.other_participant_id === userId) {
                return conversation.other_participant_name || 'Someone'
              }
            }
            // Fallback if we can't find the name (e.g. group chat without member details loaded)
            return 'Someone'
          })}
        />
      )}

      {/* Message Composer or Not Friends Banner */}
      {isFriend === false ? (
        <div className="bg-gray-50 border-t p-4 text-center">
          <p className="text-gray-500 text-sm">
            This user is no longer in your friends list.
          </p>
        </div>
      ) : (
        <MessageComposer
          conversationId={conversationId}
          onTyping={handleTyping}
          replyToMessage={replyToMessage}
          onCancelReply={handleCancelReply}
          editingMessage={editingMessage}
          onCancelEdit={handleCancelEdit}
          initialText={location.state?.initialMessage as string | undefined}
        />
      )}


      {/* Forward Dialog */}
      {forwardMessage && (
        <ForwardMessageDialog
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
          onForwarded={() => {
            console.log('✅ Message forwarded successfully')
            // Optional: Scroll to bottom or show toast
          }}
        />
      )}

      {/* Pin Duration Dialog */}
      <PinDurationDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onConfirm={handleConfirmPin}
      />


    </div>
  )
}
