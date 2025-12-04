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
import { Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { App } from '@capacitor/app'
import { messagingService } from '../../services/messagingService'
import { conversationManagementService } from '../../services/conversationManagementService'
import type { Message } from '../../types/messaging'
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
  const [keyboardPadding, setKeyboardPadding] = useState(0)
  const prevMessageCount = useRef(messages.length)
  
  // Reply state (Story 8.10.5)
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

  // Forward state (Story 8.10.6)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)

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

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // Delay to ensure DOM is ready
      setTimeout(() => scrollToBottom('auto'), 100)
    }
  }, [isLoading])

  // Mark conversation as read when entering chat
  useEffect(() => {
    if (conversationId) {
      conversationManagementService.markConversationAsRead(conversationId)
        .then(() => {
          // Dispatch event to trigger conversation list refresh
          window.dispatchEvent(new CustomEvent('conversation-updated', { detail: { conversationId } }))
        })
        .catch(err => console.error('Failed to mark conversation as read:', err))
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

  // Scroll to message handler (Story 8.10.5)
  const handleQuoteClick = (messageId: string) => {
    console.log('📍 Scrolling to message:', messageId)
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the message briefly
      messageElement.classList.add('message-highlight')
      setTimeout(() => {
        messageElement.classList.remove('message-highlight')
      }, 2000)
    } else {
      console.warn('Message not found in current view:', messageId)
      // TODO: Load more messages if needed
    }
  }

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
      style={{ paddingBottom: keyboardPadding }}
    >
      <ChatHeader conversationId={conversationId} />
      
      <MessageList 
        messages={messages} 
        hasMore={hasMore}
        onLoadMore={loadMore}
        isLoading={isLoading}
        onRetry={handleRetry}
        onReply={handleReply}
        onForward={handleForward}
        onQuoteClick={handleQuoteClick}
      />
      
      {isTyping && <TypingIndicator userIds={typingUserIds} />}
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
      
      {/* Message Composer - No bottom padding on mobile */}
      <div className="md:pb-0">
        <MessageComposer 
          conversationId={conversationId}
          onTyping={handleTyping}
          replyToMessage={replyToMessage}
          onCancelReply={handleCancelReply}
        />
      </div>

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
    </div>
  )
}
