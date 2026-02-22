import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mediaUploadService } from '../services/mediaUploadService'
import { messagingService } from '../services/messagingService'
import { useMessagingStore } from '../store/messagingStore'
import type { Message } from '../types/messaging'
import toast from 'react-hot-toast'

interface UseMessageRetryProps {
    message: Message
}

export function useMessageRetry({ message }: UseMessageRetryProps) {
    const handleRetryUpload = useCallback(async () => {
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
                    const currentMessages = useMessagingStore.getState().messages[conversationId] || []
                    const currentMsg = currentMessages.find((m: Message) => m._tempId === tempId)
                    if (currentMsg?._failed) {
                        throw new Error('Cancelled')
                    }

                    useMessagingStore.getState().updateMessage(conversationId, tempId!, {
                        _uploadProgress: progress.percentage
                    })
                }
            )

            // Check for cancellation AFTER upload completes
            const currentMsg = useMessagingStore.getState().messages[conversationId]?.find((m: Message) => m._tempId === tempId)
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
    }, [message])

    return { handleRetryUpload }
}
