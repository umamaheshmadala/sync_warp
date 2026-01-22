import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useMessages } from '../../hooks/useMessages'
import { useTypingIndicator } from '../../hooks/useTypingIndicator'
import { useSendMessage } from '../../hooks/useSendMessage'
import { MessageList } from './MessageList'
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
import './ChatScreen.css'
import { friendsService } from '../../services/friendsService'
import { useFriendProfile } from '../../hooks/friends/useFriendProfile'

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
  const { updateConversation } = useMessagingStore() // For clearing unread count
  const { messages, isLoading, hasMore, loadMore } = useMessages(conversationId || null)
  const { isTyping, typingUserIds, handleTyping } = useTypingIndicator(conversationId || null)
  const { retryMessage } = useSendMessage() // For retrying failed messages (Story 8.2.7)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevMessageCount = useRef(messages.length)

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
  const { conversations } = useMessagingStore()
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

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: Capacitor.isNativePlatform() ? 'auto' : behavior,
        block: 'end'
      })
    }
  }

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    const isUserMessage = lastMessage?.sender_id === 'current_user' || (lastMessage?._optimistic)

    // Scroll if new message added OR if it's a user message (ensure visibility)
    if (messages.length > prevMessageCount.current || isUserMessage) {
      // Use a small timeout to ensure DOM is updated with new message height
      setTimeout(() => {
        scrollToBottom('smooth')
      }, 100)
    }
    prevMessageCount.current = messages.length
  }, [messages.length, messages[messages.length - 1]?.id])

  // Initial scroll to latest message
  useEffect(() => {
    if (messages.length > 0 && !isLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant', block: 'end' })
    }
  }, [isLoading])

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

          // 3. Update store to clear unread count (fixes badge not updating)
          updateConversation(conversationId, { unread_count: 0 })
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

        // Auto-scroll to bottom when keyboard shows
        setTimeout(() => scrollToBottom('auto'), 100)
      })

      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        console.log('⌨️ Keyboard hiding')
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
  const handleRetry = (message: Message) => {
    console.log('🔄 Retrying message:', message.id)
    retryMessage(message)
  }

  // Reply handler (Story 8.10.5)
  const handleReply = (message: Message) => {
    console.log('💬 Replying to message:', message.id)
    setReplyToMessage(message)
  }

  // Cancel reply handler (Story 8.10.5)
  const handleCancelReply = () => {
    console.log('❌ Cancelled reply')
    setReplyToMessage(null)
  }

  // Edit handler (Story 8.5.2 - WhatsApp-style)
  const handleEdit = (message: Message) => {
    console.log('✏️ Editing message:', message.id)
    setEditingMessage(message)
    // Clear reply if any
    setReplyToMessage(null)
  }

  // Cancel edit handler (Story 8.5.2)
  const handleCancelEdit = () => {
    console.log('❌ Cancelled edit')
    setEditingMessage(null)
  }

  // Scroll to message handler (Story 8.10.5)
  const handleQuoteClick = (messageId: string) => {
    console.log('📍 Scrolling to message:', messageId)
    scrollToMessage(messageId)
  }

  // Scroll to message with highlight (Story 8.5.4 - Search)
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the message briefly
      messageElement.classList.add('search-highlight-flash')
      setTimeout(() => {
        messageElement.classList.remove('search-highlight-flash')
      }, 2000)
    } else {
      console.warn('Message not found in current view:', messageId)
    }
  }

  // Handle search result click
  const handleSearchResultClick = (result: { id: string }) => {
    scrollToMessage(result.id)
    setShowSearch(false)
    clearSearch()
  }

  // Pin handlers (Story 8.5.7)
  const handlePinRequest = (messageId: string) => {
    setPinningMessageId(messageId)
    setShowPinDialog(true)
  }

  const handleConfirmPin = (duration: PinDuration) => {
    if (pinningMessageId) {
      pinMessage(pinningMessageId, duration)
    }
  }

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
  const handleForward = (message: Message) => {
    console.log('↪️ Forwarding message:', message.id)
    setForwardMessage(message)
  }



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
          messages={messages}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isLoading={isLoading}
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
        />
      )}

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
