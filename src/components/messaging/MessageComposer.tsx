import React, { useState, useRef, useEffect, Suspense } from 'react'
import { Send, Plus, Image, Video, Smile, X, Pencil } from 'lucide-react'
import { cn } from '../../lib/utils'
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

// Lazy load emoji picker to allow code splitting
const EmojiPicker = React.lazy(() => import('emoji-picker-react'))

interface MessageComposerProps {
  conversationId: string
  onTyping: () => void
  replyToMessage?: Message | null  // Message being replied to (Story 8.10.5)
  onCancelReply?: () => void  // Callback to cancel reply (Story 8.10.5)
  editingMessage?: Message | null  // Message being edited (Story 8.5.2 - WhatsApp style)
  onCancelEdit?: () => void  // Callback to cancel edit (Story 8.5.2)
  initialText?: string // Pre-fill text (Story 11.3.3.4)
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
export function MessageComposer({ conversationId, onTyping, replyToMessage, onCancelReply, editingMessage, onCancelEdit, initialText }: MessageComposerProps) {
  const [content, setContent] = useState(initialText || '')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isEditSaving, setIsEditSaving] = useState(false)
  const { sendMessage, isSending } = useSendMessage()
  const { previews, removePreview, reset: resetPreviews } = useLinkPreview(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Populate content when editing message (WhatsApp-style)
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || '')
      // Focus the input
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [editingMessage])

  // Handle initialText updates (if navigating to same component)
  useEffect(() => {
    if (initialText && !editingMessage && !content) {
      setContent(initialText)
    }
  }, [initialText])

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
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    if (showAttachMenu || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAttachMenu, showEmojiPicker])

  const handleSend = async () => {
    // Only block if empty or currently SAVING an edit (which needs to be synchronous)
    // We do NOT block normal sending even if a previous send is in progress (isSending is for overall hook state)
    if (!content.trim() || isEditSaving) return

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

    // Normal send flow - OPTIMIZED for speed

    // 1. Capture content and reset UI immediately
    const messageContent = content.trim();
    const currentPreviews = previews.length > 0 ? [...previews] : undefined;
    const replyToId = replyToMessage?.id;

    // Clear input and context immediately
    setContent('')
    resetPreviews()
    onCancelReply?.()

    // Keep focus (or re-focus)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    try {
      if (Capacitor.isNativePlatform()) {
        Haptics.notification({ type: NotificationType.Success }).catch(() => { });
      }

      // 2. Fire and forget (mostly) - let the hook handle the optimistic update and server call
      // We don't await this because we want the UI to be responsive immediately.
      // The hook handles errors internally via toast/state.
      sendMessage({
        conversationId,
        content: messageContent,
        type: 'text',
        linkPreviews: currentPreviews,
        replyToId: replyToId
      }).then(async () => {
        // Track shares asynchronously after send is initiated
        if (currentPreviews && currentPreviews.length > 0) {
          for (const preview of currentPreviews) {
            if (preview.type === 'sync-coupon' && preview.metadata?.couponId) {
              shareTrackingService.trackShare({
                shareableType: 'coupon',
                shareableId: preview.metadata.couponId,
                conversationId,
                shareMethod: 'message',
                metadata: { title: preview.title, via: 'message_composer' }
              }).catch(console.error);
            } else if (preview.type === 'sync-deal' && preview.metadata?.offerId) {
              shareTrackingService.trackShare({
                shareableType: 'offer',
                shareableId: preview.metadata.offerId,
                conversationId,
                shareMethod: 'message',
                metadata: { title: preview.title, via: 'message_composer' }
              }).catch(console.error);
            }
          }
        }
      }).catch(err => {
        console.error('Background send failed:', err);
        // The hook manages the failed state in the store, so the message will show as failed in the list.
        // We might want to show a global toast if strictly necessary, but per-message failure UI is better.
      });

    } catch (error) {
      console.error('Failed to initiate send:', error)
      // Restore content if immediate failure? 
      // Nah, better to rely on the "failed message" in the list which allows retry.
    }
  }


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    // console.log('📝 MessageComposer input changed', { length: newValue.length })

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
    <div className="bg-white px-2 py-1 border-t !mb-0">
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
              type: replyToMessage.type,
              media_urls: replyToMessage.media_urls,
              thumbnail_url: replyToMessage.thumbnail_url
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
            className={`h-10 w-10 rounded-full transition-all ${showAttachMenu
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
                <ImageUploadButton
                  conversationId={conversationId}
                  onUploadStart={() => setShowAttachMenu(false)}
                  onUploadComplete={() => { }}
                  variant="menu"
                />

                {/* Video Upload */}
                <VideoUploadButton
                  conversationId={conversationId}
                  onUploadStart={() => setShowAttachMenu(false)}
                  onUploadComplete={() => { }}
                  variant="menu"
                />


              </div>
            </div>
          )}
        </div>

        {/* Text Input Container - Takes Maximum Width */}
        <div className="flex-1 flex items-end bg-gray-100 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            data-testid="message-input"
            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-none bg-transparent px-4 py-2.5 focus-visible:ring-0 placeholder:text-gray-400 text-sm leading-5"
            rows={1}
            disabled={isEditSaving}
          />

          {/* Emoji Button - Inside text field */}
          <div className="relative flex-shrink-0" ref={emojiPickerRef}>
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 z-50 shadow-xl rounded-xl border border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
                <Suspense fallback={<div className="w-[300px] h-[400px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setContent(prev => prev + emojiData.emoji)
                    }}
                    width={300}
                    height={400}
                    previewConfig={{ showPreview: false }}
                    searchDisabled={false}
                    skinTonesDisabled
                  />
                </Suspense>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent any form submission or other default behavior
                console.log('😊 Emoji button clicked, toggling picker. Current state:', showEmojiPicker);
                setShowEmojiPicker(prev => !prev);
              }}
              className={cn(
                "h-10 w-10 flex-shrink-0 mr-1 transition-colors",
                showEmojiPicker ? "text-blue-500 bg-blue-50" : "text-gray-400 hover:text-gray-600 hover:bg-transparent"
              )}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Send Button - Only shows when there's text */}
        <Button
          onClick={handleSend}
          disabled={!hasText || isEditSaving}
          size="icon"
          data-testid="send-message-btn"
          className={`h-10 w-10 rounded-full flex-shrink-0 transition-all ${hasText
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
