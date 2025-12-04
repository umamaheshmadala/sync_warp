/**
 * Offline Media Service
 * 
 * Handles offline media upload queue with platform-specific storage:
 * - Web: IndexedDB (stores File blobs)
 * - Mobile: Filesystem (Capacitor) + Preferences (metadata)
 * 
 * Features:
 * - Queue media for upload when offline
 * - Upload to Supabase Storage when online
 * - Progress tracking
 * - Video thumbnail generation
 * - Retry logic (max 3 attempts)
 * - 100MB file size limit
 * 
 * Industry Best Practice: WhatsApp pattern
 * - Upload media FIRST, then send message with permanent URL
 * - Prevents local file path invalidation issues
 */

import Dexie, { Table } from 'dexie'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { supabase } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import type { QueuedMediaUpload } from '../types/offline'

/**
 * IndexedDB for web media queue (stores File blobs)
 */
class OfflineMediaDB extends Dexie {
  media!: Table<QueuedMediaUpload, string>

  constructor() {
    super('SyncOfflineMedia')
    this.version(1).stores({
      media: 'id, messageId, conversationId, timestamp, status'
    })
  }
}

class OfflineMediaService {
  private db: OfflineMediaDB | null = null
  private readonly isMobile: boolean
  private readonly MEDIA_QUEUE_KEY = 'offline_media_queue'
  private readonly MAX_RETRIES = 3
  private readonly MAX_FILE_SIZE_MB = 100 // 100MB limit

  constructor() {
    this.isMobile = Capacitor.isNativePlatform()

    if (!this.isMobile) {
      this.db = new OfflineMediaDB()
      console.log('📦 Offline media queue initialized (IndexedDB)')
    } else {
      console.log('📦 Offline media queue initialized (Filesystem)')
    }
  }

  /**
   * Queue media for upload (Industry Best Practice: WhatsApp pattern)
   */
  async queueMediaUpload(
    file: File,
    messageId: string,
    conversationId: string
  ): Promise<string> {
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
      throw new Error(
        `File too large (${fileSizeMB.toFixed(1)}MB). Maximum: ${this.MAX_FILE_SIZE_MB}MB`
      )
    }

    const mediaId = uuidv4()
    const fileType = file.type.startsWith('image/') ? 'image' : 'video'

    // Read file data immediately (for Android compatibility)
    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type })
    const persistentFile = new File([blob], file.name, { type: file.type })

    const queuedMedia: QueuedMediaUpload = {
      id: mediaId,
      messageId,
      conversationId,
      file: persistentFile,
      fileName: file.name,
      fileType,
      mimeType: file.type,
      fileSize: file.size,
      uploadProgress: 0,
      status: 'pending',
      timestamp: Date.now(),
      retryCount: 0
    }

    if (this.isMobile) {
      // MOBILE: Save to filesystem
      await this.saveToFilesystem(queuedMedia)
    } else {
      // WEB: Save to IndexedDB
      await this.db!.media.add(queuedMedia)
    }

    console.log(
      `📤 Media queued: ${mediaId} (${fileType}, ${fileSizeMB.toFixed(2)}MB)`
    )
    return mediaId
  }

  /**
   * MOBILE ONLY: Save file to filesystem
   */
  private async saveToFilesystem(media: QueuedMediaUpload): Promise<void> {
    // Convert file to base64
    const reader = new FileReader()
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // Remove data:image/jpeg;base64, prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(media.file)
    })

    // Save file to filesystem
    const fileName = `${media.id}_${media.fileName}`
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    })

    // Save metadata to Preferences
    const queue = await this.getMobileQueue()
    queue.push({
      ...media,
      localPath: fileName,
      file: undefined as any // Don't store File object in JSON
    })

    await Preferences.set({
      key: this.MEDIA_QUEUE_KEY,
      value: JSON.stringify(queue)
    })
  }

  /**
   * MOBILE ONLY: Get media queue from Preferences
   */
  private async getMobileQueue(): Promise<QueuedMediaUpload[]> {
    const { value } = await Preferences.get({ key: this.MEDIA_QUEUE_KEY })
    return value ? JSON.parse(value) : []
  }

  /**
   * Get all pending media uploads
   */
  async getPendingMedia(): Promise<QueuedMediaUpload[]> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      return queue.filter(m => m.status === 'pending')
    } else {
      return await this.db!.media
        .where('status')
        .equals('pending')
        .sortBy('timestamp')
    }
  }

  /**
   * Upload all pending media (called before message sync)
   */
  async uploadPendingMedia(
    onProgress?: (mediaId: string, progress: number) => void
  ): Promise<{ success: number; failed: number }> {
    const pending = await this.getPendingMedia()
    let successCount = 0
    let failedCount = 0

    console.log(`🔄 Uploading ${pending.length} pending media files...`)

    for (const media of pending) {
      try {
        await this.updateStatus(media.id, 'uploading')

        // Upload to Supabase Storage
        const uploadedUrl = await this.uploadToStorage(media, (progress) => {
          this.updateProgress(media.id, progress)
          onProgress?.(media.id, progress)
        })

        // Generate thumbnail for videos
        let thumbnailUrl: string | undefined
        if (media.fileType === 'video') {
          thumbnailUrl = await this.generateVideoThumbnail(uploadedUrl)
        }

        // Update status
        await this.updateStatus(
          media.id,
          'uploaded',
          uploadedUrl,
          thumbnailUrl
        )
        successCount++

        console.log(`✅ Uploaded media: ${media.id}`)
      } catch (error) {
        console.error(`❌ Failed to upload media ${media.id}:`, error)

        const newRetryCount = media.retryCount + 1
        if (newRetryCount < this.MAX_RETRIES) {
          await this.updateStatus(media.id, 'pending')
          await this.incrementRetryCount(media.id)
          console.log(
            `🔄 Will retry media ${media.id} (attempt ${newRetryCount + 1}/${this.MAX_RETRIES})`
          )
        } else {
          await this.updateStatus(
            media.id,
            'failed',
            undefined,
            undefined,
            error instanceof Error ? error.message : 'Upload failed'
          )
          failedCount++
        }
      }
    }

    console.log(
      `✅ Media upload complete: ${successCount} success, ${failedCount} failed`
    )
    return { success: successCount, failed: failedCount }
  }

  /**
   * Upload file to Supabase Storage with progress
   */
  private async uploadToStorage(
    media: QueuedMediaUpload,
    onProgress: (progress: number) => void
  ): Promise<string> {
    const bucket =
      media.fileType === 'image' ? 'message-images' : 'message-videos'
    const fileName = `${media.conversationId}/${media.id}_${media.fileName}`

    let fileToUpload: File

    if (this.isMobile && media.localPath) {
      // MOBILE: Read from filesystem
      const fileData = await Filesystem.readFile({
        path: media.localPath,
        directory: Directory.Data
      })

      // Convert base64 to blob
      const base64Response = await fetch(
        `data:${media.mimeType};base64,${fileData.data}`
      )
      const blob = await base64Response.blob()
      fileToUpload = new File([blob], media.fileName, { type: media.mimeType })
    } else {
      // WEB: Use stored File object
      fileToUpload = media.file
    }

    // Upload with progress tracking
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const {
      data: { publicUrl }
    } = supabase.storage.from(bucket).getPublicUrl(fileName)

    // Delete local file on mobile
    if (this.isMobile && media.localPath) {
      await Filesystem.deleteFile({
        path: media.localPath,
        directory: Directory.Data
      }).catch((err) => console.warn('Failed to delete local file:', err))
    }

    return publicUrl
  }

  /**
   * Generate video thumbnail
   */
  private async generateVideoThumbnail(videoUrl: string): Promise<string> {
    // Create video element
    const video = document.createElement('video')
    video.src = videoUrl
    video.crossOrigin = 'anonymous'
    video.currentTime = 1 // Seek to 1 second

    return new Promise((resolve, reject) => {
      video.onloadeddata = () => {
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw frame
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0)

        // Convert to blob
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate thumbnail'))
              return
            }

            // Upload thumbnail
            const thumbnailFile = new File([blob], 'thumbnail.jpg', {
              type: 'image/jpeg'
            })
            const fileName = `thumbnails/${uuidv4()}_thumbnail.jpg`

            const { data, error } = await supabase.storage
              .from('message-videos')
              .upload(fileName, thumbnailFile)

            if (error) {
              reject(error)
              return
            }

            const {
              data: { publicUrl }
            } = supabase.storage.from('message-videos').getPublicUrl(fileName)

            resolve(publicUrl)
          },
          'image/jpeg',
          0.8
        )
      }

      video.onerror = reject
    })
  }

  /**
   * Update media status
   */
  private async updateStatus(
    id: string,
    status: QueuedMediaUpload['status'],
    uploadedUrl?: string,
    thumbnailUrl?: string,
    error?: string
  ): Promise<void> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      const index = queue.findIndex(m => m.id === id)

      if (index !== -1) {
        queue[index].status = status
        if (uploadedUrl) queue[index].uploadedUrl = uploadedUrl
        if (thumbnailUrl) queue[index].thumbnailUrl = thumbnailUrl
        if (error) queue[index].error = error

        await Preferences.set({
          key: this.MEDIA_QUEUE_KEY,
          value: JSON.stringify(queue)
        })
      }
    } else {
      await this.db!.media.update(id, {
        status,
        uploadedUrl,
        thumbnailUrl,
        error
      })
    }
  }

  /**
   * Update upload progress
   */
  private async updateProgress(id: string, progress: number): Promise<void> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      const index = queue.findIndex(m => m.id === id)

      if (index !== -1) {
        queue[index].uploadProgress = progress

        await Preferences.set({
          key: this.MEDIA_QUEUE_KEY,
          value: JSON.stringify(queue)
        })
      }
    } else {
      await this.db!.media.update(id, { uploadProgress: progress })
    }
  }

  /**
   * Increment retry count
   */
  private async incrementRetryCount(id: string): Promise<void> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      const index = queue.findIndex(m => m.id === id)

      if (index !== -1) {
        queue[index].retryCount++

        await Preferences.set({
          key: this.MEDIA_QUEUE_KEY,
          value: JSON.stringify(queue)
        })
      }
    } else {
      const media = await this.db!.media.get(id)
      if (media) {
        await this.db!.media.update(id, {
          retryCount: media.retryCount + 1
        })
      }
    }
  }

  /**
   * Get uploaded URL for a message
   */
  async getUploadedUrl(messageId: string): Promise<{
    url?: string
    thumbnailUrl?: string
  }> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      const media = queue.find(
        m => m.messageId === messageId && m.status === 'uploaded'
      )
      return {
        url: media?.uploadedUrl,
        thumbnailUrl: media?.thumbnailUrl
      }
    } else {
      const media = await this.db!.media
        .where('messageId')
        .equals(messageId)
        .and(m => m.status === 'uploaded')
        .first()

      return {
        url: media?.uploadedUrl,
        thumbnailUrl: media?.thumbnailUrl
      }
    }
  }

  /**
   * Clear uploaded media (cleanup after message sync)
   */
  async clearUploadedMedia(messageId: string): Promise<void> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      const filtered = queue.filter(m => m.messageId !== messageId)

      await Preferences.set({
        key: this.MEDIA_QUEUE_KEY,
        value: JSON.stringify(filtered)
      })
    } else {
      await this.db!.media.where('messageId').equals(messageId).delete()
    }
  }

  /**
   * Get pending media count
   */
  async getPendingCount(): Promise<number> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      return queue.filter(m => m.status === 'pending').length
    } else {
      return await this.db!.media.where('status').equals('pending').count()
    }
  }

  /**
   * Clear all media queue
   */
  async clearQueue(): Promise<void> {
    if (this.isMobile) {
      // Delete all local files
      const queue = await this.getMobileQueue()
      for (const media of queue) {
        if (media.localPath) {
          await Filesystem.deleteFile({
            path: media.localPath,
            directory: Directory.Data
          }).catch(() => {}) // Ignore errors
        }
      }

      await Preferences.remove({ key: this.MEDIA_QUEUE_KEY })
    } else {
      await this.db!.media.clear()
    }
  }
}

export const offlineMediaService = new OfflineMediaService()
