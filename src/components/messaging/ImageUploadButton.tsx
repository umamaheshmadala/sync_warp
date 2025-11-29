// src/components/messaging/ImageUploadButton.tsx
import React, { useRef } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { useImageUpload } from '../../hooks/useImageUpload'
import { useSendMessage } from '../../hooks/useSendMessage'
import { mediaUploadService } from '../../services/mediaUploadService'

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
  const { uploadImage, isUploading, progress } = useImageUpload()
  const { sendMessage } = useSendMessage()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      onUploadStart?.()

      // Upload image
      const { url, thumbnailUrl } = await uploadImage(file, conversationId)

      // Get signed URLs
      const signedUrl = await mediaUploadService.getSignedUrl(url)
      const signedThumbUrl = await mediaUploadService.getSignedUrl(thumbnailUrl)

      // Send message with image
      await sendMessage({
        conversationId,
        content: '',
        type: 'image',
        mediaUrls: [signedUrl],
        thumbnailUrl: signedThumbUrl
      })

      onUploadComplete?.()
    } catch (error) {
      // Error handled by hooks
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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

      {isUploading && (
        <div className="absolute bottom-full mb-2 left-0 bg-white shadow-lg rounded-lg p-3 min-w-[200px] z-10">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Uploading image...
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{progress}%</div>
        </div>
      )}
    </>
  )
}
