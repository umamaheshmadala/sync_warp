# 📸 STORY 8.3.1: Image Upload & Compression

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **image upload with compression** to enable users to share photos in messages. Images are automatically compressed to reduce bandwidth, thumbnails are generated for quick loading, and files are uploaded to Supabase Storage with proper RLS policies.

---

## 📖 **User Stories**

### As a user, I want to:
1. Select and upload images from my device
2. See a preview of the image before sending
3. Have images automatically compressed to save bandwidth
4. See upload progress while image is being sent
5. Have the image appear in the conversation once uploaded

### Acceptance Criteria:
- ✅ Images compressed to < 1MB (60-80% file size reduction)
- ✅ Thumbnails generated (max 300px) for previews
- ✅ Upload completes in < 3s for 5MB image
- ✅ Upload success rate > 99%
- ✅ Progress indicator shows during upload
- ✅ Supports common formats: JPG, PNG, WEBP, GIF

---

## 🧩 **Implementation Tasks**

### **Phase 1: Install Dependencies & Setup** (0.5 days)

#### Task 1.1: Install Image Compression Library
```bash
npm install browser-image-compression
npm install --save-dev @types/browser-image-compression
```

#### Task 1.2: Verify Storage Bucket Setup
```bash
# Check message-attachments bucket exists (from Epic 8.1)
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE id = 'message-attachments';"

# Verify RLS policies on storage
warp mcp run supabase "execute_sql SELECT * FROM storage.objects WHERE bucket_id = 'message-attachments' LIMIT 5;"
```

---

### **Phase 2: Image Compression Service** (0.5 days)

#### Task 2.1: Create Media Upload Service
```typescript
// src/services/mediaUploadService.ts
import { supabase } from '../lib/supabase'
import imageCompression from 'browser-image-compression'

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

class MediaUploadService {
  private uploadCallbacks: Map<string, (progress: UploadProgress) => void> = new Map()

  /**
   * Compress image before upload
   * Target: 60-80% file size reduction
   */
  async compressImage(file: File): Promise<File> {
    console.log('🔄 Compressing image:', file.name, 'Original size:', file.size)

    const options = {
      maxSizeMB: 1, // Target 1MB max
      maxWidthOrHeight: 1920, // Max dimension
      useWebWorker: true, // Use web worker for better performance
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
   */
  async generateThumbnail(file: File): Promise<Blob> {
    console.log('🔄 Generating thumbnail for:', file.name)

    const options = {
      maxSizeMB: 0.1, // 100KB max for thumbnail
      maxWidthOrHeight: 300,
      useWebWorker: true
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
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; thumbnailUrl: string }> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('User not authenticated')

      // Compress image
      const compressed = await this.compressImage(file)

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(compressed)

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const basePath = `${user.id}/${conversationId}/${timestamp}-${sanitizedFileName}`
      
      // Upload original (compressed) image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(basePath, compressed, {
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
```

**🛢 Supabase MCP Testing:**
```bash
# Test storage bucket access
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE id = 'message-attachments';"

# Check uploaded files
warp mcp run supabase "execute_sql SELECT name, size, created_at FROM storage.objects WHERE bucket_id = 'message-attachments' ORDER BY created_at DESC LIMIT 10;"

# Verify RLS policies allow user uploads
warp mcp run supabase "execute_sql SELECT * FROM storage.objects WHERE owner = auth.uid() AND bucket_id = 'message-attachments';"
```

**🧠 Context7 MCP Analysis:**
```bash
# Analyze compression performance
warp mcp run context7 "analyze mediaUploadService compression logic and suggest optimizations for file size reduction"

# Check for security issues
warp mcp run context7 "review mediaUploadService upload method for security vulnerabilities with file handling"
```

---

### **Phase 3: Upload Progress UI** (0.5 days)

#### Task 3.1: Create Upload Progress Hook
```typescript
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
```

---

### **Phase 4: Image Upload Button Component** (0.5 days)

#### Task 4.1: Create ImageUploadButton Component
```typescript
// src/components/messaging/ImageUploadButton.tsx
import React, { useRef } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { useImageUpload } from '../../hooks/useImageUpload'
import { useSendMessage } from '../../hooks/useSendMessage'

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
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="absolute bottom-full mb-2 left-0 bg-white shadow-lg rounded-lg p-3 min-w-[200px]">
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
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test image compression reduces file size by 60-80%
- [ ] Test thumbnail generation creates max 300px image
- [ ] Test upload with valid image succeeds
- [ ] Test upload with invalid file type fails
- [ ] Test upload with oversized file fails
- [ ] Test signed URL generation works
- [ ] Test file deletion works

### Integration Tests with Supabase MCP
```bash
# Test upload flow end-to-end
warp mcp run supabase "execute_sql 
  -- Check if file was uploaded
  SELECT * FROM storage.objects 
  WHERE bucket_id = 'message-attachments' 
  AND name LIKE '%test%' 
  ORDER BY created_at DESC LIMIT 1;
"

# Verify RLS policies work
warp mcp run supabase "execute_sql
  -- Try to access file as authenticated user
  SELECT * FROM storage.objects 
  WHERE bucket_id = 'message-attachments' 
  AND owner = auth.uid();
"
```

### Performance Tests with Chrome DevTools MCP
```bash
# Monitor upload performance
warp mcp run chrome-devtools "open DevTools Network tab, upload 5MB image, measure upload time"

# Check compression performance
warp mcp run chrome-devtools "open Performance tab, profile image compression, verify < 2s processing time"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Compression Ratio** | 60-80% reduction | Manual testing with various images |
| **Upload Time** | < 3s for 5MB | Chrome DevTools Network tab |
| **Upload Success Rate** | > 99% | Production monitoring |
| **Thumbnail Generation** | < 1s | Chrome DevTools Performance |
| **Final Image Size** | < 1MB | Verify compressed file size |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Epic 8.1: `message-attachments` storage bucket must exist
- ✅ Epic 8.1: RLS policies on storage must be configured
- ✅ Epic 8.2: `useSendMessage` hook must be available
- ✅ Message type 'image' must be supported in database schema

### Verify Dependencies:
```bash
# Check storage bucket
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE id = 'message-attachments';"

# Check message schema supports images
warp mcp run supabase "execute_sql SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'media_urls';"
```

---

## 📦 **Deliverables**

1. ✅ `src/services/mediaUploadService.ts` - Upload service
2. ✅ `src/hooks/useImageUpload.ts` - Upload hook
3. ✅ `src/components/messaging/ImageUploadButton.tsx` - Upload button
4. ✅ Unit tests for compression and upload
5. ✅ Supabase MCP test commands documented
6. ✅ Performance benchmarks with Chrome DevTools

---

## 🔄 **Next Story**

➡️ [STORY 8.3.2: Video Upload & Handling](./STORY_8.3.2_Video_Upload_Handling.md)

---

## 📝 **MCP Command Quick Reference**

### Supabase MCP
```bash
# Check storage bucket
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE id = 'message-attachments';"

# List uploaded files
warp mcp run supabase "execute_sql SELECT * FROM storage.objects WHERE bucket_id = 'message-attachments' ORDER BY created_at DESC LIMIT 10;"

# Check file sizes
warp mcp run supabase "execute_sql SELECT name, size, created_at FROM storage.objects WHERE bucket_id = 'message-attachments';"
```

### Context7 MCP
```bash
# Analyze compression logic
warp mcp run context7 "analyze mediaUploadService compression and suggest optimizations"

# Security review
warp mcp run context7 "review file upload security in mediaUploadService"
```

### Chrome DevTools MCP
```bash
# Monitor upload performance
warp mcp run chrome-devtools "profile image upload and measure compression time"

# Check network timing
warp mcp run chrome-devtools "monitor Network tab during image upload"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 2 days  
**Risk Level:** Low (well-established libraries and patterns)
