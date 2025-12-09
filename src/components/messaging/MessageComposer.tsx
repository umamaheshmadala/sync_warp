import React, { useState, useRef, useEffect } from 'react'
import { Send, Plus, Image, Video, Paperclip, Smile, X, Pencil } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { ImageUploadButton } from './ImageUploadButton'
import { VideoUploadButton } from './VideoUploadButton'
import { LinkPreviewCard } from './LinkPreviewCard'
import { ReplyContext } from './ReplyContext'
import { useSendMessage } from '../../hooks/useSendMessage'
import { useLinkPreview } from '../../hooks/useLinkPreview'
import { shareTrackingService } from '../../services/shareTrackingService'
import { messageEditService } from '../../services/messageEditService'
import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'
import type { Message } from '../../types/messaging'
import { toast } from 'react-hot-toast'

interface MessageComposerProps {
  conversationId: string
  onTyping: () => void
  replyToMessage?: Message | null  // Message being replied to (Story 8.10.5)
  onCancelReply?: () => void  // Callback to cancel reply (Story 8.10.5)
  editingMessage?: Message | null  // Message being edited (Story 8.5.2 - WhatsApp style)
  onCancelEdit?: () => void  // Callback to cancel edit (Story 8.5.2)
}

/**
 * MessageComposer with WhatsApp-style layout
 * 
 * Layout: [+] [________Type a message________😊] [Send]
 * 
 * Features:
 * - Single '+' button opens attachment menu (Image, Video, File)
 * - Text input takes MAXIMUM width
 * - Emoji button inside text field (right side)
 * - Send button appears only when there's text
 */
export function MessageComposer({ conversationId, onTyping, replyToMessage, onCancelReply, editingMessage, onCancelEdit }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isEditSaving, setIsEditSaving] = useState(false)
  const { sendMessage, isSending } = useSendMessage()
  const { previews, removePreview, reset: resetPreviews } = useLinkPreview(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)

  // Populate content when editing message (WhatsApp-style)
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || '')
      // Focus the input
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [editingMessage])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [content])

  // Close attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false)
      }
    }
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAttachMenu])

  const handleSend = async () => {
    if (!content.trim() || isSending || isEditSaving) return

    // Handle edit mode (Story 8.5.2 - WhatsApp style)
    if (editingMessage) {
      if (content.trim() === editingMessage.content) {
        // No changes, just cancel
        onCancelEdit?.()
        setContent('')
        return
      }

      setIsEditSaving(true)
      try {
        const result = await messageEditService.editMessage(editingMessage.id, content.trim())
        if (result.success) {
          toast.success('Message edited')
          onCancelEdit?.()
          setContent('')
        } else {
          toast.error(result.message || 'Failed to edit message')
        }
      } catch (error) {
        console.error('Edit failed:', error)
        toast.error('Failed to edit message')
      } finally {
        setIsEditSaving(false)
      }
      return
    }

    // Normal send flow
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

  const hasText = content.trim().length > 0

  // Handle Escape key to cancel editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && editingMessage) {
      e.preventDefault()
      onCancelEdit?.()
      setContent('')
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white px-2 py-1 border-t">
      {/* Edit Context - WhatsApp style indicator */}
      {editingMessage && (
        <div className="mb-2 flex items-center gap-2 bg-blue-50 rounded-lg p-2 border-l-4 border-blue-500">
          <Pencil className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-600">Editing message</p>
            <p className="text-sm text-gray-600 truncate">{editingMessage.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onCancelEdit?.()
              setContent('')
            }}
            className="h-6 w-6 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Reply Context */}
      {replyToMessage && !editingMessage && (
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
        <div className="mb-2 space-y-2">
          {previews.map(preview => (
            <LinkPreviewCard 
              key={preview.url}
              preview={preview}
              onRemove={() => removePreview(preview.url)}
            />
          ))}
        </div>
      )}

      {/* Main Input Row - WhatsApp Style */}
      <div className="flex items-end gap-2">
        {/* Attachment Menu Button */}
        <div className="relative flex-shrink-0" ref={attachMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`h-10 w-10 rounded-full transition-all ${
              showAttachMenu 
                ? 'bg-blue-100 text-blue-600 rotate-45' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {showAttachMenu ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>

          {/* Attachment Popup Menu */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[160px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-1">
                {/* Image Upload */}
                <div onClick={() => setShowAttachMenu(false)}>
                  <ImageUploadButton 
                    conversationId={conversationId}
                    onUploadStart={() => setShowAttachMenu(false)}
                    onUploadComplete={() => {}}
                    variant="menu"
                  />
                </div>
                
                {/* Video Upload */}
                <div onClick={() => setShowAttachMenu(false)}>
                  <VideoUploadButton 
                    conversationId={conversationId}
                    onUploadStart={() => setShowAttachMenu(false)}
                    onUploadComplete={() => {}}
                    variant="menu"
                  />
                </div>

                {/* Document/File (placeholder for future) */}
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Paperclip className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Document</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Text Input Container - Takes Maximum Width */}
        <div className="flex-1 flex items-end bg-gray-100 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all overflow-hidden">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-none bg-transparent px-4 py-2.5 focus-visible:ring-0 placeholder:text-gray-400 text-sm leading-5"
            rows={1}
            disabled={isSending}
          />
          
          {/* Emoji Button - Inside text field */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 text-gray-400 hover:text-gray-600 hover:bg-transparent flex-shrink-0 mr-1"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Send Button - Only shows when there's text */}
        <Button
          onClick={handleSend}
          disabled={!hasText || isSending}
          size="icon"
          className={`h-10 w-10 rounded-full flex-shrink-0 transition-all ${
            hasText 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send className={`h-5 w-5 ${hasText ? '' : 'opacity-50'}`} />
        </Button>
      </div>
    </div>
  )
}
