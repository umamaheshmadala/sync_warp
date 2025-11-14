import React, { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { useSendMessage } from '../../hooks/useSendMessage'
import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'

interface MessageComposerProps {
  conversationId: string
  onTyping: () => void
}

/**
 * MessageComposer Component
 * 
 * Message input with:
 * - Auto-resizing textarea
 * - Send button (disabled when empty)
 * - Enter to send (Shift+Enter for new line)
 * - Typing indicator integration
 * - Mobile haptic feedback on send
 * 
 * @example
 * ```tsx
 * <MessageComposer
 *   conversationId={conversationId}
 *   onTyping={handleTyping}
 * />
 * ```
 */
export function MessageComposer({ conversationId, onTyping }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const { sendMessage, isSending } = useSendMessage()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const handleSend = async () => {
    if (!content.trim() || isSending) return

    try {
      // Haptic feedback on send (mobile only)
      if (Capacitor.isNativePlatform()) {
        try {
          await Haptics.notification({ type: NotificationType.Success })
        } catch (error) {
          console.warn('Haptic feedback not available:', error)
        }
      }

      await sendMessage({
        conversationId,
        content: content.trim(),
        contentType: 'text'
      })
      
      setContent('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      // Error toast is handled in useSendMessage
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter to send (unless Shift is held)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    onTyping() // Broadcast typing indicator
  }

  return (
    <div className="border-t bg-white px-4 py-3 safe-area-bottom">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
          disabled={isSending}
          aria-label="Message input"
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          size="icon"
          className="h-11 w-11 flex-shrink-0"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
