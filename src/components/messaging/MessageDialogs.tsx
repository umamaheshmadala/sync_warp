import React from 'react'
import { createPortal } from 'react-dom'
import { MessageContextMenu } from './MessageContextMenu'
import { ReportDialog } from '../reporting/ReportDialog'
import { ReactionUserList } from './ReactionUserList'
import { MessageEmojiPicker } from './MessageEmojiPicker'
import { VideoPlayer } from './VideoPlayer'
import { ImageLightbox } from './ImageLightbox'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import type { Message } from '../../types/messaging'

interface Position {
    x: number
    y: number
}

interface MessageDialogsProps {
    message: Message
    isOwn: boolean
    currentUserId: string | undefined
    // Context Menu Props
    showContextMenu: boolean
    contextMenuPosition: Position
    setShowContextMenu: (show: boolean) => void
    onReply?: () => void
    onForward?: () => void
    handleCopy: () => void
    handleShare: () => Promise<void>
    onEdit?: () => void
    canEditMessage: boolean
    editRemainingTime: string
    handleDeleteForMe: () => Promise<void>
    handleDeleteForEveryone: () => Promise<void>
    canDeleteMessage: boolean
    deleteRemainingTime: string
    toggleReaction: (emoji: string) => void
    setShowPicker: (show: boolean) => void
    userReactions: string[]
    onPin?: () => void
    onUnpin?: () => void
    isPinned?: boolean
    setShowReportDialog: (show: boolean) => void
    // Report Dialog Props
    showReportDialog: boolean
    // Reaction User List Props
    selectedEmoji: string | null
    closeReactionUsers: () => void
    emojiUsers: any[]
    loadingUsers: boolean
    popupPosition: Position
    // Emoji Picker Props
    showPicker: boolean
    // Video Player Props
    showVideoPlayer: boolean
    setShowVideoPlayer: (show: boolean) => void
    // Image Lightbox Props
    lightboxImages: string[]
    lightboxInitialIndex: number
    lightboxOpen: boolean
    setLightboxOpen: (show: boolean) => void
    // Delete Confirm Props
    showDeleteConfirm: boolean
    setShowDeleteConfirm: (show: boolean) => void
    isDeleting: boolean
}

export const MessageDialogs = React.memo(function MessageDialogs({
    message,
    isOwn,
    currentUserId,
    showContextMenu,
    contextMenuPosition,
    setShowContextMenu,
    onReply,
    onForward,
    handleCopy,
    handleShare,
    onEdit,
    canEditMessage,
    editRemainingTime,
    handleDeleteForMe,
    handleDeleteForEveryone,
    canDeleteMessage,
    deleteRemainingTime,
    toggleReaction,
    setShowPicker,
    userReactions,
    onPin,
    onUnpin,
    isPinned,
    setShowReportDialog,
    showReportDialog,
    selectedEmoji,
    closeReactionUsers,
    emojiUsers,
    loadingUsers,
    popupPosition,
    showPicker,
    showVideoPlayer,
    setShowVideoPlayer,
    lightboxImages,
    lightboxInitialIndex,
    lightboxOpen,
    setLightboxOpen,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting
}: MessageDialogsProps) {
    return (
        <>
            {/* Context Menu - Rendered at document body level to avoid scroll container issues */}
            {showContextMenu && createPortal(
                <MessageContextMenu
                    message={message}
                    position={contextMenuPosition}
                    isOwn={isOwn}
                    onClose={() => setShowContextMenu(false)}
                    onReply={onReply}
                    onForward={onForward}
                    onCopy={handleCopy}
                    onShare={handleShare}
                    onEdit={onEdit}
                    canEdit={canEditMessage}
                    editRemainingTime={editRemainingTime}
                    onDeleteForMe={handleDeleteForMe}
                    onDeleteForEveryone={handleDeleteForEveryone}
                    canDeleteForEveryone={canDeleteMessage}
                    deleteRemainingTime={deleteRemainingTime}
                    onReact={toggleReaction}
                    onOpenPicker={() => {
                        setShowContextMenu(false)
                        setShowPicker(true)
                    }}
                    userReactions={userReactions}
                    onPin={onPin}
                    onUnpin={onUnpin}
                    isPinned={isPinned}
                    onReport={() => {
                        setShowContextMenu(false)
                        setShowReportDialog(true)
                    }}
                />,
                document.body
            )}

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
            {showDeleteConfirm && createPortal(
                <DeleteConfirmationDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDeleteForEveryone}
                    remainingTime={deleteRemainingTime}
                    isDeleting={isDeleting}
                    showDeleteForMe={false}
                />,
                document.body
            )}
        </>
    )
})
