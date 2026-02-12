// src/hooks/useVideoUpload.ts
import { useState, useCallback } from 'react'
import { mediaUploadService } from '../services/mediaUploadService'
import { toast } from 'react-hot-toast'

interface VideoUploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

export function useVideoUpload() {
  const [uploadState, setUploadState] = useState<VideoUploadState>({
    isUploading: false,
    progress: 0,
    error: null
  })

  const uploadVideo = useCallback(async (
    file: File | null,
    conversationId: string,
    onProgress?: (progress: number) => void,
    nativePath?: string
  ) => {
    setUploadState({ isUploading: true, progress: 0, error: null })

    try {
      // Validate file type (only for web file)
      if (file && !file.type.startsWith('video/')) {
        throw new Error('File must be a video')
      }

      // Upload with progress tracking
      const { url, thumbnailUrl, duration } = await mediaUploadService.uploadVideo(
        file,
        nativePath || null,
        conversationId,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }))
          onProgress?.(progress)
        }
      )

      setUploadState({ isUploading: false, progress: 100, error: null })
      toast.success('Video uploaded successfully!')

      return { url, thumbnailUrl, duration }
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed'
      // Don't toast for user cancellations
      if (errorMessage !== 'Upload cancelled') {
        toast.error(errorMessage)
      }
      setUploadState({ isUploading: false, progress: 0, error: errorMessage })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setUploadState({ isUploading: false, progress: 0, error: null })
  }, [])

  return {
    uploadVideo,
    reset,
    ...uploadState
  }
}
