// src/services/mediaUploadService.ts
import { supabase } from '../lib/supabase'
import imageCompression from 'browser-image-compression'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

class MediaUploadService {
  private uploadCallbacks: Map<string, (progress: UploadProgress) => void> = new Map()
  private readonly MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25MB

  /**
   * 📱 Platform-conditional image picker
   * Web: Returns File from input
   * iOS/Android: Opens native camera or photo library
   */
  async pickImage(source: 'camera' | 'gallery' = 'gallery'): Promise<File | null> {
    if (Capacitor.isNativePlatform()) {
      // MOBILE: Use Capacitor Camera plugin
      try {
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
          quality: 90,
          allowEditing: true,
          width: 1920,
          height: 1920
        })
        
        // Convert URI to File
        return await this.uriToFile(photo.webPath!, photo.format, 'image')
      } catch (error: any) {
        console.error('❌ Camera access failed:', error)
        
        // Check for permission errors
        if (error.message?.includes('permission')) {
          throw new Error('Camera permission required. Please enable in Settings.')
        }
        
        return null
      }
    } else {
      // WEB: Return null, handled by file input
      return null
    }
  }
  
  /**
   * 📱 MOBILE ONLY: Convert native file URI to File object
   */
  private async uriToFile(uri: string, format: string, type: 'image' | 'video' = 'image'): Promise<File> {
    const response = await fetch(uri)
    const blob = await response.blob()
    const fileName = `capture-${Date.now()}.${format}`
    return new File([blob], fileName, { type: `${type}/${format}` })
  }

  /**
   * Compress image before upload
   * Target: 60-80% file size reduction
   * Works on BOTH web and mobile
   */
  async compressImage(file: File): Promise<File> {
    console.log('🔄 Compressing image:', file.name, 'Original size:', file.size)

    const options = {
      maxSizeMB: 1, // Target 1MB max
      maxWidthOrHeight: 1920, // Max dimension
      useWebWorker: !Capacitor.isNativePlatform(), // Disable web worker on mobile
      fileType: file.type, // Maintain original format
      initialQuality: 0.8 // Start with 80% quality
    }

    try {
      const compressed = await imageCompression(file, options)
      const reduction = ((file.size - compressed.size) / file.size * 100).toFixed(1)
      console.log('✅ Compressed:', compressed.size, `(${reduction}% reduction)`)
      
      return compressed
    } catch (error) {
      console.error('❌ Compression failed:', error)
      throw new Error('Failed to compress image')
    }
  }

  /**
   * Generate thumbnail (max 300px)
   * Works on BOTH web and mobile
   */
  async generateThumbnail(file: File): Promise<Blob> {
    console.log('🔄 Generating thumbnail for:', file.name)

    const options = {
      maxSizeMB: 0.1, // 100KB max for thumbnail
      maxWidthOrHeight: 300,
      useWebWorker: !Capacitor.isNativePlatform()  // 📱 Disable on mobile
    }

    try {
      const thumbnail = await imageCompression(file, options)
      console.log('✅ Thumbnail generated:', thumbnail.size)
      return thumbnail
    } catch (error) {
      console.error('❌ Thumbnail generation failed:', error)
      throw new Error('Failed to generate thumbnail')
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  async uploadImage(
    file: File, 
    conversationId: string,
    onProgress?: (progress: UploadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<{ url: string; thumbnailUrl: string }> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('User not authenticated')

      // Check abort signal
      if (abortSignal?.aborted) throw new Error('Upload cancelled')

      // Simulate progress: 0-20% for compression
      onProgress?.({ loaded: 0, total: file.size, percentage: 5 })

      // Compress image
      const compressed = await this.compressImage(file)
      onProgress?.({ loaded: compressed.size * 0.2, total: file.size, percentage: 20 })

      // Check abort signal again after compression
      if (abortSignal?.aborted) throw new Error('Upload cancelled')

      // 20-30% for thumbnail generation
      onProgress?.({ loaded: compressed.size * 0.3, total: file.size, percentage: 25 })

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(compressed)
      onProgress?.({ loaded: compressed.size * 0.3, total: file.size, percentage: 30 })

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const basePath = `${user.id}/${conversationId}/${timestamp}-${sanitizedFileName}`
      
      // Simulate upload progress: 30-85% for main image upload
      const uploadStartTime = Date.now()
      const estimatedUploadTime = Math.max(1000, compressed.size / 200000) // ~200KB/s estimate
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - uploadStartTime
        const progress = Math.min(85, 30 + (elapsed / estimatedUploadTime) * 55)
        onProgress?.({ 
          loaded: Math.round(compressed.size * (progress / 100)), 
          total: file.size, 
          percentage: Math.round(progress) 
        })
      }, 100)

      try {
        // Upload original (compressed) image
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(basePath, compressed, {
            cacheControl: '3600',
            upsert: false,
          })

        clearInterval(progressInterval)

        if (uploadError) throw uploadError

        onProgress?.({ loaded: compressed.size * 0.85, total: file.size, percentage: 85 })

        // Check abort signal after main upload
        if (abortSignal?.aborted) {
          // Cleanup: Delete the uploaded file if cancelled
          await supabase.storage.from('message-attachments').remove([basePath])
          throw new Error('Upload cancelled')
        }

        // 85-95% for thumbnail upload
        onProgress?.({ loaded: compressed.size * 0.9, total: file.size, percentage: 90 })

      // Upload thumbnail
      const thumbnailPath = `${user.id}/${conversationId}/${timestamp}-thumb.jpg`
      const { error: thumbError } = await supabase.storage
        .from('message-attachments')
        .upload(thumbnailPath, thumbnail, {
          cacheControl: '3600',
          upsert: false
        })

      if (thumbError) console.warn('Thumbnail upload failed:', thumbError)

        // Final check
        if (abortSignal?.aborted) {
          // Cleanup both files
          await supabase.storage.from('message-attachments').remove([basePath, thumbnailPath])
          throw new Error('Upload cancelled')
        }

        if (thumbError) console.warn('Thumbnail upload failed:', thumbError)

        onProgress?.({ loaded: compressed.size, total: file.size, percentage: 100 })

        console.log('✅ Upload complete:', uploadData.path)

        return {
          url: uploadData.path,
          thumbnailUrl: thumbnailPath
        }
      } finally {
        clearInterval(progressInterval)
      }
    } catch (error) {
      console.error('❌ Upload failed:', error)
      throw error
    }
  }

  /**
   * Get signed URL for image (expires in 1 hour)
   */
  async getSignedUrl(path: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .createSignedUrl(path, 3600) // 1 hour expiry

      if (error) throw error
      return data.signedUrl
    } catch (error) {
      console.error('❌ Failed to get signed URL:', error)
      throw error
    }
  }

  /**
   * Delete uploaded image
   */
  async deleteImage(path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('message-attachments')
        .remove([path])

      if (error) throw error
      console.log('✅ Image deleted:', path)
    } catch (error) {
      console.error('❌ Failed to delete image:', error)
      throw error
    }
  }

  // ============================================================================
  // VIDEO UPLOAD METHODS
  // ============================================================================

  /**
   * Generate video thumbnail from first frame
   * Works on BOTH web and mobile (Canvas API via WebView)
   */
  async generateVideoThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true  // 📱 Important for iOS

      video.onloadedmetadata = () => {
        video.currentTime = 1 // Seek to 1 second for better thumbnail
      }

      video.onseeked = () => {
        try {
          // Set canvas size to video dimensions (max 300px)
          const scale = Math.min(300 / video.videoWidth, 300 / video.videoHeight)
          canvas.width = video.videoWidth * scale
          canvas.height = video.videoHeight * scale

          // Draw video frame to canvas
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                console.log('✅ Video thumbnail generated:', blob.size)
                resolve(blob)
              } else {
                reject(new Error('Failed to generate thumbnail'))
              }
            },
            'image/jpeg',
            0.8
          )
        } catch (error) {
          reject(error)
        } finally {
          // Cleanup
          URL.revokeObjectURL(video.src)
        }
      }

      video.onerror = () => {
        reject(new Error('Failed to load video'))
        URL.revokeObjectURL(video.src)
      }

      // Load video
      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * Get video duration in seconds
   */
  private async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true

      video.onloadedmetadata = () => {
        resolve(Math.round(video.duration))
        URL.revokeObjectURL(video.src)
      }

      video.onerror = () => {
        resolve(0)
        URL.revokeObjectURL(video.src)
      }

      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * Upload video to Supabase Storage
   */
  async uploadVideo(
    file: File,
    conversationId: string,
    onProgress?: (progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<{ url: string; thumbnailUrl: string; duration: number }> {
    try {
      // Validate file size
      if (file.size > this.MAX_VIDEO_SIZE) {
        throw new Error(`Video size must be less than ${this.MAX_VIDEO_SIZE / 1024 / 1024}MB`)
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('User not authenticated')

      // Check abort signal
      if (abortSignal?.aborted) throw new Error('Upload cancelled')

      console.log('🔄 Uploading video:', file.size, 'bytes')

      // Simulate progress: 0-10% for thumbnail generation
      onProgress?.(5)

      // Generate thumbnail
      const thumbnail = await this.generateVideoThumbnail(file)
      onProgress?.(10)

      // Check abort signal after thumbnail generation
      if (abortSignal?.aborted) throw new Error('Upload cancelled')

      // 10-15% for duration detection
      const duration = await this.getVideoDuration(file)
      onProgress?.(15)

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const basePath = `${user.id}/${conversationId}/${timestamp}-${sanitizedFileName}`

      // Simulate upload progress: 15-85% for main video upload
      const uploadStartTime = Date.now()
      const estimatedUploadTime = Math.max(2000, file.size / 100000) // ~100KB/s estimate
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - uploadStartTime
        const progress = Math.min(85, 15 + (elapsed / estimatedUploadTime) * 70)
        onProgress?.(Math.round(progress))
      }, 100)

      try {
        // Upload video
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(basePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        clearInterval(progressInterval)

        if (uploadError) throw uploadError

        onProgress?.(85)

        // Check abort signal after main upload
        if (abortSignal?.aborted) {
          // Cleanup: Delete the uploaded file if cancelled
          await supabase.storage.from('message-attachments').remove([basePath])
          throw new Error('Upload cancelled')
        }

        // 85-95% for thumbnail upload
        onProgress?.(90)

      // Upload thumbnail
      const thumbnailPath = `${user.id}/${conversationId}/${timestamp}-thumb.jpg`
      const { error: thumbError } = await supabase.storage
        .from('message-attachments')
        .upload(thumbnailPath, thumbnail, {
          cacheControl: '3600',
          upsert: false
        })

      if (thumbError) console.warn('Thumbnail upload failed:', thumbError)

        // Final check
        if (abortSignal?.aborted) {
          // Cleanup both files
          await supabase.storage.from('message-attachments').remove([basePath, thumbnailPath])
          throw new Error('Upload cancelled')
        }

        onProgress?.(100)

        console.log('✅ Video upload complete:', uploadData.path)

        return {
          url: uploadData.path,
          thumbnailUrl: thumbnailPath,
          duration
        }
      } finally {
        clearInterval(progressInterval)
      }
    } catch (error) {
      console.error('❌ Video upload failed:', error)
      throw error
    }
  }
}

export const mediaUploadService = new MediaUploadService()
