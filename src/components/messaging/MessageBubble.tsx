import React, { useState, useRef, useEffect } from 'react'

import { createPortal } from 'react-dom'
import { useLongPress } from '../../hooks/useLongPress'
import { useSwipeToReply } from '../../hooks/useSwipeToReply'
import { hapticService } from '../../services/hapticService'
import { RefreshCw, CornerDownRight, Forward, Pin } from 'lucide-react'
import { MessageStatusIcon } from './MessageStatusIcon'
import { MessageStatus } from './MessageStatus'
import { MessageMedia } from './MessageMedia'
import { OptimisticImageMessage } from './OptimisticImageMessage'
import { MediaPlaceholder } from './MediaPlaceholder'
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
import { useMessageActions } from '../../hooks/useMessageActions'
import { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { EditedBadge } from './EditedBadge'
import { MessageDialogs } from './MessageDialogs'
import { MessageLinkPreviews } from './MessageLinkPreviews'
import { DeletedMessagePlaceholder } from './DeletedMessagePlaceholder'
import { useReactions } from '../../hooks/useReactions'
import { QuickReactionBar } from './QuickReactionBar'
import { MessageReactions } from './MessageReactions'
import { ClickableUrl } from './ClickableUrl'
import { ExpandableText } from './ExpandableText'
import { MessageTextContent } from './MessageTextContent'
import { QuotedMessage } from './QuotedMessage'
import { useMessageRetry } from '../../hooks/useMessageRetry'

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
export const MessageBubble = React.memo(function MessageBubble({
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
  const [imageLoadedStates, setImageLoadedStates] = useState<Record<string, boolean>>({})
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

  // Long message expansion state (Story 8.6.7) - Moved to MessageTextContent

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

  const {
    canEditMessage,
    editRemainingTime,
    canDeleteMessage,
    deleteRemainingTime,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleCopy,
    handleShare,
    handleDeleteForMe,
    handleDeleteForEveryone
  } = useMessageActions({ message, isOwn, content: content || '' })

  // -- Gesture Hooks --



  // 2. Swipe to Reply
  const {
    x: swipeX,
    isTriggered: isSwipeTriggered,
    isDragging: isSwipeDragging,
    handlers: swipeHandlers
  } = useSwipeToReply({
    onReply: () => {
      hapticService.trigger('selection'); // Ensure haptic
      onReply?.(message);
    }
  });

  // Delete eligibility Handled by useMessageActions

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
  const { handleRetryUpload } = useMessageRetry({ message })

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

  // Action Handlers (Delete, Share, Copy) handled by useMessageActions hook

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
        <QuotedMessage message={message} isOwn={isOwn} onQuoteClick={onQuoteClick} />

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

            <div
              id={`message-${message.id}`}
              role="article"
              aria-label={ariaLabel}
              tabIndex={0}

              style={{
                transform: `translateX(${swipeX}px)`,
                transition: isSwipeDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
              }}

              // Long Press & Mouse Events combined with swipe handlers
              onContextMenu={handleContextMenu}
              onMouseDown={(e) => {
                onLPMouseDown(e);
                setContextMenuPosition({
                  x: Math.min(e.clientX, window.innerWidth - 220),
                  y: Math.min(e.clientY, window.innerHeight - 300)
                });
                swipeHandlers.onMouseDown(e);
              }}
              onMouseUp={(e) => {
                onLPMouseUp(e);
                swipeHandlers.onMouseUp();
              }}
              onMouseLeave={(e) => {
                onLPMouseLeave(e);
                swipeHandlers.onMouseLeave();
              }}
              onTouchStart={(e) => {
                onLPTouchStart(e);
                const touch = e.touches[0];
                setContextMenuPosition({
                  x: Math.min(touch.clientX, window.innerWidth - 220),
                  y: Math.min(touch.clientY, window.innerHeight - 300)
                });
                swipeHandlers.onTouchStart(e);
              }}
              onTouchEnd={(e) => {
                onLPTouchEnd(e);
                swipeHandlers.onTouchEnd();
              }}
              onTouchMove={(e) => {
                onLPTouchMove(e);
                swipeHandlers.onTouchMove(e);
              }}

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
              {message.type === 'image' || message.type === 'video' ? (
                <MessageMedia
                  message={message}
                  isOwn={isOwn}
                  content={content}
                  onRetryUpload={handleRetryUpload}
                  onImageClick={(index) => {
                    const conversationMessages = useMessagingStore.getState().messages[message.conversation_id] || []
                    const allImages = []
                    let globalIndex = 0
                    let found = false

                    conversationMessages.forEach((msg) => {
                      if (msg.type === 'image' && Array.isArray(msg.media_urls) && msg.media_urls.length > 0 && !msg._optimistic) {
                        if (msg.id === message.id) {
                          globalIndex = allImages.length + index
                          found = true
                        }
                        allImages.push(...msg.media_urls)
                      }
                    })

                    if (!found && message.media_urls) {
                      allImages.push(...message.media_urls)
                      globalIndex = index
                    }

                    setLightboxImages(allImages)
                    setLightboxInitialIndex(globalIndex)
                    setLightboxOpen(true)
                  }}
                  onVideoFullscreen={() => setShowVideoPlayer(true)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Link Previews */}
                  <MessageLinkPreviews previews={message.link_previews} />

                  {/* Text content with Read More expansion (Story 8.6.7) */}
                  <MessageTextContent message={message} isOwn={isOwn} />

                  {/* Timestamp & Status Row */}
                  <MessageStatus
                    message={message}
                    isOwn={isOwn}
                    isPinned={isMessagePinned?.(message.id)}
                    showReadAsDelivered={showReadAsDelivered}
                  />
                </div>
              )}

              {/* Message Reactions (Displays below bubble) */}
              <MessageReactions
                reactions={reactionsSummary}
                currentUserId={currentUserId || ''}
                onReactionClick={toggleReaction}
                onViewUsers={(emoji, e) => handleViewReactionUsers(emoji, e)}  // Pass event for positioning
                isOwnMessage={isOwn}
              />
            </div>
          </div>
        </div>

        <MessageDialogs
          message={message}
          isOwn={isOwn}
          currentUserId={currentUserId}
          showContextMenu={showContextMenu}
          contextMenuPosition={contextMenuPosition}
          setShowContextMenu={setShowContextMenu}
          onReply={() => onReply?.(message)}
          onForward={() => onForward?.(message)}
          handleCopy={handleCopy}
          handleShare={handleShare}
          onEdit={() => onEdit?.(message)}
          canEditMessage={canEditMessage}
          editRemainingTime={editRemainingTime}
          handleDeleteForMe={handleDeleteForMe}
          handleDeleteForEveryone={handleDeleteForEveryone}
          canDeleteMessage={canDeleteMessage}
          deleteRemainingTime={deleteRemainingTime}
          toggleReaction={toggleReaction}
          setShowPicker={setShowPicker}
          userReactions={userReactions}
          onPin={() => onPin?.(message.id)}
          onUnpin={() => onUnpin?.(message.id)}
          isPinned={isMessagePinned?.(message.id)}
          setShowReportDialog={setShowReportDialog}
          showReportDialog={showReportDialog}
          selectedEmoji={selectedEmoji}
          closeReactionUsers={closeReactionUsers}
          emojiUsers={emojiUsers}
          loadingUsers={loadingUsers}
          popupPosition={popupPosition}
          showPicker={showPicker}
          showVideoPlayer={showVideoPlayer}
          setShowVideoPlayer={setShowVideoPlayer}
          lightboxImages={lightboxImages}
          lightboxInitialIndex={lightboxInitialIndex}
          lightboxOpen={lightboxOpen}
          setLightboxOpen={setLightboxOpen}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
})
