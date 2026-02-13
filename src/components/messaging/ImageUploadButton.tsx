// src/components/messaging/ImageUploadButton.tsx
import React, { useRef, useState } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useImageUpload } from '../../hooks/useImageUpload'
import { useSendMessage } from '../../hooks/useSendMessage'
import { useMessagingStore } from '../../store/messagingStore'
import { useAuthStore } from '../../store/authStore'
import { mediaUploadService } from '../../services/mediaUploadService'
import { supabase } from '../../lib/supabase'
import { ImagePreviewModal } from './ImagePreviewModal'
import type { Message } from '../../types/messaging'

interface Props {
  conversationId: string
  onUploadStart?: () => void
  onUploadComplete?: () => void
  variant?: 'icon' | 'menu'  // 'icon' = small icon button, 'menu' = full menu item
}

export function ImageUploadButton({
  conversationId,
  onUploadStart,
  onUploadComplete,
  variant = 'icon'
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef<boolean>(false) // Track cancellation
  const { uploadImage, isUploading, cancelUpload } = useImageUpload()
  const { sendMessage } = useSendMessage()
  const { addOptimisticMessage, removeMessage, updateMessageProgress } = useMessagingStore()
  const currentUserId = useAuthStore(state => state.user?.id)

  const [showPreview, setShowPreview] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [currentTempId, setCurrentTempId] = useState<string>('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    console.log('📸 [ImageUpload] handleFileSelect called:', {
      count: files.length,
      files: files.map(f => f.name)
    })

    if (files.length === 0) return

    if (files.length > 10) {
      toast.error('You can only select up to 10 images')
      return
    }

    try {
      const newFiles: File[] = []
      const newUrls: string[] = []

      for (const file of files) {
        // Read file data immediately to create persistent blob for Android
        // On Android, the File object becomes invalid after picker closes
        const arrayBuffer = await file.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: file.type })
        const persistentFile = new File([blob], file.name, { type: file.type })
        const blobUrl = URL.createObjectURL(persistentFile)

        newFiles.push(persistentFile)
        newUrls.push(blobUrl)
      }

      setSelectedFiles(newFiles)
      setPreviewUrls(newUrls)
      setShowPreview(true)
      console.log('📸 [ImageUpload] State updated, showPreview set to true')
    } catch (error) {
      console.error('📸 [ImageUpload] Failed to read files:', error)
      toast.error('Failed to load images')
    }
  }

  const handleRemoveImage = (index: number) => {
    if (index < 0 || index >= selectedFiles.length) return

    const newFiles = [...selectedFiles]
    const newUrls = [...previewUrls]

    // Revoke URL to avoid memory leaks
    URL.revokeObjectURL(newUrls[index])

    newFiles.splice(index, 1)
    newUrls.splice(index, 1)

    setSelectedFiles(newFiles)
    setPreviewUrls(newUrls)
  }

  const handleSendFromPreview = async (caption: string, useHD: boolean) => {
    if (selectedFiles.length === 0) return

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTempId(tempId)
    cancelledRef.current = false

    // Keep reference to blob URLs for cleanup later
    const blobUrls = [...previewUrls]

    try {
      // Don't revoke yet, we need them for optimistic message
      handleCancelPreview(false) // false = don't revoke/reset state deeply yet

      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId || 'unknown',
        content: caption,
        type: 'image',
        media_urls: blobUrls,
        thumbnail_url: blobUrls[0], // Use first image as thumbnail
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

      const uploadedUrls: string[] = []
      const uploadedThumbnails: string[] = []
      let completedCount = 0
      const totalCount = selectedFiles.length

      // Upload images sequentially or in parallel?
      // Parallel is faster but might overwhelm connection. Let's do parallel with Promise.all
      // But we need to aggregate progress.

      const uploadPromises = selectedFiles.map(async (file, index) => {
        if (cancelledRef.current) return null

        return await uploadImage(
          file,
          conversationId,
          (uploadProgress) => {
            if (cancelledRef.current) return

            // Check if message was cancelled externally (by MessageBubble UI)
            const currentMessages = useMessagingStore.getState().messages.get(conversationId) || []
            const currentMsg = currentMessages.find(m => m._tempId === tempId)

            if (!currentMsg || currentMsg._failed) {
              console.log('⏹️ External cancellation detected during progress update')
              cancelledRef.current = true
              cancelUpload()
              return
            }

            // Approximate total progress
            // This is a bit rough for parallel uploads but sufficient for UI
            // We won't update store on every tick of every file, maybe just strictly increasing?
            // Actually, with parallel, it's hard to sum correct percentages without global tracking.
            // Let's simplified: just update heartbeat or ignore granular progress for now? 
            // Or better: (completed files * 100 + current file progress) / total files
            // Capturing individual progress is complex in parallel. 
            // We'll just update based on completed count for now to be safe and simple.
          }
        )
      })

      // Wait for all uploads
      const results = await Promise.all(uploadPromises)

      // Filter out failures/nulls
      for (const result of results) {
        if (result) {
          uploadedUrls.push(result.url)
          uploadedThumbnails.push(result.thumbnailUrl)
        }
      }

      // Check if cancelled after upload OR if message is failed/missing
      const finalMessages = useMessagingStore.getState().messages.get(conversationId) || []
      const finalMsg = finalMessages.find(m => m._tempId === tempId)

      if (cancelledRef.current || !finalMsg || finalMsg._failed || uploadedUrls.length !== selectedFiles.length) {
        console.log('⏹️ Upload cancelled, failed, or partial success. Cleaning up...')

        // Handle partial success? For now, fail all if any fail to keep it simple (transactional-ish)
        // Or if user cancelled.

        // Ensure message is failed if it exists (and wasn't already marked)
        if (finalMsg && !finalMsg._failed) {
          useMessagingStore.getState().updateMessage(conversationId, tempId, {
            _failed: true,
            _optimistic: true,
            _uploadProgress: 0
          })
        }

        // Cleanup uploaded files from Supabase
        if (uploadedUrls.length > 0) {
          const { error: deleteError } = await supabase.storage.from('message-attachments').remove([...uploadedUrls, ...uploadedThumbnails])
          if (deleteError) console.error('❌ Error deleting orphaned files:', deleteError)
        }

        // Cleanup local blobs
        blobUrls.forEach(url => URL.revokeObjectURL(url))
        setCurrentTempId('')
        return
      }

      console.log('📤 Upload complete, getting URLs...')

      // Get public URLs
      const publicMediaUrls: string[] = []
      let publicThumbUrl = ''

      for (let i = 0; i < uploadedUrls.length; i++) {
        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(uploadedUrls[i])
        publicMediaUrls.push(publicUrl)

        if (i === 0) {
          const { data: { publicUrl: thumb } } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(uploadedThumbnails[i])
          publicThumbUrl = thumb
        }
      }

      console.log('🔗 Public URLs:', publicMediaUrls)

      // Send actual message
      await sendMessage({
        conversationId,
        content: caption,
        type: 'image',
        mediaUrls: publicMediaUrls,
        thumbnailUrl: publicThumbUrl
      })

      console.log('✅ Message sent with public URLs')
      toast.success('Images sent successfully')

      // Clean up blob URLs
      blobUrls.forEach(url => URL.revokeObjectURL(url))

      // Remove optimistic message
      removeMessage(conversationId, tempId)

      setCurrentTempId('')
      onUploadComplete?.()

    } catch (error: any) {
      // Handle cancellation error specifically
      if (error.message === 'Upload cancelled' || cancelledRef.current) {
        console.log('⏹️ Upload cancelled caught in catch block')
        if (tempId) {
          useMessagingStore.getState().updateMessage(conversationId, tempId, {
            _failed: true,
            _optimistic: true,
            _uploadProgress: 0
          })
        }
        setCurrentTempId('')
        return
      }

      console.error('❌ Image upload error:', error)
      // Mark as failed
      if (tempId && !cancelledRef.current) {
        useMessagingStore.getState().updateMessage(conversationId, tempId, {
          _failed: true,
          _optimistic: false
        })
      }

      // Cleanup local blobs
      blobUrls.forEach(url => URL.revokeObjectURL(url))
      setCurrentTempId('')
    }
  }

  const handleCancelPreview = (fullReset = true) => {
    // Clean up blob URLs if full reset
    if (fullReset) {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setSelectedFiles([])
    }

    // Reset state
    setShowPreview(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleReorder = (newFiles: File[], newUrls: string[]) => {
    setSelectedFiles(newFiles)
    setPreviewUrls(newUrls)
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
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <ImageIcon className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <span className="text-sm font-medium text-gray-700">Photos</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        {showPreview && (
          <ImagePreviewModal
            isOpen={showPreview}
            imageFiles={selectedFiles}
            imageUrls={previewUrls}
            onSend={handleSendFromPreview}
            onCancel={() => handleCancelPreview(true)}
            onRemoveImage={handleRemoveImage}
            onReorder={handleReorder}
          />
        )}
      </>
    )
  }

  // Icon variant (default) - small icon button
  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
        aria-label="Upload images"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Modal */}
      {showPreview && (
        <ImagePreviewModal
          isOpen={showPreview}
          imageFiles={selectedFiles}
          imageUrls={previewUrls}
          onSend={handleSendFromPreview}
          onCancel={() => handleCancelPreview(true)}
          onRemoveImage={handleRemoveImage}
          onReorder={handleReorder}
        />
      )}
    </>
  )
}
