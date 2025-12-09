import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import './ChatScreen.css'

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
export function ChatScreen() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
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

  // Initial scroll to latest message (instant, no animation)
  // Messages are sorted DESC by created_at, so latest is at END of array
  useEffect(() => {
    if (messages.length > 0 && !isLoading && messagesEndRef.current) {
      // Instant scroll to bottom - no animation to avoid slow scroll with many messages
      messagesEndRef.current.scrollIntoView({ behavior: 'instant', block: 'end' })
    }
  }, [isLoading])

  // Mark conversation as read ONLY when user is actively viewing
  // This is the proper WhatsApp-style behavior
  useEffect(() => {
    if (!conversationId) return

    // Helper to mark as read only if document is visible and focused
    const markAsReadIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        console.log('👁️ User viewing chat - marking as read:', conversationId)
        // Use the original working RPC-based function
        conversationManagementService.markConversationAsRead(conversationId)
          .then(() => {
            // Dispatch event to trigger conversation list refresh
            window.dispatchEvent(new CustomEvent('conversation-updated', { detail: { conversationId } }))
          })
          .catch(err => console.error('Failed to mark conversation as read:', err))
      } else {
        console.log('👁️ Chat not in focus/visible - NOT marking as read')
      }
    }

    // Mark as read on mount (if visible)
    markAsReadIfVisible()

    // Mark as read when user returns to this tab/window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markAsReadIfVisible()
      }
    }

    const handleFocus = () => {
      markAsReadIfVisible()
    }

    // Listen for visibility and focus changes
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [conversationId])

  // Mobile keyboard handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Keyboard listeners
    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('⌨️ Keyboard showing, height:', info.keyboardHeight)
        setKeyboardPadding(info.keyboardHeight)
        
        // Auto-scroll to bottom when keyboard shows
        setTimeout(() => scrollToBottom('auto'), 100)
      })

      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        console.log('⌨️ Keyboard hiding')
        setKeyboardPadding(0)
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

  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }



  // Forward handler (Story 8.10.6)
  const handleForward = (message: Message) => {
    console.log('↪️ Forwarding message:', message.id)
    setForwardMessage(message)
  }



  return (
    <div 
      className="flex flex-col h-full bg-white chat-screen"
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
      />
      
      {isTyping && <TypingIndicator userIds={typingUserIds} />}
      
      {/* Message Composer */}
      <MessageComposer 
        conversationId={conversationId}
        onTyping={handleTyping}
        replyToMessage={replyToMessage}
        onCancelReply={handleCancelReply}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
      />

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
