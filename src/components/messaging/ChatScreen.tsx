import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMessages } from '../../hooks/useMessages'
import { useTypingIndicator } from '../../hooks/useTypingIndicator'
import { useSendMessage } from '../../hooks/useSendMessage'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { ChatHeader } from './ChatHeader'
import { TypingIndicator } from './TypingIndicator'
import { Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { App } from '@capacitor/app'
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
    // Only scroll if a new message was added (not on load more)
    if (messages.length > prevMessageCount.current) {
      scrollToBottom()
    }
    prevMessageCount.current = messages.length
  }, [messages.length])

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // Delay to ensure DOM is ready
      setTimeout(() => scrollToBottom('auto'), 100)
    }
  }, [isLoading])

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

  return (
    <div 
      className="flex flex-col h-screen bg-white chat-screen"
      style={{ paddingBottom: keyboardPadding }}
    >
      <ChatHeader conversationId={conversationId} />
      
      <MessageList 
        messages={messages} 
        hasMore={hasMore}
        onLoadMore={loadMore}
        isLoading={isLoading}
        onRetry={handleRetry}
      />
      
      {isTyping && <TypingIndicator userIds={typingUserIds} />}
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
      
      <MessageComposer 
        conversationId={conversationId}
        onTyping={handleTyping}
      />
    </div>
  )
}
