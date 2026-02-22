import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useMessagingStore } from '../store/messagingStore'
import { messageDeleteService } from '../services/messageDeleteService'
import { useShare } from './useShare'
import type { Message } from '../types/messaging'

interface UseMessageActionsProps {
    message: Message
    isOwn: boolean
    content: string
}

export function useMessageActions({ message, isOwn, content }: UseMessageActionsProps) {
    const queryClient = useQueryClient()
    const { shareImage, shareVideo, shareLink } = useShare()

    // State
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [editRemainingTime, setEditRemainingTime] = useState('')
    const [deleteRemainingTime, setDeleteRemainingTime] = useState('')

    // Constants
    const EDIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
    const DELETE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

    // Eligibility
    const canEditMessage =
        isOwn &&
        !message._optimistic &&
        !message._failed &&
        message.type === 'text' &&
        new Date().getTime() - new Date(message.created_at).getTime() < EDIT_WINDOW_MS

    const canDeleteMessage =
        isOwn &&
        !message._optimistic &&
        !message._failed &&
        new Date().getTime() - new Date(message.created_at).getTime() < DELETE_WINDOW_MS

    // Timers
    useEffect(() => {
        if (!canEditMessage && !canDeleteMessage) return

        const updateTimers = () => {
            const now = new Date().getTime()
            const messageTime = new Date(message.created_at).getTime()
            const elapsed = now - messageTime

            if (canEditMessage) {
                const remainingEdit = EDIT_WINDOW_MS - elapsed
                if (remainingEdit > 0) {
                    const mins = Math.floor(remainingEdit / 60000)
                    const secs = Math.floor((remainingEdit % 60000) / 1000)
                    setEditRemainingTime(`${mins}:${secs.toString().padStart(2, '0')}`)
                } else {
                    setEditRemainingTime('')
                }
            }

            if (canDeleteMessage) {
                const remainingDelete = DELETE_WINDOW_MS - elapsed
                if (remainingDelete > 0) {
                    const mins = Math.floor(remainingDelete / 60000)
                    const secs = Math.floor((remainingDelete % 60000) / 1000)
                    setDeleteRemainingTime(`${mins}:${secs.toString().padStart(2, '0')}`)
                } else {
                    setDeleteRemainingTime('')
                }
            }
        }

        updateTimers()
        const timer = setInterval(updateTimers, 1000)
        return () => clearInterval(timer)
    }, [message.created_at, canEditMessage, canDeleteMessage, EDIT_WINDOW_MS, DELETE_WINDOW_MS])

    // Context Menu Handlers
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(content)
        toast.success('Message copied')
    }, [content])

    const handleShare = useCallback(async () => {
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
                await shareLink(window.location.href, content, message.id)
            }
        } catch (error) {
            console.error('Share failed:', error)
        }
    }, [message, content, shareImage, shareVideo, shareLink])

    const handleDeleteForMe = useCallback(async () => {
        try {
            const result = await messageDeleteService.deleteForMe(message.id)
            if (result.success) {
                // Optimistic UI: Remove message immediately
                useMessagingStore.getState().removeMessage(message.conversation_id, message.id)

                // Remove from React Query cache
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
    }, [message.id, message.conversation_id, queryClient])

    const handleDeleteForEveryone = useCallback(async () => {
        setIsDeleting(true)
        try {
            const result = await messageDeleteService.deleteMessage(message.id)
            if (result.success) {
                setShowDeleteConfirm(false)
                useMessagingStore.getState().updateMessage(message.conversation_id, message.id, {
                    is_deleted: true,
                    deleted_at: new Date().toISOString()
                })
                toast((t) => (
                    <div className="flex items-center gap-3">
                        <span>Message deleted for everyone</span>
                        <button
                            onClick={async () => {
                                const undoResult = await messageDeleteService.undoDelete(message.id)
                                toast.dismiss(t.id)
                                if (undoResult.success) {
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
    }, [message.id, message.conversation_id])

    return {
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
    }
}
