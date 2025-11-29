// src/hooks/useImageUpload.ts
import { useState, useCallback } from 'react'
import { mediaUploadService } from '../services/mediaUploadService'
import { toast } from 'react-hot-toast'

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

export function useImageUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null
  })

  const uploadImage = useCallback(async (file: File, conversationId: string) => {
    setUploadState({ isUploading: true, progress: 0, error: null })

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }

      // Validate file size (max 10MB original)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Image size must be less than 10MB')
      }

      // Upload with progress tracking
      const { url, thumbnailUrl } = await mediaUploadService.uploadImage(
        file,
        conversationId,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress: progress.percentage }))
        }
      )

      setUploadState({ isUploading: false, progress: 100, error: null })
      toast.success('Image uploaded successfully!')

      return { url, thumbnailUrl }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({ isUploading: false, progress: 0, error: errorMessage })
      toast.error(errorMessage)
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setUploadState({ isUploading: false, progress: 0, error: null })
  }, [])

  return {
    uploadImage,
    reset,
    ...uploadState
  }
}
