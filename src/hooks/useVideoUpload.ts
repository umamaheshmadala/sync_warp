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
    file: File, 
    conversationId: string,
    onProgress?: (progress: number) => void
  ) => {
    setUploadState({ isUploading: true, progress: 0, error: null })

    try {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        throw new Error('File must be a video')
      }

      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('Video size must be less than 25MB')
      }

      // Upload with progress tracking
      const { url, thumbnailUrl, duration } = await mediaUploadService.uploadVideo(
        file,
        conversationId,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }))
          onProgress?.(progress)
        }
      )

      setUploadState({ isUploading: false, progress: 100, error: null })
      toast.success('Video uploaded successfully!')

      return { url, thumbnailUrl, duration }
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
    uploadVideo,
    reset,
    ...uploadState
  }
}
