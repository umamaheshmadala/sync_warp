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
        return await this.uriToFile(photo.webPath!, photo.format)
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
  private async uriToFile(uri: string, format: string): Promise<File> {
    const response = await fetch(uri)
    const blob = await response.blob()
    const fileName = `capture-${Date.now()}.${format}`
    return new File([blob], fileName, { type: `image/${format}` })
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

      // Compress image
      const compressed = await this.compressImage(file)

      // Check abort signal again after compression
      if (abortSignal?.aborted) throw new Error('Upload cancelled')

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(compressed)

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const basePath = `${user.id}/${conversationId}/${timestamp}-${sanitizedFileName}`
      
      // Upload original (compressed) image
      // Note: Supabase JS v2 doesn't natively support abort signal in upload() yet in all versions,
      // but we can check before starting. If the library updates, we can pass it.
      // For now, we rely on checking signal between steps and handling cleanup if needed.
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(basePath, compressed, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Check abort signal after main upload
      if (abortSignal?.aborted) {
        // Cleanup: Delete the uploaded file if cancelled
        await supabase.storage.from('message-attachments').remove([basePath])
        throw new Error('Upload cancelled')
      }

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

      console.log('✅ Upload complete:', uploadData.path)

      return {
        url: uploadData.path,
        thumbnailUrl: thumbnailPath
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
}

export const mediaUploadService = new MediaUploadService()
