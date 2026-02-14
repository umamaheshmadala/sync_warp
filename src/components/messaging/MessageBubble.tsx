import React, { useState, useRef, useEffect } from 'react'

import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useLongPress } from '../../hooks/useLongPress'
import { useSwipeToReply } from '../../hooks/useSwipeToReply'
import { hapticService } from '../../services/hapticService'
import { RefreshCw, CornerDownRight, Forward, Pin } from 'lucide-react'
import { MessageStatusIcon } from './MessageStatusIcon'
import { OptimisticImageMessage } from './OptimisticImageMessage'
import { OptimisticVideoMessage } from './OptimisticVideoMessage'
import { VideoPlayer } from './VideoPlayer'
import { LinkPreviewCard } from './LinkPreviewCard'
import { ImageMessage } from './ImageMessage'
import { ImageLightbox } from './ImageLightbox'
import { VideoMessage } from './VideoMessage'
import type { Message } from '../../types/messaging'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { formatRelativeTime, formatMessageTime } from '../../utils/dateUtils'
import { MessageContextMenu } from './MessageContextMenu'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import toast from 'react-hot-toast'
import { useMessagingStore } from '../../store/messagingStore'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { mediaUploadService } from '../../services/mediaUploadService'
import { messagingService } from '../../services/messagingService'
import type { LinkPreview } from '../../services/linkPreviewService'
import { useShare } from '../../hooks/useShare'
import { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { messageEditService } from '../../services/messageEditService'
import { messageDeleteService } from '../../services/messageDeleteService'
import { EditedBadge } from './EditedBadge'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DeletedMessagePlaceholder } from './DeletedMessagePlaceholder'
import { useReactions } from '../../hooks/useReactions'
import { QuickReactionBar } from './QuickReactionBar'
import { MessageReactions } from './MessageReactions'
import { ReactionUserList } from './ReactionUserList'
import { MessageEmojiPicker } from './MessageEmojiPicker'
import { ReportDialog } from '../reporting/ReportDialog'
import { ClickableUrl } from './ClickableUrl'
import { parseMessageContent } from '../../utils/urlUtils'
import { ReviewLinkPreview } from '../chat/ReviewLinkPreview'
import { OfferLinkPreview } from '../chat/OfferLinkPreview'
import { ExpandableText } from './ExpandableText'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
  onRetry?: (message: Message) => void // Callback for retry button (Story 8.2.7)
  onReply?: (message: Message) => void // Callback for reply action (Story 8.10.5)
  onForward?: (message: Message) => void // Callback for forward action (Story 8.10.6)
  onEdit?: (message: Message) => void // Callback for edit action (Story 8.5.2 - WhatsApp-style)
  onQuoteClick?: (messageId: string) => void // Callback for clicking quoted message (Story 8.10.5)
  currentUserId?: string
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
  isMessagePinned?: (messageId: string) => boolean
  friendReadReceiptsEnabled?: boolean
}

/**
 * MessageBubble Component
 * 
 * Displays a single message with:
 * - Different styling for own vs friend messages
 * - Timestamp (relative time)
 * - Edited indicator
 * - Deleted message handling
 * - Message status icons (sent/delivered/read)
 * - Optimistic UI state (sending...)
 * - Failed state with retry button (Story 8.2.7)
 * - Full accessibility support (Story 8.2.8)
 * - Message Reactions (Story 8.5.5)
 * 
 * Accessibility Features:
 * - role="article" for screen readers
 * - Descriptive ARIA labels with sender and content
 * - Keyboard focusable
 * - Proper semantic HTML
 * 
 * @example
 * ```tsx
 * <MessageBubble
 *   message={message}
 *   isOwn={message.sender_id === currentUserId}
 *   showTimestamp={true}
 * />
 * ```
 */
export function MessageBubble({
  message,
  isOwn,
  showTimestamp = true,
  onRetry,
  onReply,
  onForward,
  onEdit,
  onQuoteClick,
  currentUserId,
  onPin,
  onUnpin,
  isMessagePinned,
  friendReadReceiptsEnabled = true, // Default to true (visible)
  ...props
}: MessageBubbleProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)
  // const [showReactionBar, setShowReactionBar] = useState(false) // Removed per user feedback
  const [showPicker, setShowPicker] = useState(false)
  const queryClient = useQueryClient()

  // Custom Hook for long press
  const {
    onMouseDown: onLPMouseDown,
    onMouseUp: onLPMouseUp,
    onMouseLeave: onLPMouseLeave,
    onTouchStart: onLPTouchStart,
    onTouchEnd: onLPTouchEnd,
    onTouchMove: onLPTouchMove
  } = useLongPress({
    onLongPress: () => setShowContextMenu(true)
  });

  // Long message expansion state (Story 8.6.7)
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsReadMore, setNeedsReadMore] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  // Check text height on mount/content change
  useEffect(() => {
    if (message.type === 'text' && textRef.current) {
      // 140px is approx 7 lines of text (20px line-height)
      const MAX_COLLAPSED_HEIGHT = 140
      if (textRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT) {
        setNeedsReadMore(true)
      } else {
        setNeedsReadMore(false)
      }
    }
  }, [message.content, message.type])

  const content = message.content || ''
  const isDeleted = !!message.deleted_at

  // Privacy settings for reciprocal read receipts
  // If user disabled read receipts, they also can't see when others read their messages
  const { settings: privacySettings } = usePrivacySettings()
  // My privacy setting prevents ME from seeing read status (reciprocal)
  const myReadReceiptsDisabled = privacySettings?.read_receipts_enabled === false

  // Friend's privacy setting prevents ME from seeing read status (direct)
  const friendReadReceiptsDisabled = friendReadReceiptsEnabled === false

  // Combined logic: Force 'delivered' status if either is disabled
  const showReadAsDelivered = myReadReceiptsDisabled || friendReadReceiptsDisabled

  // Reactions hook
  const {
    reactionsSummary,
    toggleReaction,
    selectedEmoji,
    emojiUsers,
    loadingUsers,
    viewReactionUsers,
    closeReactionUsers
  } = useReactions(message, currentUserId || '')



  const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | undefined>(undefined)
  const [showReportDialog, setShowReportDialog] = useState(false)

  const handleViewReactionUsers = (emoji: string, event: React.MouseEvent) => {
    // Calculate position relative to the clicked element
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    // Position slightly below and centered to the click
    setPopupPosition({
      x: rect.left,
      y: rect.bottom + 8
    })
    viewReactionUsers(emoji)
  }

  // Edit eligibility - calculate inline without a hook to avoid database calls per message
  // Only own text messages within 15-minute window can be edited
  const EDIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
  const messageAge = Date.now() - new Date(message.created_at).getTime()
  const canEditMessage = isOwn &&
    message.type === 'text' &&
    !message._optimistic &&
    !message._failed &&
    !message.is_deleted &&
    messageAge < EDIT_WINDOW_MS

  const editRemainingTime = canEditMessage
    ? messageEditService.formatRemainingTime(EDIT_WINDOW_MS - messageAge)
    : ''

  // -- Gesture Hooks --



  // 2. Swipe to Reply
  const {
    x: swipeX,
    controls: swipeControls,
    onDrag: onSwipeDrag,
    onDragEnd: onSwipeDragEnd
  } = useSwipeToReply({
    onReply: () => {
      hapticService.trigger('selection'); // Ensure haptic
      onReply?.(message);
    }
  });

  // Delete eligibility - similar to edit, 15-minute window for "Delete for Everyone"
  const DELETE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
  const canDeleteMessage = isOwn &&
    !message._optimistic &&
    !message._failed &&
    !message.is_deleted &&
    messageAge < DELETE_WINDOW_MS

  const deleteRemainingTime = canDeleteMessage
    ? messageDeleteService.formatRemainingTime(DELETE_WINDOW_MS - messageAge)
    : ''

  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Determine styling based on sender
  const isSystem = message.type === 'system'
  const _failed = message._failed
  const {
    created_at,
    is_edited,
    is_forwarded,
    _optimistic
  } = message

  // Handle retry for failed image uploads
  const handleRetryUpload = async () => {
    if (!message.media_urls?.[0]) return

    console.log('🔄 Retrying message:', message._tempId)
    const blobUrl = message.media_urls[0]
    const conversationId = message.conversation_id
    const tempId = message._tempId

    try {
      // 1. Reset state to uploading
      useMessagingStore.getState().updateMessage(conversationId, tempId!, {
        _failed: false,
        _uploadProgress: 0
      })

      // 2. Fetch blob
      const response = await fetch(blobUrl)
      const blob = await response.blob()
      const file = new File([blob], "retry_image.jpg", { type: blob.type })

      // 3. Upload
      const { url, thumbnailUrl } = await mediaUploadService.uploadImage(
        file,
        conversationId,
        (progress) => {
          // Check for cancellation during retry
          const currentMessages = useMessagingStore.getState().messages.get(conversationId) || []
          const currentMsg = currentMessages.find(m => m._tempId === tempId)
          if (currentMsg?._failed) {
            throw new Error('Cancelled')
          }

          useMessagingStore.getState().updateMessage(conversationId, tempId!, {
            _uploadProgress: progress.percentage
          })
        }
      )

      // Check for cancellation AFTER upload completes
      const currentMsg = useMessagingStore.getState().messages.get(conversationId)?.find(m => m._tempId === tempId)
      if (currentMsg?._failed) {
        console.log('🛑 Retry cancelled after upload, aborting send')
        await mediaUploadService.deleteImage(url)
        await mediaUploadService.deleteImage(thumbnailUrl)
        return
      }

      // 4. Get Public URLs
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(url)

      const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(thumbnailUrl)

      console.log('🔄 Retry sending message with mediaUrls:', [publicUrl])

      // 5. Send Message
      await messagingService.sendMessage({
        conversationId,
        content: message.content || '',
        type: 'image',
        mediaUrls: [publicUrl],
        thumbnailUrl: thumbPublicUrl
      })

      // 6. Remove optimistic message
      useMessagingStore.getState().removeMessage(conversationId, tempId!)

      toast.success('Image sent successfully')

    } catch (error) {
      console.error('Retry failed:', error)
      if (error instanceof Error && error.message === 'Cancelled') {
        console.log('⏹️ Retry cancelled')
      } else {
        toast.error('Retry failed')
      }

      // Mark as failed again
      useMessagingStore.getState().updateMessage(conversationId, tempId!, {
        _failed: true,
        _uploadProgress: 0
      })
    }
  }

  // Refactored Context Menu Handler (works with both native context menu event and our Long Press)
  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent | Event) => {
    e.preventDefault()
    if (isDeleted) return // No menu for deleted messages

    // Calculate position
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = Math.min(clientX, window.innerWidth - 220)
    const y = Math.min(clientY, window.innerHeight - 300)

    setContextMenuPosition({ x, y })
    setShowContextMenu(true)

    // Haptic feedback
    hapticService.trigger('medium')
  }

  // NOTE: Previous long press handlers removed in favor of useLongPress hook below

  /* 
   * Long press logic is now handled by usage of useLongPress hook in the render method 
   * and the modified useLongPress signature that captures coordinates would be better 
   * but for now we rely on the native hook.
   * 
   * Actually, my useLongPress hook doesn't pass coordinates to onLongPress.
   * That is a limitation. 
   * However, we can track the touch start in the wrapper.
   */

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast.success('Message copied')
  }

  // Share handlers
  const { shareImage, shareVideo, shareLink } = useShare()

  const handleShare = async () => {
    try {
      if (message.type === 'image' && message.media_urls?.[0]) {
        await shareImage(message.media_urls[0], message.id)
      } else if (message.type === 'video' && message.media_urls?.[0]) {
        await shareVideo(message.media_urls[0], message.id)
      } else if (message.link_previews?.[0]?.url) {
        await shareLink(
          message.link_previews[0].url,
          message.link_previews[0].title || 'Check this out!',
          message.id
        )
      } else if (content) {
        // Share text message content
        await shareLink(
          window.location.href,
          content,
          message.id
        )
      }
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  // Handle "Delete for me" - hides in database (synced across devices)
  const handleDeleteForMe = async () => {
    try {
      const result = await messageDeleteService.deleteForMe(message.id)
      if (result.success) {
        // Optimistic UI: Remove message from local state immediately
        useMessagingStore.getState().removeMessage(message.conversation_id, message.id)

        // ALSO remove from React Query cache so it disappears from the list
        queryClient.setQueryData(['messages', message.conversation_id], (old: any) => {
          if (!old || !old.messages) return old
          return {
            ...old,
            messages: old.messages.filter((m: Message) => m.id !== message.id)
          }
        })

        toast.success('Message deleted for you', { icon: '🙈' })
      } else {
        toast.error(result.message || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Delete for me failed:', error)
      toast.error('Failed to delete message')
    }
  }

  // Handle "Delete for everyone" confirmation (WhatsApp-style)
  const handleDeleteForEveryone = async () => {
    setIsDeleting(true)
    try {
      const result = await messageDeleteService.deleteMessage(message.id)
      if (result.success) {
        setShowDeleteConfirm(false)
        // Optimistic UI: Update message to show deleted placeholder immediately
        useMessagingStore.getState().updateMessage(message.conversation_id, message.id, {
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        // Show undo toast for 5 seconds
        toast((t) => (
          <div className="flex items-center gap-3">
            <span>Message deleted for everyone</span>
            <button
              onClick={async () => {
                const undoResult = await messageDeleteService.undoDelete(message.id)
                toast.dismiss(t.id)
                if (undoResult.success) {
                  // Restore message in local state
                  useMessagingStore.getState().updateMessage(message.conversation_id, message.id, {
                    is_deleted: false,
                    deleted_at: null
                  })
                  toast.success('Message restored')
                } else {
                  toast.error('Could not restore message')
                }
              }}
              className="text-blue-500 underline text-sm font-medium"
            >
              Undo
            </button>
          </div>
        ), { duration: 5000, icon: '🗑️' })
      } else {
        toast.error(result.message || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete message')
    } finally {
      setIsDeleting(false)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    )
  }

  // Determine aria label
  const senderName = isOwn ? 'You' : 'Friend' // In real app, get actual name
  const ariaLabel = `${senderName} said: ${content}, ${formatRelativeTime(message.created_at)}`

  // Calculate user's reactions for highlighting
  const userReactions = Object.entries(message.reactions || {})
    .filter(([_, ids]) => currentUserId && ids.includes(currentUserId))
    .map(([emoji]) => emoji)

  // Deleted message - show placeholder (Story 8.5.3)
  if (isDeleted) {
    return (
      <div
        className={cn(
          "flex w-full mb-4",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        <DeletedMessagePlaceholder
          isOwnMessage={isOwn}
          deletedAt={message.deleted_at}
          className="max-w-[85%]"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex w-full mb-4 group relative items-end gap-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    // onMouseEnter={() => !Capacitor.isNativePlatform() && setShowReactionBar(true)} // Removed hover trigger
    // onMouseLeave={() => !Capacitor.isNativePlatform() && setShowReactionBar(false)}
    >
      {/* Quick Reaction Bar (Desktop Hover) - REMOVED per user feedback to reduce clutter
      {showReactionBar && !isDeleted && (
        <div className={cn(
          "absolute -top-10 z-10",
          isOwn ? "right-0" : "left-0"
        )}>
          <QuickReactionBar
            onReact={toggleReaction}
            userReactions={userReactions}
            onOpenPicker={() => {
              setShowReactionBar(false)
              setShowPicker(true)
            }}
          />
        </div>
      )} 
      */}

      <div className="flex flex-col gap-1 max-w-[85%]">
        {/* Forwarded Label */}
        {is_forwarded && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5 ml-1">
            <Forward className="w-3 h-3" />
            <span className="italic">Forwarded</span>
          </div>
        )}

        {/* Quoted Message (if reply) */}
        {message.parent_message && (
          <button
            onClick={() => onQuoteClick?.(message.parent_message!.id)}
            className={cn(
              'flex items-start gap-2 p-2 rounded text-xs max-w-full',
              'border-l-2 hover:bg-gray-100 transition-colors text-left',
              isOwn
                ? 'bg-blue-100 border-blue-400 self-end'
                : 'bg-gray-100 border-gray-400 self-start'
            )}
          >
            <CornerDownRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-700 truncate">
                {message.parent_message.sender_name}
              </div>
              <div className="text-gray-600 truncate">
                {message.parent_message.type === 'text'
                  ? message.parent_message.content
                  : `[${message.parent_message.type}]`
                }
              </div>
            </div>
          </button>
        )}

        <div className="flex items-end gap-2">
          {/* Failed Retry Button */}
          {_failed && isOwn && onRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onRetry(message)}
              aria-label="Retry sending message"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}

          <div className="flex flex-col relative">
            {/* Added relative wrapper for swipe context */}

            <motion.div
              id={`message-${message.id}`}
              role="article"
              aria-label={ariaLabel}
              tabIndex={0}

              // Gestures
              drag="x"
              dragConstraints={{ left: 0, right: 80 }} // Allow drag right to reply
              dragElastic={0.1} // Rubber band effect
              onDrag={onSwipeDrag}
              onDragEnd={onSwipeDragEnd}
              style={{ x: swipeX }}
              animate={swipeControls}

              // Long Press & Mouse Events
              // We combine manual handlers with hook handlers
              onContextMenu={handleContextMenu}
              onMouseDown={(e) => {
                onLPMouseDown(e);
                // Also capture position for potential long press?
                setContextMenuPosition({
                  x: Math.min(e.clientX, window.innerWidth - 220),
                  y: Math.min(e.clientY, window.innerHeight - 300)
                });
              }}
              onMouseUp={onLPMouseUp}
              onMouseLeave={onLPMouseLeave}
              onTouchStart={(e) => {
                onLPTouchStart(e);
                // Capture touch position for menu
                const touch = e.touches[0];
                setContextMenuPosition({
                  x: Math.min(touch.clientX, window.innerWidth - 220),
                  y: Math.min(touch.clientY, window.innerHeight - 300)
                });
              }}
              onTouchEnd={onLPTouchEnd}
              // onTouchMove is handled by onDrag usually, but we need strictly for long press cancel
              // If dragging starts, onTouchMove might fire.
              // But we actually want dragging to Cancel long press.
              // Our useLongPress hook cancels on movement > 10px.
              onTouchMove={onLPTouchMove}

              className={cn(
                "px-4 py-2 rounded-2xl break-words text-[15px] leading-relaxed shadow-sm cursor-pointer select-none relative z-10 touch-pan-y", // touch-pan-y allows vertical scroll but captures horizontal
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                isOwn
                  ? _failed
                    ? "bg-red-50 text-red-900 border border-red-200"
                    : "bg-[#0a66c2] text-white rounded-br-sm"
                  : "bg-[#f3f2ef] text-gray-900 rounded-bl-sm"
              )}
            >
              {/* Message Content */}
              {message.type === 'image' ? (
                message.media_urls && message.media_urls.length > 0 ? (
                  message._optimistic ? (
                    // Optimistic UI: Show grid of thumbnails with loading state
                    <div className={cn(
                      "grid gap-1",
                      message.media_urls.length === 1 ? "grid-cols-1" :
                        message.media_urls.length === 2 ? "grid-cols-2" :
                          "grid-cols-2",
                      // Limit width for grids to prevent them being too large
                      message.media_urls.length > 1 ? "max-w-[300px]" : "max-w-sm"
                    )}>
                      {message.media_urls.slice(0, 4).map((url, index) => (
                        <div key={index} className={cn(
                          "relative aspect-square overflow-hidden",
                          message.media_urls!.length === 3 && index === 0 ? "col-span-2 aspect-video" : "",
                          "rounded-lg"
                        )}>
                          <OptimisticImageMessage
                            thumbnailUrl={url}
                            fullResUrl={url}
                            uploadProgress={message._uploadProgress || 0}
                            status={message._failed ? 'failed' : 'uploading'}
                            caption={index === message.media_urls!.length - 1 ? content : undefined} // Show caption only on last or wrapper? Optimistic component handles caption internally, might duplication. Let's hide caption in individual items and show it below grid if possible, but OptimisticImageMessage is designed to be the message body. 
                            // Actually, OptimisticImageMessage includes the specific UI. We might need a simpler wrapper for grid items.
                            // Re-using OptimisticImageMessage for each item might look weird if each has progress bar.
                            // But usually upload is one block. 
                            // For simplicity in this iteration, let's assume all share same progress.
                            isOwn={isOwn}
                            onRetry={handleRetryUpload}
                            onCancel={() => {
                              if (message._tempId) {
                                console.log('🛑 User cancelled upload via UI')
                                useMessagingStore.getState().updateMessage(message.conversation_id, message._tempId, {
                                  _failed: true,
                                  _uploadProgress: 0
                                })
                              }
                            }}
                            // Hide caption for grid items, we'll show it below
                            hideCaption={true}
                          />
                          {/* Overflow Count for 5+ images */}
                          {index === 3 && message.media_urls!.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <span className="text-white text-2xl font-bold">
                                +{message.media_urls!.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Caption for optimistic message */}
                      {content && (
                        <div className={cn("col-span-full pt-1", isOwn ? "text-right" : "text-left")}>
                          <ExpandableText content={content} limit={40} className="text-sm" isOwn={isOwn} />
                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular image display with lightbox and grid
                    <div className="space-y-1">
                      <div className={cn(
                        "grid gap-1",
                        message.media_urls.length === 1 ? "grid-cols-1" :
                          message.media_urls.length === 2 ? "grid-cols-2" :
                            "grid-cols-2",
                        // Limit width for grids to prevent them being too large
                        message.media_urls.length > 1 ? "max-w-[300px]" : "max-w-sm"
                      )}>
                        {message.media_urls.slice(0, 4).map((url, index) => (
                          <div
                            key={index}
                            className={cn(
                              "relative cursor-pointer overflow-hidden rounded-lg hover:opacity-95 transition-opacity",
                              message.media_urls!.length === 1 ? "aspect-auto" : "aspect-square",
                              message.media_urls!.length === 3 && index === 0 ? "col-span-2 aspect-video" : ""
                            )}
                            onClick={() => {
                              // Get all images
                              const conversationMessages = useMessagingStore.getState().messages.get(message.conversation_id) || []
                              const allImages: string[] = []
                              let globalIndex = 0
                              let found = false

                              // Construct global list and find index of clicked image
                              conversationMessages.forEach((msg) => {
                                if (msg.type === 'image' && Array.isArray(msg.media_urls) && msg.media_urls.length > 0 && !msg._optimistic) {
                                  if (msg.id === message.id) {
                                    // This is the current message
                                    globalIndex = allImages.length + index
                                    found = true
                                  }
                                  allImages.push(...msg.media_urls)
                                }
                              })

                              if (!found && message.media_urls) {
                                // Fallback
                                allImages.push(...message.media_urls)
                                globalIndex = index
                              }

                              setLightboxImages(allImages)
                              setLightboxInitialIndex(globalIndex)
                              setLightboxOpen(true)
                            }}
                          >
                            <img
                              src={url}
                              alt={`Image ${index + 1}`}
                              className="w-full h-full object-cover"
                              style={message.media_urls!.length === 1 ? { maxHeight: '300px', width: 'auto' } : {}}
                              loading="lazy"
                            />
                            {/* Overlay for +N */}
                            {index === 3 && message.media_urls!.length > 4 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white text-2xl font-bold">
                                  +{message.media_urls!.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {content && (
                        <ExpandableText
                          content={content}
                          limit={40}
                          className="mt-1 text-sm pl-1"
                          isOwn={isOwn}
                        />
                      )}
                    </div>
                  )
                ) : (
                  // Fallback for missing media URLs
                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 text-center min-w-[200px]">
                    <p className="text-sm text-gray-500 italic">Image unavailable</p>
                    <p className="text-xs text-gray-400 mt-1">Media URL missing</p>
                    {content && (
                      <ExpandableText
                        content={content}
                        limit={40}
                        className="mt-2 text-sm text-left"
                        isOwn={isOwn}
                      />
                    )}
                  </div>
                )
              ) : message.type === 'video' ? (
                // Video message display
                message.media_urls && message.media_urls.length > 0 ? (
                  message._optimistic ? (
                    // Optimistic UI: Show thumbnail with loading state
                    <OptimisticVideoMessage
                      thumbnailUrl={message.thumbnail_url || message.media_urls[0]}
                      fullResUrl={message.media_urls[0]}
                      uploadProgress={message._uploadProgress || 0}
                      status={message._failed ? 'failed' : 'uploading'}
                      caption={content}
                      isOwn={isOwn}
                      onCancel={() => {
                        // Cancel upload by marking as failed
                        if (message._tempId) {
                          console.log('🛑 User cancelled video upload via UI')
                          useMessagingStore.getState().updateMessage(message.conversation_id, message._tempId, {
                            _failed: true,
                            _uploadProgress: 0
                          })
                        }
                      }}
                    />
                  ) : (
                    // Regular video display with controls
                    <div className="space-y-2">
                      <VideoMessage
                        id={message.id}
                        videoUrl={message.media_urls[0]}
                        thumbnailUrl={message.thumbnail_url}
                        duration={undefined}
                        onFullscreen={() => setShowVideoPlayer(true)}
                      />
                      {content && (
                        <ExpandableText
                          content={content}
                          limit={40}
                          className="mt-2 text-sm"
                          isOwn={isOwn}
                        />
                      )}
                    </div>
                  )
                ) : (
                  // Fallback for missing video URLs
                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 text-center min-w-[200px]">
                    <p className="text-sm text-gray-500 italic">Video unavailable</p>
                    <p className="text-xs text-gray-400 mt-1">Media URL missing</p>
                    {content && (
                      <ExpandableText
                        content={content}
                        limit={40}
                        className="mt-2 text-sm text-left"
                        isOwn={isOwn}
                      />
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Review Preview */}
                  {message.link_previews &&
                    message.link_previews.length > 0 &&
                    message.link_previews[0].metadata?.type === 'review' && (
                      <div className="mt-2">
                        <ReviewLinkPreview preview={message.link_previews[0]} />
                      </div>
                    )}

                  {/* Offer Preview (Ticket Style) */}
                  {message.link_previews &&
                    message.link_previews.length > 0 &&
                    (message.link_previews[0].type === 'sync-offer' || message.link_previews[0].metadata?.type === 'offer') && (
                      <div className="mt-2 text-left">
                        <OfferLinkPreview preview={message.link_previews[0]} />
                      </div>
                    )}

                  {/* Standard Link Previews (Exclude review and offer types) */}
                  {message.link_previews &&
                    message.link_previews.length > 0 &&
                    message.link_previews[0].metadata?.type !== 'review' &&
                    message.link_previews[0].type !== 'sync-offer' &&
                    message.link_previews[0].metadata?.type !== 'offer' && (
                      <div className="space-y-2 w-full max-w-[75vw]">
                        {message.link_previews.map((preview, index) => (
                          <LinkPreviewCard
                            key={`${preview.url}-${index}`}
                            preview={preview}
                            showRemoveButton={false}
                          />
                        ))}
                      </div>
                    )}

                  {/* Text content with Read More expansion (Story 8.6.7) */}
                  <div className="relative">
                    <p
                      ref={textRef}
                      className={cn(
                        "whitespace-pre-wrap break-words break-all transition-all duration-200",
                        !isExpanded && needsReadMore ? "line-clamp-7 max-h-[140px] overflow-hidden" : ""
                      )}
                    >
                      {/* Parse content and render URLs as clickable links (AC-14 through AC-17) */}
                      {parseMessageContent(content).map((segment, index) =>
                        segment.type === 'url' ? (
                          <ClickableUrl
                            key={`url-${index}`}
                            url={segment.fullUrl || segment.content}
                            isOwnMessage={isOwn}
                          />
                        ) : (
                          <React.Fragment key={`text-${index}`}>
                            {segment.content}
                          </React.Fragment>
                        )
                      )}
                    </p>

                    {!isExpanded && needsReadMore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation() // Prevent bubbling to message click
                          setIsExpanded(true)
                        }}
                        className={cn(
                          "mt-1 text-sm font-medium hover:underline focus:outline-none",
                          isOwn ? "text-blue-100 opacity-90" : "text-blue-600"
                        )}
                      >
                        Read more
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Timestamp & Status Row */}
              <div className={cn(
                "flex items-center justify-end gap-1 mt-0.5",
                isOwn ? "text-blue-100/80" : "text-gray-400"
              )}>
                {is_edited && (
                  <EditedBadge
                    editedAt={message.edited_at || message.updated_at || ''}
                    isOwnMessage={isOwn}
                  />
                )}

                {/* Pin Icon (if message is pinned) */}
                {isMessagePinned?.(message.id) && (
                  <Pin className={cn(
                    "w-3 h-3 rotate-45",
                    isOwn ? "text-blue-200" : "text-gray-400"
                  )} />
                )}

                <span className="text-[10px]">
                  {formatMessageTime(created_at)}
                </span>

                {/* Reported Indicator */}
                {message.viewer_has_reported && (
                  <span className="text-[10px] text-orange-600 font-medium ml-1">
                    Reported
                  </span>
                )}

                {/* Message Status Icons (for own messages) */}
                {isOwn && (
                  <span className="ml-0.5">
                    <MessageStatusIcon
                      status={_failed ? 'failed' : _optimistic ? 'sending' : (
                        // Reciprocal privacy: if user disabled read receipts, they can't see 'read' status
                        // Downgrade 'read' to 'delivered' to enforce fairness
                        message.status === 'read' && showReadAsDelivered
                          ? 'delivered'
                          : message.status || 'sent'
                      )}
                      className={cn(
                        "h-3 w-3",
                        isOwn ? "text-blue-100/80" : "text-gray-400"
                      )}
                    />
                  </span>
                )}
              </div>
            </motion.div>
            {/* Message Reactions (Displays below bubble) */}
            <MessageReactions
              reactions={reactionsSummary}
              currentUserId={currentUserId || ''}
              onReactionClick={toggleReaction}
              onViewUsers={(emoji, e) => handleViewReactionUsers(emoji, e)}  // Pass event for positioning
              isOwnMessage={isOwn}
            />
          </div>
        </div >
      </div >

      {/* Context Menu - Rendered at document body level to avoid scroll container issues */}
      {
        showContextMenu && createPortal(
          <MessageContextMenu
            message={message}
            position={contextMenuPosition}
            isOwn={isOwn}
            onClose={() => setShowContextMenu(false)}
            onReply={() => onReply?.(message)}
            onForward={() => onForward?.(message)}
            onCopy={handleCopy}
            onShare={handleShare}
            onEdit={() => onEdit?.(message)}
            canEdit={canEditMessage}
            editRemainingTime={editRemainingTime}
            onDeleteForMe={handleDeleteForMe}
            onDeleteForEveryone={() => handleDeleteForEveryone()}
            canDeleteForEveryone={canDeleteMessage}
            deleteRemainingTime={deleteRemainingTime}
            onReact={toggleReaction}
            onOpenPicker={() => {
              setShowContextMenu(false)
              setShowPicker(true)
            }}
            userReactions={userReactions}
            onPin={() => onPin?.(message.id)}
            onUnpin={() => onUnpin?.(message.id)}
            isPinned={isMessagePinned?.(message.id)}
            onReport={() => {
              setShowContextMenu(false)
              setShowReportDialog(true)
            }}
          />,
          document.body
        )
      }

      {/* Report Dialog */}
      <ReportDialog
        messageId={message.id}
        conversationId={message.conversation_id}
        senderId={message.sender_id}
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
      />

      {/* Reaction User List Dialog */}
      <ReactionUserList
        isOpen={!!selectedEmoji}
        onClose={closeReactionUsers}
        emoji={selectedEmoji}
        users={emojiUsers}
        isLoading={loadingUsers}
        currentUserId={currentUserId}
        position={popupPosition}
        onRemoveReaction={() => {
          if (selectedEmoji) {
            toggleReaction(selectedEmoji);
            closeReactionUsers(); // Optional: close list after removing? Or keep open?
            // WhatsApp keeps open if there are other reactions, but if I remove mine, maybe I want to close or see updated list.
            // Since toggleReaction updates state, the list *should* update if we re-fetch or if optimistic updates propagate.
            // But `emojiUsers` in `useReactions` is fetched on `viewReactionUsers`.
            // If I remove reaction, `emojiUsers` needs to be updated or closed.
            // Closing is safer to avoid stale state for now.
            closeReactionUsers();
          }
        }}
      />

      {/* Full Emoji Picker Dialog */}
      <MessageEmojiPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onEmojiClick={toggleReaction}
      />

      {/* Video Player Modal */}
      {
        showVideoPlayer && message.type === 'video' && message.media_urls && message.media_urls.length > 0 && (
          <VideoPlayer
            videoUrl={message.media_urls[0]}
            thumbnailUrl={message.thumbnail_url || message.media_urls[0]}
            onClose={() => setShowVideoPlayer(false)}
          />
        )
      }

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Delete Confirmation Dialog (Story 8.5.3) */}
      {
        showDeleteConfirm && createPortal(
          <DeleteConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteForEveryone}
            remainingTime={deleteRemainingTime}
            isDeleting={isDeleting}
            showDeleteForMe={false}
          />,
          document.body
        )
      }
    </div >
  )
}
