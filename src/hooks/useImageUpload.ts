// src/hooks/useImageUpload.ts
import { useState, useCallback, useRef } from 'react'
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
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setUploadState({ isUploading: false, progress: 0, error: 'Upload cancelled' })
    }
  }, [])

  const uploadImage = useCallback(async (
    file: File, 
    conversationId: string,
    onProgress?: (progress: number) => void
  ) => {
    setUploadState({ isUploading: true, progress: 0, error: null })
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()

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
          const percentage = progress.percentage
          setUploadState(prev => ({ ...prev, progress: percentage }))
          // Call external progress callback if provided
          onProgress?.(percentage)
        },
        abortControllerRef.current.signal
      )

      setUploadState({ isUploading: false, progress: 100, error: null })
      // toast.success('Image uploaded successfully!') - Moved to caller

      return { url, thumbnailUrl }
    } catch (error) {
      // Don't show error toast if cancelled
      if (error instanceof Error && error.message === 'Upload cancelled') {
        setUploadState({ isUploading: false, progress: 0, error: 'Upload cancelled' })
        throw error
      }

      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({ isUploading: false, progress: 0, error: errorMessage })
      toast.error(errorMessage)
      throw error
    } finally {
      abortControllerRef.current = null
    }
  }, [])

  return {
    ...uploadState,
    uploadImage,
    cancelUpload
  }
}

