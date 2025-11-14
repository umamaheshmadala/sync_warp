# 📸 STORY 8.3.1: Image Upload & Compression

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **image upload with compression** to enable users to share photos in messages **on web browsers, iOS, and Android native apps**. Images are automatically compressed to reduce bandwidth, thumbnails are generated for quick loading, and files are uploaded to Supabase Storage with proper RLS policies.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Image Handling**

Image upload requires different implementations per platform while maintaining a unified API:

| Feature | Web | iOS | Android |
|---------|-----|-----|----------|
| **Image Picker** | `<input type="file">` | `@capacitor/camera` (native) | `@capacitor/camera` (native) |
| **Camera Capture** | `<input capture="camera">` | Native camera UI | Native camera UI |
| **Compression** | `browser-image-compression` | `browser-image-compression` (same) | `browser-image-compression` (same) |
| **Max Upload Size** | 10MB | 10MB | 10MB |
| **Target Size** | < 1MB | < 1MB | < 1MB |
| **Thumbnail Size** | 300px | 300px | 300px |

#### **1. Mobile Camera Access (iOS/Android)**

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

class MediaUploadService {
  async pickImage(source: 'camera' | 'gallery' = 'gallery'): Promise<File | null> {
    if (Capacitor.isNativePlatform()) {
      // MOBILE: Use native camera/photo library
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
      } catch (error) {
        if (error.message.includes('permission')) {
          // Show permission prompt
          alert('Camera permission required. Please enable in Settings.')
        }
        return null
      }
    } else {
      // WEB: File input handled by component
      return null
    }
  }
}
```

#### **2. Permission Handling (iOS/Android)**

**iOS - Info.plist:**
```xml
<key>NSCameraUsageDescription</key>
<string>SynC needs camera access to capture and share photos</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>SynC needs photo library access to share images</string>
```

**Android - AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

#### **3. Compression Performance Optimization**

```typescript
async compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    // 📱 CRITICAL: Disable web worker on mobile (WebView limitation)
    useWebWorker: !Capacitor.isNativePlatform(),
    fileType: file.type,
    initialQuality: 0.8
  }
  
  return await imageCompression(file, options)
}
```

### **Required Capacitor Plugins**

```json
{
  "dependencies": {
    "@capacitor/camera": "^5.0.0",       // Camera + photo library
    "@capacitor/filesystem": "^5.0.0"    // File system access
  }
}
```

### **Platform-Specific Testing Checklist**

#### **Web Testing**
- [ ] File picker opens correctly
- [ ] Drag-and-drop works
- [ ] Compression reduces size by 60-80%
- [ ] Upload progress shows correctly
- [ ] Multiple file formats supported (JPG, PNG, WEBP, GIF)

#### **iOS Testing**
- [ ] Camera permission prompt shows on first use
- [ ] Photo library permission prompt shows
- [ ] Native camera opens correctly
- [ ] Native photo picker opens correctly
- [ ] Image editing screen works (crop, rotate)
- [ ] Compression works without web worker
- [ ] Upload completes successfully
- [ ] HEIC images convert to JPEG correctly
- [ ] Works on iPhone (notch) and iPad (safe areas)

#### **Android Testing**
- [ ] Camera permission prompt shows on first use
- [ ] Storage/media permission prompt shows (Android 13+)
- [ ] Native camera opens correctly
- [ ] Native photo picker opens correctly
- [ ] Compression works without web worker
- [ ] Upload completes successfully
- [ ] Works on various Android versions (11, 12, 13, 14)
- [ ] Works on various screen sizes

### **Performance Targets**

| Metric | Web | iOS (WiFi) | iOS (4G) | Android (WiFi) | Android (4G) |
|--------|-----|-----------|----------|---------------|-------------|
| **Compression Time** | < 2s | < 3s | < 3s | < 3s | < 3s |
| **Upload Time (5MB)** | < 3s | < 5s | < 8s | < 5s | < 8s |
| **Thumbnail Generation** | < 1s | < 1.5s | < 1.5s | < 1.5s | < 1.5s |
| **Camera Launch Time** | N/A | < 500ms | < 500ms | < 500ms | < 500ms |
| **File Size Reduction** | 60-80% | 60-80% | 60-80% | 60-80% | 60-80% |

---

## 📖 **User Stories**

### As a user, I want to:
1. **Web**: Select images from file picker OR drag-and-drop
2. **iOS/Android**: Capture photo with camera OR select from photo library
3. See a preview of the image before sending
4. Have images automatically compressed to save bandwidth
5. See upload progress while image is being sent
6. Have the image appear in the conversation once uploaded

### Acceptance Criteria:
- ✅ **Web**: File picker works for JPG, PNG, WEBP, GIF
- ✅ **iOS**: Camera + photo library access with permissions
- ✅ **Android**: Camera + photo library access with permissions
- ✅ Images compressed to < 1MB (60-80% file size reduction) on **all platforms**
- ✅ Thumbnails generated (max 300px) for previews on **all platforms**
- ✅ Upload completes in < 3s for 5MB image on **all platforms**
- ✅ Upload success rate > 99% on **all platforms**
- ✅ Progress indicator shows during upload
- ✅ Supports common formats: JPG, PNG, WEBP, GIF (web + mobile)

---

## 🧩 **Implementation Tasks**

### **Phase 1: Install Dependencies & Setup** (0.5 days)

#### Task 1.1: Install Image Compression Library & Capacitor Plugins
```bash
# Image compression (works on web + mobile)
npm install browser-image-compression
npm install --save-dev @types/browser-image-compression

# 📱 Capacitor plugins for mobile
npm install @capacitor/camera @capacitor/filesystem

# Sync native projects
npx cap sync
```

#### Task 1.2: Configure Mobile Permissions

**iOS (ios/App/Info.plist):**
```xml
<key>NSCameraUsageDescription</key>
<string>SynC needs camera access to capture and share photos in messages</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>SynC needs photo library access to share images in messages</string>
```

**Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
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
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'  // 📱 Mobile
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
      } catch (error) {
        console.error('❌ Camera access failed:', error)
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

### Unit Tests (All Platforms)
- [ ] Test image compression reduces file size by 60-80%
- [ ] Test thumbnail generation creates max 300px image
- [ ] Test upload with valid image succeeds
- [ ] Test upload with invalid file type fails
- [ ] Test upload with oversized file fails
- [ ] Test signed URL generation works
- [ ] Test file deletion works
- [ ] 📱 Test `pickImage()` returns null on web (file input used instead)
- [ ] 📱 Test `uriToFile()` converts Capacitor URI to File correctly

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
# Monitor upload performance (Web)
warp mcp run chrome-devtools "open DevTools Network tab, upload 5MB image, measure upload time"

# Check compression performance (Web)
warp mcp run chrome-devtools "open Performance tab, profile image compression, verify < 2s processing time"
```

### 📱 Mobile Testing (iOS/Android)

**Manual Testing Required:**

#### iOS Testing (Xcode Simulator + Physical Device)
1. **Permissions Test:**
   - [ ] App requests camera permission on first use
   - [ ] App requests photo library permission on first use
   - [ ] Permission prompts show correct usage descriptions
   
2. **Camera Capture Test:**
   - [ ] Tap image button → Opens native camera
   - [ ] Capture photo → Shows preview/edit screen
   - [ ] Accept photo → Uploads successfully
   - [ ] Image appears in conversation
   
3. **Photo Library Test:**
   - [ ] Long-press image button → Shows camera/gallery options
   - [ ] Select "Photo Library" → Opens native photo picker
   - [ ] Select photo → Uploads successfully
   - [ ] Image appears in conversation
   
4. **Compression Test:**
   - [ ] Upload 10MB photo → Compressed to < 1MB
   - [ ] Verify upload time < 3s on WiFi
   - [ ] Verify upload time < 5s on cellular

#### Android Testing (Emulator + Physical Device)
1. **Permissions Test:**
   - [ ] App requests camera permission on first use
   - [ ] App requests storage/media permission on first use (Android 13+)
   - [ ] Permission rationale shown before request
   
2. **Camera Capture Test:**
   - [ ] Tap image button → Opens native camera
   - [ ] Capture photo → Shows preview
   - [ ] Accept photo → Uploads successfully
   - [ ] Image appears in conversation
   
3. **Photo Library Test:**
   - [ ] Long-press image button → Shows bottom sheet with options
   - [ ] Select "Gallery" → Opens native photo picker
   - [ ] Select photo → Uploads successfully
   - [ ] Image appears in conversation
   
4. **Compression Test:**
   - [ ] Upload 10MB photo → Compressed to < 1MB
   - [ ] Verify upload time < 3s on WiFi
   - [ ] Verify upload time < 5s on cellular

#### Cross-Platform Edge Cases
- [ ] 📱 **Network switching**: Upload starts on WiFi, switches to cellular → Upload completes
- [ ] 📱 **App backgrounding**: Upload in progress, user switches apps → Upload continues/completes
- [ ] 📱 **Low storage**: Device storage < 100MB → Shows error before upload
- [ ] 📱 **Camera unavailable**: Simulator without camera → Falls back to photo library
- [ ] 📱 **Permission denied**: User denies camera → Shows settings prompt

**Testing Commands:**
```bash
# Build and run on iOS simulator
npx cap run ios

# Build and run on Android emulator
npx cap run android

# Open native IDEs for debugging
npx cap open ios
npx cap open android
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Compression Ratio (Web)** | 60-80% reduction | Chrome DevTools |
| **Compression Ratio (iOS)** | 60-80% reduction | Xcode Instruments |
| **Compression Ratio (Android)** | 60-80% reduction | Android Studio Profiler |
| **Upload Time (Web, WiFi)** | < 3s for 5MB | Chrome DevTools Network tab |
| **Upload Time (Mobile, WiFi)** | < 3s for 5MB | Manual testing |
| **Upload Time (Mobile, Cellular)** | < 5s for 5MB | Manual testing on device |
| **Upload Success Rate** | > 99% (all platforms) | Production monitoring |
| **Thumbnail Generation** | < 1s (all platforms) | Performance profiling |
| **Final Image Size** | < 1MB (all platforms) | Verify compressed file size |
| **Camera Permission Grant** | 100% if granted | iOS/Android analytics |
| **Native Picker Launch** | < 500ms (iOS/Android) | Manual testing |

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
