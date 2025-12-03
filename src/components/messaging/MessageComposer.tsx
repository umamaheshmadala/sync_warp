import React, { useState, useRef, useEffect } from 'react'
import { Send, Image, Paperclip, Smile } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { ImageUploadButton } from './ImageUploadButton'
import { VideoUploadButton } from './VideoUploadButton'
import { LinkPreviewCard } from './LinkPreviewCard'
import { ReplyContext } from './ReplyContext'
import { useSendMessage } from '../../hooks/useSendMessage'
import { useLinkPreview } from '../../hooks/useLinkPreview'
import { shareTrackingService } from '../../services/shareTrackingService'
import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'
import type { Message } from '../../types/messaging'
import { toast } from 'react-hot-toast'

interface MessageComposerProps {
  conversationId: string
  onTyping: () => void
  replyToMessage?: Message | null  // Message being replied to (Story 8.10.5)
  onCancelReply?: () => void  // Callback to cancel reply (Story 8.10.5)
}

export function MessageComposer({ conversationId, onTyping, replyToMessage, onCancelReply }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const { sendMessage, isSending } = useSendMessage()
  const { previews, removePreview, reset: resetPreviews } = useLinkPreview(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [content])

  const handleSend = async () => {
    if (!content.trim() || isSending) return

    try {
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
        type: 'text',
        linkPreviews: previews.length > 0 ? previews : undefined,
        replyToId: replyToMessage?.id  // Include reply_to_id if replying
      })

      // Track shares for coupon/deal link previews (Story 8.3.4)
      if (previews.length > 0) {
        for (const preview of previews) {
          if (preview.type === 'sync-coupon' && preview.metadata?.couponId) {
            await shareTrackingService.trackShare({
              shareableType: 'coupon',
              shareableId: preview.metadata.couponId,
              conversationId,
              shareMethod: 'message',
              metadata: {
                title: preview.title,
                via: 'message_composer'
              }
            })
          } else if (preview.type === 'sync-deal' && preview.metadata?.offerId) {
            await shareTrackingService.trackShare({
              shareableType: 'offer',
              shareableId: preview.metadata.offerId,
              conversationId,
              shareMethod: 'message',
              metadata: {
                title: preview.title,
                via: 'message_composer'
              }
            })
          }
        }
      }
      
      setContent('')
      resetPreviews()  // Clear link previews after sending
      onCancelReply?.()  // Clear reply context after sending
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    
    // Block coupon URLs (Story 8.3.4 Part 2)
    if (newValue.includes('sync://coupon/')) {
      toast.error('Please use the Share button in your wallet to share coupons', {
        duration: 3000,
        icon: '🎫'
      })
      return // Don't update content
    }
    
    setContent(newValue)
    onTyping()
  }

  return (
    <div className="bg-white px-4 py-3 border-t">
      {/* Reply Context */}
      {replyToMessage && (
        <div className="mb-2">
          <ReplyContext
            parentMessage={{
              id: replyToMessage.id,
              content: replyToMessage.content,
              sender_name: 'You', // Will be replaced with actual sender name from backend
              type: replyToMessage.type
            }}
            onCancel={onCancelReply!}
          />
        </div>
      )}

      {/* Link Previews */}
      {previews.length > 0 && (
        <div className="mb-3 space-y-2">
          {previews.map(preview => (
            <LinkPreviewCard 
              key={preview.url}
              preview={preview}
              onRemove={() => removePreview(preview.url)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 bg-gray-100 rounded-xl p-2 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          className="min-h-[24px] max-h-[120px] resize-none border-none bg-transparent p-0 focus-visible:ring-0 placeholder:text-gray-500 text-sm"
          rows={1}
          disabled={isSending}
        />
        
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <ImageUploadButton 
              conversationId={conversationId}
              onUploadStart={() => {}}
              onUploadComplete={() => {}}
            />
            <VideoUploadButton 
              conversationId={conversationId}
              onUploadStart={() => {}}
              onUploadComplete={() => {}}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-200/50">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-200/50">
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {content.trim() && (
              <Button
                onClick={handleSend}
                disabled={isSending}
                size="sm"
                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold"
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
