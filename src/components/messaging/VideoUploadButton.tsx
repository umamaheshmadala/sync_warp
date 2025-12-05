// src/components/messaging/VideoUploadButton.tsx
import React, { useRef, useState } from 'react'
import { Video, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useVideoUpload } from '../../hooks/useVideoUpload'
import { useSendMessage } from '../../hooks/useSendMessage'
import { useMessagingStore } from '../../store/messagingStore'
import { useAuthStore } from '../../store/authStore'
import { mediaUploadService } from '../../services/mediaUploadService'
import { supabase } from '../../lib/supabase'
import type { Message } from '../../types/messaging'

interface Props {
  conversationId: string
  onUploadStart?: () => void
  onUploadComplete?: () => void
  variant?: 'icon' | 'menu'  // 'icon' = small icon button, 'menu' = full menu item
}

export function VideoUploadButton({ 
  conversationId, 
  onUploadStart, 
  onUploadComplete,
  variant = 'icon'
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef<boolean>(false)
  const { uploadVideo, isUploading, progress } = useVideoUpload()
  const { sendMessage } = useSendMessage()
  const { addOptimisticMessage, removeMessage, updateMessageProgress } = useMessagingStore()
  const currentUserId = useAuthStore(state => state.user?.id)
  const [currentTempId, setCurrentTempId] = useState<string>('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTempId(tempId)
    cancelledRef.current = false
    let blobUrl = ''
    let thumbnailBlobUrl = ''

    try {
      blobUrl = URL.createObjectURL(file)
      
      // Generate thumbnail immediately for optimistic UI
      const thumbnailBlob = await mediaUploadService.generateVideoThumbnail(file)
      thumbnailBlobUrl = URL.createObjectURL(thumbnailBlob)

      // Create optimistic message
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId || 'unknown',
        content: '',
        type: 'video',
        media_urls: [blobUrl],
        thumbnail_url: thumbnailBlobUrl,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _optimistic: true,
        _tempId: tempId,
        _uploadProgress: 0,
        _failed: false
      }

      addOptimisticMessage(conversationId, optimisticMessage)
      onUploadStart?.()

      // Upload video
      const { url, thumbnailUrl, duration } = await uploadVideo(
        file,
        conversationId,
        (uploadProgress) => {
          if (cancelledRef.current) return
          
          // Check if message was cancelled externally
          const currentMessages = useMessagingStore.getState().messages.get(conversationId) || []
          const currentMsg = currentMessages.find(m => m._tempId === tempId)
          
          if (!currentMsg || currentMsg._failed) {
            console.log('⏹️ External cancellation detected during progress update')
            cancelledRef.current = true
            return
          }

          updateMessageProgress(conversationId, tempId, uploadProgress)
        }
      )

      // Check if cancelled after upload
      const currentMessages = useMessagingStore.getState().messages.get(conversationId) || []
      const finalMsg = currentMessages.find(m => m._tempId === tempId)
      
      if (cancelledRef.current || !finalMsg || finalMsg._failed) {
        console.log('⏹️ Upload cancelled, cleaning up files')
        await mediaUploadService.deleteImage(url)
        await mediaUploadService.deleteImage(thumbnailUrl)
        return
      }

      // Get public URLs
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(url)

      const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(thumbnailUrl)

      console.log('🔗 Public URLs:', { publicUrl, thumbPublicUrl })

      // Send message
      console.log('📤 Sending message with mediaUrls:', [publicUrl])
      await sendMessage({
        conversationId,
        content: '',
        type: 'video',
        mediaUrls: [publicUrl],
        thumbnailUrl: thumbPublicUrl
      })

      // Remove optimistic message
      removeMessage(conversationId, tempId)
      onUploadComplete?.()

    } catch (error) {
      console.error('❌ Video upload failed:', error)
      
      // Mark as failed
      const currentMessages = useMessagingStore.getState().messages.get(conversationId) || []
      const failedMsg = currentMessages.find(m => m._tempId === tempId)
      
      if (failedMsg) {
        useMessagingStore.getState().updateMessage(conversationId, tempId, {
          _failed: true,
          _uploadProgress: 0
        })
      }
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Cleanup blob URLs (but keep them if failed for retry)
      const currentMessages = useMessagingStore.getState().messages.get(conversationId) || []
      const finalMsg = currentMessages.find(m => m._tempId === tempId)
      
      if (!finalMsg?._failed) {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
        if (thumbnailBlobUrl) URL.revokeObjectURL(thumbnailBlobUrl)
      }
    }
  }

  // Menu variant - full width menu item with icon and text
  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
            ) : (
              <Video className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <span className="text-sm font-medium text-gray-700">Video</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={handleFileSelect}
          className="hidden"
        />
      </>
    )
  }

  // Icon variant (default) - small icon button
  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Upload video"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <Video className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  )
}
