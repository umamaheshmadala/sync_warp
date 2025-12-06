import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { RefreshCw, CornerDownRight, Forward } from 'lucide-react'
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

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
  onRetry?: (message: Message) => void // Callback for retry button (Story 8.2.7)
  onReply?: (message: Message) => void // Callback for reply action (Story 8.10.5)
  onForward?: (message: Message) => void // Callback for forward action (Story 8.10.6)
  onEdit?: (message: Message) => void // Callback for edit action (Story 8.5.2 - WhatsApp-style)
  onQuoteClick?: (messageId: string) => void // Callback for clicking quoted message (Story 8.10.5)
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
  onQuoteClick
}: MessageBubbleProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)
  const content = message.content || ''
  const isDeleted = !!message.deleted_at
  
  // Privacy settings for reciprocal read receipts
  // If user disabled read receipts, they also can't see when others read their messages
  const { settings: privacySettings } = usePrivacySettings()
  const showReadAsDelivered = privacySettings?.read_receipts_enabled === false
  
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
             _uploadProgress: progress
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isDeleted || isSystem) return // No menu for deleted/system messages
    
    // Calculate position to keep menu on screen
    const x = Math.min(e.clientX, window.innerWidth - 220)
    const y = Math.min(e.clientY, window.innerHeight - 300)
    
    setContextMenuPosition({ x, y })
    setShowContextMenu(true)
    
    // Haptic feedback
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Medium })
    }
  }

  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isDeleted || isSystem) return
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      // Use touch coordinates for mobile
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
      
      const x = Math.min(clientX, window.innerWidth - 220)
      const y = Math.min(clientY, window.innerHeight - 300)
      
      setContextMenuPosition({ x, y })
      setShowContextMenu(true)
      
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Medium })
      }
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

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

  // Handle "Delete for me" - hides locally only (WhatsApp-style)
  const handleDeleteForMe = () => {
    const result = messageDeleteService.deleteForMe(message.id)
    if (result.success) {
      toast.success('Message hidden', { icon: '🙈' })
      // Force re-render by updating local state or using store
      window.location.reload() // Simple approach - in production, use store
    } else {
      toast.error(result.message || 'Failed to hide message')
    }
  }

  // Handle "Delete for everyone" confirmation (WhatsApp-style)
  const handleDeleteForEveryone = async () => {
    setIsDeleting(true)
    try {
      const result = await messageDeleteService.deleteMessage(message.id)
      if (result.success) {
        setShowDeleteConfirm(false)
        // Show undo toast for 5 seconds
        toast((t) => (
          <div className="flex items-center gap-3">
            <span>Message deleted for everyone</span>
            <button
              onClick={async () => {
                const undoResult = await messageDeleteService.undoDelete(message.id)
                toast.dismiss(t.id)
                if (undoResult.success) {
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
        "flex w-full mb-4 group relative",
        isOwn ? "justify-end" : "justify-start"
      )}
      onContextMenu={handleContextMenu}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
    >
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
        
        <div 
          role="article"
          aria-label={ariaLabel}
          tabIndex={0}
          className={cn(
            "px-4 py-2 rounded-2xl break-words text-[15px] leading-relaxed shadow-sm cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            isOwn 
              ? _failed
                ? "bg-red-50 text-red-900 border border-red-200" 
                : "bg-[#0a66c2] text-white rounded-br-sm" // LinkedIn Blue
              : "bg-[#f3f2ef] text-gray-900 rounded-bl-sm" // LinkedIn Gray
          )}
        >
          {/* Message Content */}
          {message.type === 'image' ? (
            message.media_urls && message.media_urls.length > 0 ? (
              message._optimistic ? (
                // Optimistic UI: Show thumbnail with loading state
                <OptimisticImageMessage
                  thumbnailUrl={message.thumbnail_url || message.media_urls[0]}
                  fullResUrl={message.media_urls[0]}
                  uploadProgress={message._uploadProgress || 0}
                  status={message._failed ? 'failed' : 'uploading'}
                  caption={content}
                  isOwn={isOwn}
                  onRetry={handleRetryUpload}
                  onCancel={() => {
                    // Cancel upload by marking as failed (WhatsApp style)
                    if (message._tempId) {
                      console.log('🛑 User cancelled upload via UI')
                      useMessagingStore.getState().updateMessage(message.conversation_id, message._tempId, {
                        _failed: true,
                        _uploadProgress: 0
                      })
                    }
                  }}
                />
              ) : (
                // Regular image display with lightbox
                <div className="space-y-2">
                  <ImageMessage
                    imageUrl={message.media_urls[0]}
                    thumbnailUrl={message.thumbnail_url}
                    alt="Shared image"
                    onImageClick={() => {
                      // Get all images from the conversation for gallery navigation
                      const conversationMessages = useMessagingStore.getState().messages.get(message.conversation_id) || []
                      const allImages: string[] = []
                      let currentImageIndex = 0
                      
                      conversationMessages.forEach((msg) => {
                        if (msg.type === 'image' && msg.media_urls && msg.media_urls.length > 0 && !msg._optimistic) {
                          // Track the index of the current image
                          if (msg.id === message.id) {
                            currentImageIndex = allImages.length
                          }
                          allImages.push(...msg.media_urls)
                        }
                      })
                      
                      setLightboxImages(allImages)
                      setLightboxInitialIndex(currentImageIndex)
                      setLightboxOpen(true)
                    }}
                  />
                  {content && <p className="whitespace-pre-wrap mt-2">{content}</p>}
                </div>
              )
            ) : (
              // Fallback for missing media URLs
              <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 text-center min-w-[200px]">
                <p className="text-sm text-gray-500 italic">Image unavailable</p>
                <p className="text-xs text-gray-400 mt-1">Media URL missing</p>
                {content && <p className="whitespace-pre-wrap mt-2 text-left">{content}</p>}
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
                    videoUrl={message.media_urls[0]}
                    thumbnailUrl={message.thumbnail_url}
                    duration={undefined}
                  />
                  {content && <p className="whitespace-pre-wrap mt-2">{content}</p>}
                </div>
              )
            ) : (
              // Fallback for missing video URLs
              <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 text-center min-w-[200px]">
                <p className="text-sm text-gray-500 italic">Video unavailable</p>
                <p className="text-xs text-gray-400 mt-1">Media URL missing</p>
                {content && <p className="whitespace-pre-wrap mt-2 text-left">{content}</p>}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2">
              {message.link_previews && message.link_previews.length > 0 && (
                <div className="space-y-2">
                  {message.link_previews.map((preview, index) => (
                    <LinkPreviewCard 
                      key={`${preview.url}-${index}`}
                      preview={preview}
                      showRemoveButton={false}
                    />
                  ))}
                </div>
              )}
              
              {/* Text content - editing now handled by MessageComposer */}
              <p className="whitespace-pre-wrap">{content}</p>
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
            
            <span className="text-[10px]">
              {formatMessageTime(created_at)}
            </span>
            
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
        </div>
        </div>
      </div>

      {/* Context Menu - Rendered at document body level to avoid scroll container issues */}
      {showContextMenu && createPortal(
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
          onDeleteForEveryone={() => setShowDeleteConfirm(true)}
          canDeleteForEveryone={canDeleteMessage}
          deleteRemainingTime={deleteRemainingTime}
        />,
        document.body
      )}

      {/* Video Player Modal */}
      {showVideoPlayer && message.type === 'video' && message.media_urls && message.media_urls.length > 0 && (
        <VideoPlayer
          videoUrl={message.media_urls[0]}
          thumbnailUrl={message.thumbnail_url || message.media_urls[0]}
          onClose={() => setShowVideoPlayer(false)}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Delete Confirmation Dialog (Story 8.5.3) */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteForEveryone}
        remainingTime={deleteRemainingTime}
        isDeleting={isDeleting}
        showDeleteForMe={false}
      />
    </div>
  )
}
