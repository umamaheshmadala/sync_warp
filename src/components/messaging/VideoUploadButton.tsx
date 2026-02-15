// src/components/messaging/VideoUploadButton.tsx
import React, { useRef, useState } from 'react'
import { Video, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useVideoUpload } from '../../hooks/useVideoUpload'
import { messagingService } from '../../services/messagingService'
import { useMessagingStore } from '../../store/messagingStore'
import { useAuthStore } from '../../store/authStore'
import { mediaUploadService } from '../../services/mediaUploadService'
import { supabase } from '../../lib/supabase'
import { Capacitor } from '@capacitor/core'
import type { Message } from '../../types/messaging'
import { VideoPreviewModal } from './VideoPreviewModal'

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
  // const { sendMessage } = useSendMessage() // Removed to avoid double optimistic message
  const { addOptimisticMessage, replaceOptimisticMessage, removeMessage, updateMessageProgress, updateMessage } = useMessagingStore()
  const currentUserId = useAuthStore(state => state.user?.id)
  const [currentTempId, setCurrentTempId] = useState<string>('')

  // Preview Loop State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [nativePath, setNativePath] = useState<string | undefined>(undefined)
  const [showPreview, setShowPreview] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Open preview modal instead of uploading immediately
    setSelectedFile(file)
    setNativePath(undefined)
    setShowPreview(true)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNativePick = async () => {
    try {
      const result = await mediaUploadService.pickVideo()
      if (!result) return

      const { path, duration } = result
      if (!path) return

      // Open preview modal
      setSelectedFile(null)
      setNativePath(path)
      setShowPreview(true)

    } catch (error) {
      console.error('❌ Native pick failed:', error)
      toast.error('Failed to select video')
    }
  }

  const handleSendFromPreview = async (caption: string, thumbnailBlob?: Blob) => {
    setShowPreview(false)

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTempId(tempId)
    cancelledRef.current = false

    let blobUrl = ''
    let thumbnailBlobUrl = ''

    try {
      // 1. Generate Optimistic Preview
      if (thumbnailBlob) {
        thumbnailBlobUrl = URL.createObjectURL(thumbnailBlob)
      }

      if (selectedFile) {
        blobUrl = URL.createObjectURL(selectedFile)
        // Only generate if we didn't get one from preview (e.g. if capture failed)
        if (!thumbnailBlobUrl) {
          const generatedThumb = await mediaUploadService.generateVideoThumbnail(selectedFile)
          thumbnailBlobUrl = URL.createObjectURL(generatedThumb)
        }
      } else {
        // Native path - use converted src for preview
        if (nativePath) {
          // We need to import Capacitor dynamically or just use the global one if available, 
          // but we already imported it at the top of the file
          blobUrl = Capacitor.convertFileSrc(nativePath)
        }
      }

      // 2. Create Optimistic Message
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId || 'unknown',
        content: caption || '', // Use caption!
        type: 'video',
        media_urls: blobUrl ? [blobUrl] : [], // Empty if native path for now
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

      // 3. Upload
      const { url, thumbnailUrl, duration } = await uploadVideo(
        selectedFile,
        conversationId,
        (uploadProgress) => {
          if (cancelledRef.current) return
          updateMessageProgress(conversationId, tempId, uploadProgress)
        },
        nativePath
      )

      // 4. Get Public URLs
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(url)

      const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(thumbnailUrl)

      // UPDATE OPTIMISTIC MESSAGE: Set public URL so store can detecting duplication
      updateMessage(conversationId, tempId, {
        media_urls: [publicUrl],
        thumbnail_url: thumbPublicUrl
      })

      // 5. Send Real Message directly (bypass useSendMessage to avoid duplicate optimistic msg)
      const realMessageId = await messagingService.sendMessage({
        conversationId,
        content: caption,
        type: 'video',
        mediaUrls: [publicUrl],
        thumbnailUrl: thumbPublicUrl
      })

      // 6. Replace Optimistic Message with Real One
      if (realMessageId) {
        const confirmedMessage: Message = {
          ...optimisticMessage,
          id: realMessageId,
          media_urls: [publicUrl],
          thumbnail_url: thumbPublicUrl,
          _optimistic: false,
          _tempId: undefined,
          status: 'sent' as const,
          created_at: new Date().toISOString()
        }

        replaceOptimisticMessage(conversationId, tempId, confirmedMessage)
      } else {
        throw new Error('Failed to get real message ID')
      }

      onUploadComplete?.()

    } catch (error) {
      console.error('❌ Video upload failed:', error)
      // Mark failed...
      useMessagingStore.getState().updateMessage(conversationId, tempId, {
        _failed: true,
        _uploadProgress: 0
      })
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      if (thumbnailBlobUrl) URL.revokeObjectURL(thumbnailBlobUrl)
      setSelectedFile(null)
      setNativePath(undefined)
    }
  }

  const handleClick = () => {
    if (Capacitor.isNativePlatform()) {
      handleNativePick()
    } else {
      fileInputRef.current?.click()
    }
  }

  return (
    <>
      {variant === 'menu' ? (
        <button
          onClick={handleClick}
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
      ) : (
        <button
          onClick={handleClick}
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
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Modal */}
      {showPreview && (
        <VideoPreviewModal
          file={selectedFile}
          videoPath={nativePath}
          onClose={() => {
            setShowPreview(false)
            setSelectedFile(null)
            setNativePath(undefined)
          }}
          onSend={handleSendFromPreview}
        />
      )}
    </>
  )
}
