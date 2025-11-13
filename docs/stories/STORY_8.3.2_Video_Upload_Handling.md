# 🎥 STORY 8.3.2: Video Upload & Handling

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **video upload** to enable users to share short video clips in messages. Videos are uploaded to Supabase Storage with progress tracking, size validation (max 25MB), and automatic thumbnail extraction for previews.

---

## 📖 **User Stories**

### As a user, I want to:
1. Select and upload video files from my device
2. See upload progress while video is being sent
3. Be notified if video exceeds size limit (25MB)
4. Have a thumbnail preview generated for the video
5. See the video player in the conversation

### Acceptance Criteria:
- ✅ Supports MP4, MOV, WebM formats
- ✅ Max file size: 25MB
- ✅ Upload progress shows percentage
- ✅ Video upload completes in < 10s for 25MB file
- ✅ Thumbnail generated from first frame
- ✅ Upload cancellation supported

---

## 🧩 **Implementation Tasks**

### **Phase 1: Video Upload Service** (0.5 days)

#### Task 1.1: Extend mediaUploadService for Videos
```typescript
// src/services/mediaUploadService.ts (extend existing service)

class MediaUploadService {
  private readonly MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25MB

  /**
   * Generate video thumbnail from first frame
   */
  async generateVideoThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true

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
   * Upload video to Supabase Storage
   */
  async uploadVideo(
    file: File,
    conversationId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; thumbnailUrl: string; duration: number }> {
    try {
      // Validate file size
      if (file.size > this.MAX_VIDEO_SIZE) {
        throw new Error(`Video size must be less than ${this.MAX_VIDEO_SIZE / 1024 / 1024}MB`)
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('User not authenticated')

      // Generate thumbnail
      const thumbnail = await this.generateVideoThumbnail(file)

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const basePath = `${user.id}/${conversationId}/${timestamp}-${sanitizedFileName}`

      // Upload video
      console.log('🔄 Uploading video:', file.size, 'bytes')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(basePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Upload thumbnail
      const thumbnailPath = `${user.id}/${conversationId}/${timestamp}-thumb.jpg`
      const { error: thumbError } = await supabase.storage
        .from('message-attachments')
        .upload(thumbnailPath, thumbnail, {
          cacheControl: '3600',
          upsert: false
        })

      if (thumbError) console.warn('Thumbnail upload failed:', thumbError)

      // Get video duration
      const duration = await this.getVideoDuration(file)

      console.log('✅ Video upload complete:', uploadData.path)

      return {
        url: uploadData.path,
        thumbnailUrl: thumbnailPath,
        duration
      }
    } catch (error) {
      console.error('❌ Video upload failed:', error)
      throw error
    }
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
}

export const mediaUploadService = new MediaUploadService()
```

**🛢 Supabase MCP Testing:**
```bash
# Check video uploads
warp mcp run supabase "execute_sql SELECT name, size, created_at FROM storage.objects WHERE bucket_id = 'message-attachments' AND name LIKE '%.mp4' ORDER BY created_at DESC LIMIT 10;"

# Verify storage bucket has sufficient space
warp mcp run supabase "execute_sql SELECT SUM(size) as total_size FROM storage.objects WHERE bucket_id = 'message-attachments';"

# Check video file metadata
warp mcp run supabase "execute_sql SELECT name, size, metadata FROM storage.objects WHERE bucket_id = 'message-attachments' AND name LIKE '%.mp4';"
```

**🧠 Context7 MCP Analysis:**
```bash
# Analyze video upload performance
warp mcp run context7 "review uploadVideo method for optimization opportunities with large files"

# Check thumbnail generation logic
warp mcp run context7 "analyze generateVideoThumbnail for edge cases and error handling"
```

---

### **Phase 2: Video Upload Hook** (0.25 days)

#### Task 2.1: Create useVideoUpload Hook
```typescript
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

  const uploadVideo = useCallback(async (file: File, conversationId: string) => {
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
          setUploadState(prev => ({ ...prev, progress: progress.percentage }))
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
```

---

### **Phase 3: Video Upload Button Component** (0.25 days)

#### Task 3.1: Create VideoUploadButton
```typescript
// src/components/messaging/VideoUploadButton.tsx
import React, { useRef } from 'react'
import { Video, Loader2 } from 'lucide-react'
import { useVideoUpload } from '../../hooks/useVideoUpload'
import { useSendMessage } from '../../hooks/useSendMessage'
import { mediaUploadService } from '../../services/mediaUploadService'

interface Props {
  conversationId: string
  onUploadStart?: () => void
  onUploadComplete?: () => void
}

export function VideoUploadButton({ 
  conversationId, 
  onUploadStart, 
  onUploadComplete 
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadVideo, isUploading, progress } = useVideoUpload()
  const { sendMessage } = useSendMessage()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      onUploadStart?.()

      // Upload video
      const { url, thumbnailUrl, duration } = await uploadVideo(file, conversationId)

      // Get signed URLs
      const signedUrl = await mediaUploadService.getSignedUrl(url)
      const signedThumbUrl = await mediaUploadService.getSignedUrl(thumbnailUrl)

      // Send message with video
      await sendMessage({
        conversationId,
        content: '',
        type: 'video',
        mediaUrls: [signedUrl],
        thumbnailUrl: signedThumbUrl,
        metadata: { duration }
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
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Upload video"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <Video className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading && (
        <div className="absolute bottom-full mb-2 left-0 bg-white shadow-lg rounded-lg p-3 min-w-[200px]">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Uploading video...
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
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test video file validation (type and size)
- [ ] Test thumbnail generation from video first frame
- [ ] Test video upload with valid file succeeds
- [ ] Test upload with oversized file fails (> 25MB)
- [ ] Test upload with invalid file type fails
- [ ] Test video duration extraction
- [ ] Test upload cancellation

### Integration Tests with Supabase MCP
```bash
# Test video upload end-to-end
warp mcp run supabase "execute_sql 
  SELECT name, size, created_at 
  FROM storage.objects 
  WHERE bucket_id = 'message-attachments' 
  AND name LIKE '%.mp4' 
  ORDER BY created_at DESC LIMIT 1;
"

# Check thumbnail was created
warp mcp run supabase "execute_sql 
  SELECT name 
  FROM storage.objects 
  WHERE bucket_id = 'message-attachments' 
  AND name LIKE '%thumb%' 
  ORDER BY created_at DESC LIMIT 1;
"

# Verify RLS policies work for videos
warp mcp run supabase "execute_sql
  SELECT * FROM storage.objects 
  WHERE bucket_id = 'message-attachments' 
  AND owner = auth.uid()
  AND name LIKE '%.mp4';
"
```

### Performance Tests with Chrome DevTools MCP
```bash
# Monitor video upload performance
warp mcp run chrome-devtools "open Network tab, upload 25MB video, measure upload time"

# Check thumbnail generation performance
warp mcp run chrome-devtools "profile video thumbnail generation, verify < 2s"

# Monitor memory usage during upload
warp mcp run chrome-devtools "open Memory tab, upload large video, check for memory leaks"
```

### E2E Tests with Puppeteer MCP
```bash
# Test complete video upload flow
warp mcp run puppeteer "navigate to chat, click video upload, select test.mp4, verify upload completes"

# Test size validation
warp mcp run puppeteer "try to upload oversized video, verify error message appears"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Upload Time** | < 10s for 25MB | Chrome DevTools Network tab |
| **Thumbnail Generation** | < 2s | Chrome DevTools Performance |
| **Upload Success Rate** | > 99% | Production monitoring |
| **Supported Formats** | MP4, MOV, WebM | Manual testing |
| **Max File Size** | 25MB | Validation logic |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Story 8.3.1: `mediaUploadService` must exist
- ✅ Story 8.3.1: `useImageUpload` pattern established
- ✅ Epic 8.1: `message-attachments` storage bucket configured
- ✅ Epic 8.2: `useSendMessage` hook available
- ✅ Message type 'video' must be supported in database schema

### Verify Dependencies:
```bash
# Check storage bucket
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE id = 'message-attachments';"

# Check message schema supports videos
warp mcp run supabase "execute_sql SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'metadata';"
```

---

## 📦 **Deliverables**

1. ✅ `uploadVideo` method in `mediaUploadService.ts`
2. ✅ `generateVideoThumbnail` method in `mediaUploadService.ts`
3. ✅ `src/hooks/useVideoUpload.ts` - Video upload hook
4. ✅ `src/components/messaging/VideoUploadButton.tsx` - Upload button
5. ✅ Unit tests for video upload and thumbnail generation
6. ✅ Supabase MCP test commands documented
7. ✅ Performance benchmarks with Chrome DevTools

---

## 🔄 **Next Story**

➡️ [STORY 8.3.3: Link Preview Generation](./STORY_8.3.3_Link_Preview_Generation.md)

---

## 📝 **MCP Command Quick Reference**

### Supabase MCP
```bash
# List video uploads
warp mcp run supabase "execute_sql SELECT * FROM storage.objects WHERE bucket_id = 'message-attachments' AND name LIKE '%.mp4' ORDER BY created_at DESC LIMIT 10;"

# Check storage usage
warp mcp run supabase "execute_sql SELECT SUM(size) / 1024 / 1024 as size_mb FROM storage.objects WHERE bucket_id = 'message-attachments';"

# List thumbnails
warp mcp run supabase "execute_sql SELECT * FROM storage.objects WHERE name LIKE '%thumb%' ORDER BY created_at DESC LIMIT 10;"
```

### Context7 MCP
```bash
# Analyze upload performance
warp mcp run context7 "review uploadVideo method for performance bottlenecks"

# Security review
warp mcp run context7 "check video upload for security issues"
```

### Chrome DevTools MCP
```bash
# Monitor upload
warp mcp run chrome-devtools "profile video upload and measure timing"

# Check memory usage
warp mcp run chrome-devtools "monitor memory during video processing"
```

### Puppeteer MCP
```bash
# E2E test
warp mcp run puppeteer "test video upload flow from selection to message send"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 1 day  
**Risk Level:** Medium (large file handling, thumbnail generation)
