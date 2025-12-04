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
}

export function ImageUploadButton({ 
  conversationId, 
  onUploadStart, 
  onUploadComplete 
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef<boolean>(false) // Track cancellation
  const { uploadImage, isUploading, progress, cancelUpload } = useImageUpload()
  const { sendMessage } = useSendMessage()
  const { addOptimisticMessage, removeMessage, updateMessageProgress } = useMessagingStore()
  const currentUserId = useAuthStore(state => state.user?.id)

  // ... (state remains same)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [currentTempId, setCurrentTempId] = useState<string>('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      // Read file data immediately to create persistent blob for Android
      // On Android, the File object becomes invalid after picker closes
      const arrayBuffer = await file.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: file.type })
      const persistentFile = new File([blob], file.name, { type: file.type })
      const blobUrl = URL.createObjectURL(persistentFile)
      
      setSelectedFile(persistentFile)
      setPreviewUrl(blobUrl)
      setShowPreview(true)
    } catch (error) {
      console.error('Failed to read file:', error)
      toast.error('Failed to load image')
    }
  }

  const handleSendFromPreview = async (caption: string, useHD: boolean) => {
    if (!selectedFile) return

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTempId(tempId)
    cancelledRef.current = false
    let blobUrl = ''

    try {
      blobUrl = URL.createObjectURL(selectedFile)
      handleCancelPreview()

      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId || 'unknown',
        content: caption,
        type: 'image',
        media_urls: [blobUrl],
        thumbnail_url: blobUrl,
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

      // Upload image
      const { url, thumbnailUrl } = await uploadImage(
        selectedFile,
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

          updateMessageProgress(conversationId, tempId, uploadProgress)
        }
      )

      // Check if cancelled after upload OR if message is failed/missing
      const finalMessages = useMessagingStore.getState().messages.get(conversationId) || []
      const finalMsg = finalMessages.find(m => m._tempId === tempId)

      if (cancelledRef.current || !finalMsg || finalMsg._failed) {
        console.log('⏹️ Upload cancelled or message failed, cleaning up...')
        console.log('📝 Message state:', finalMsg)
        
        // Ensure message is failed if it exists (and wasn't already marked)
        if (finalMsg && !finalMsg._failed) {
            console.log('📝 Marking message as failed')
            useMessagingStore.getState().updateMessage(conversationId, tempId, {
              _failed: true,
              _optimistic: true, // Keep optimistic so it doesn't look for public URL
              _uploadProgress: 0
            })
        }
        
        // Cleanup uploaded files from Supabase to respect privacy
        const { error: deleteError } = await supabase.storage.from('message-attachments').remove([url, thumbnailUrl])
        if (deleteError) {
            console.error('❌ Error deleting orphaned files:', deleteError)
        } else {
            console.log('🗑️ Deleted orphaned files from storage')
        }
        
        // Do NOT revoke blob URL immediately if we want to show the failed image
        // But we must eventually. For now, let's keep it.
        // URL.revokeObjectURL(blobUrl) 
        
        setCurrentTempId('')
        return
      }

      console.log('📤 Upload complete, getting URLs...', { url, thumbnailUrl })

      // Get public URLs from storage
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(url)

      const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(thumbnailUrl)

      console.log('🔗 Public URLs:', { publicUrl, thumbPublicUrl })

      // Check if cancelled after upload OR if message is failed/missing
      
      if (cancelledRef.current || !finalMsg || finalMsg._failed) {
        console.log('🛑 Upload cancelled or message failed, aborting send')
        // Clean up uploaded files since we're not sending the message
        if (url) await mediaUploadService.deleteImage(url)
        if (thumbnailUrl) await mediaUploadService.deleteImage(thumbnailUrl)
        return
      }

      console.log('📤 Sending message with mediaUrls:', [publicUrl])

      // Remove optimistic message
      removeMessage(conversationId, tempId)

      // Send actual message with public URLs (NOT blob URL)
      await sendMessage({
        conversationId,
        content: caption,
        type: 'image',
        mediaUrls: [publicUrl],
        thumbnailUrl: thumbPublicUrl
      })

      console.log('✅ Message sent with public URLs')
      toast.success('Image sent successfully')

      // Clean up blob URL
      URL.revokeObjectURL(blobUrl)
      setCurrentTempId('')

      onUploadComplete?.()
    } catch (error: any) {
      // Handle cancellation error specifically
      if (error.message === 'Upload cancelled' || cancelledRef.current) {
        console.log('⏹️ Upload cancelled caught in catch block')
        // Mark as failed instead of removing (WhatsApp style)
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
      
      // Mark message as failed
      if (tempId && !cancelledRef.current) {
        useMessagingStore.getState().updateMessage(conversationId, tempId, {
          _failed: true,
          _optimistic: false
        })
      }

      // Clean up blob URL on error
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
      
      setCurrentTempId('')
    }
  }

  const handleCancelPreview = () => {
    // Clean up blob URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    // Reset state
    setShowPreview(false)
    setPreviewUrl('')

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
        aria-label="Upload image"
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
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Modal */}
      {selectedFile && showPreview && (
        <ImagePreviewModal
          isOpen={showPreview}
          imageFile={selectedFile}
          imageUrl={previewUrl}
          onSend={handleSendFromPreview}
          onCancel={handleCancelPreview}
        />
      )}
    </>
  )
}
