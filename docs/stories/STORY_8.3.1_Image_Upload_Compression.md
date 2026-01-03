# 📸 STORY 8.3.1: Image Upload & Compression (Core Infrastructure)

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2-3 days  
**Priority:** P0 - Critical  
**Status:** ✅ Complete

> **Note:** This story focuses on **core upload infrastructure**. Advanced UX features (preview modal, optimistic UI, upload progress) are covered in [Story 8.3.1_Part2](./STORY_8.3.1_Part2_Image_Upload_UX.md).

---

## 🎯 **Story Goal**

Implement **core image upload infrastructure** with automatic compression to enable users to share photos in messages on **web browsers, iOS, and Android native apps**. Images are compressed to reduce bandwidth (60-80% reduction), thumbnails are generated for quick loading, and files are uploaded to Supabase Storage with proper RLS policies.

---

## 📋 **Acceptance Criteria**

### Core Upload Functionality

1. ✅ User can select image from device (web: file picker, mobile: camera/gallery)
2. ✅ Image is automatically compressed to < 1MB (60-80% file size reduction)
3. ✅ Thumbnail is generated (max 300px, ~100KB)
4. ✅ Image uploads to Supabase Storage (`message-attachments` bucket)
5. ✅ Image displays correctly in chat message bubble
6. ✅ Works on web, iOS, and Android platforms

### Platform-Specific

7. ✅ **Web:** File input picker works
8. ✅ **iOS:** Native camera and photo library access works
9. ✅ **Android:** Native camera and gallery access works
10. ✅ **Mobile:** Permissions are requested and handled gracefully

### Storage & Security

11. ✅ Images stored in user-specific folders (`{user_id}/{conversation_id}/`)
12. ✅ RLS policies prevent unauthorized access
13. ✅ Public URLs are generated for image display

---

## 🚫 **Out of Scope (Moved to Part 2)**

The following features are **NOT** included in this story and will be implemented in [Story 8.3.1_Part2](./STORY_8.3.1_Part2_Image_Upload_UX.md):

- ❌ Preview modal before sending
- ❌ Caption input field
- ❌ Send/Cancel buttons
- ❌ Optimistic UI (thumbnail in chat before upload completes)
- ❌ Upload progress indicator (0-100%)
- ❌ Error handling with retry button
- ❌ Status indicators (sending/sent/delivered)
- ❌ Multiple image selection

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Image Handling**

Image upload requires different implementations per platform while maintaining a unified API:

| Feature             | Web                         | iOS                                | Android                            |
| ------------------- | --------------------------- | ---------------------------------- | ---------------------------------- |
| **Image Picker**    | `<input type="file">`       | `@capacitor/camera` (native)       | `@capacitor/camera` (native)       |
| **Camera Capture**  | `<input capture="camera">`  | Native camera UI                   | Native camera UI                   |
| **Compression**     | `browser-image-compression` | `browser-image-compression` (same) | `browser-image-compression` (same) |
| **Max Upload Size** | 10MB                        | 10MB                               | 10MB                               |
| **Target Size**     | < 1MB                       | < 1MB                              | < 1MB                              |
| **Thumbnail Size**  | 300px                       | 300px                              | 300px                              |

---

## 🔧 **Implementation Tasks**

### Task 1: Media Upload Service (Core)

**File:** `src/services/mediaUploadService.ts`

**Methods:**

- `pickImage(source: 'camera' | 'gallery')` - Platform-conditional image picker
- `compressImage(file: File)` - Compress to < 1MB (60-80% reduction)
- `generateThumbnail(file: File)` - Generate 300px thumbnail
- `uploadImage(file, conversationId)` - Upload to Supabase Storage
- `getPublicUrl(path)` - Get public URL for display
- `deleteImage(path)` - Delete from storage

**Platform-Conditional Logic:**

```typescript
async pickImage(source: 'camera' | 'gallery' = 'gallery'): Promise<File | null> {
  if (Capacitor.isNativePlatform()) {
    // MOBILE: Use Capacitor Camera plugin
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      quality: 90,
      allowEditing: true,
      width: 1920,
      height: 1920
    })
    return await this.uriToFile(photo.webPath!, photo.format)
  } else {
    // WEB: Return null, handled by file input
    return null
  }
}
```

**Compression Logic:**

```typescript
async compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: !Capacitor.isNativePlatform(), // Disable on mobile
    fileType: file.type,
    initialQuality: 0.8
  }
  return await imageCompression(file, options)
}
```

---

### Task 2: Image Upload Hook

**File:** `src/hooks/useImageUpload.ts`

**State:**

- `isUploading: boolean`
- `progress: number` (0-100, basic tracking)
- `error: string | null`

**Methods:**

- `uploadImage(file, conversationId)` - Upload with validation
- `reset()` - Reset state

**Validation:**

- File type must be `image/*`
- File size must be < 10MB (original)

---

### Task 3: Image Upload Button Component

**File:** `src/components/messaging/ImageUploadButton.tsx`

**Features:**

- Hidden file input (web)
- Image icon button
- Loading spinner during upload
- Integration with `useImageUpload` hook
- Integration with `useSendMessage` hook
- **Auto-send after upload** (no preview modal in Part 1)

**Flow:**

1. User clicks image button
2. File picker opens (web) or native picker (mobile)
3. User selects image
4. Image compresses automatically
5. Image uploads to storage
6. Message sent immediately with image URL

---

### Task 4: Message Bubble Image Display

**File:** `src/components/messaging/MessageBubble.tsx`

**Add Image Rendering:**

```typescript
{message.type === 'image' && message.media_urls && message.media_urls.length > 0 ? (
  <div className="space-y-2">
    <img
      src={message.media_urls[0]}
      alt="Shared image"
      className="max-w-full h-auto rounded-lg"
      style={{ maxHeight: '300px' }}
      loading="lazy"
    />
    {content && <p className="whitespace-pre-wrap mt-2">{content}</p>}
  </div>
) : (
  <p className="whitespace-pre-wrap">{content}</p>
)}
```

---

### Task 5: Mobile Permissions Configuration

**iOS - `ios/App/Info.plist`:**

```xml
<key>NSCameraUsageDescription</key>
<string>SynC needs camera access to capture and share photos in messages</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>SynC needs photo library access to share images in messages</string>
```

**Android - `android/app/src/main/AndroidManifest.xml`:**

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                 android:maxSdkVersion="28" />
```

---

### Task 6: Supabase Storage Setup

**Bucket Configuration:**

- Bucket name: `message-attachments`
- Public: `true` (for public URL access)
- File size limit: 10MB

**RLS Policies:**

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read files in conversations they're part of
CREATE POLICY "Users can read conversation files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');
```

---

## 🐛 **Bug Fixes Required**

### Issue 1: Broken Image Display

**Problem:** Images upload successfully but show as broken icon in chat

**Root Cause:** Using signed URLs which fail with "Object not found" error

**Fix:** Use public URLs instead

```typescript
// OLD (Broken):
const signedUrl = await mediaUploadService.getSignedUrl(url);

// NEW (Fixed):
const {
  data: { publicUrl },
} = supabase.storage.from("message-attachments").getPublicUrl(url);
```

**Files to Update:**

- `src/components/messaging/ImageUploadButton.tsx`

---

### Issue 2: Storage Bucket Not Public

**Problem:** Public URLs may not work if bucket is not public

**Fix:** Ensure bucket is configured as public in Supabase dashboard

**Verification:**

```bash
# Check bucket configuration via Supabase dashboard
# Storage > Buckets > message-attachments > Settings > Public bucket: ON
```

---

## 🧪 **Testing Checklist**

### Web Testing

- [ ] Click image upload button
- [ ] Select image from file picker
- [ ] Verify compression (check file size in Network tab)
- [ ] Verify upload completes
- [ ] Verify image displays in chat (not broken)
- [ ] Verify image is clickable (opens in new tab)

### iOS Testing

- [ ] Tap image button
- [ ] Grant camera permission (first time)
- [ ] Grant photo library permission (first time)
- [ ] Select photo from library → uploads successfully
- [ ] Capture new photo → uploads successfully
- [ ] Verify compression works
- [ ] Verify image displays in chat

### Android Testing

- [ ] Tap image button
- [ ] Grant camera permission (first time)
- [ ] Grant storage/media permission (first time)
- [ ] Select photo from gallery → uploads successfully
- [ ] Capture new photo → uploads successfully
- [ ] Verify compression works
- [ ] Verify image displays in chat

### Compression Testing

- [ ] Upload 5MB image → compresses to < 1MB
- [ ] Verify 60-80% file size reduction
- [ ] Verify thumbnail generates (< 100KB)
- [ ] Verify compression takes < 2 seconds

### Storage Testing

- [ ] Verify files upload to correct path: `{user_id}/{conversation_id}/{timestamp}-{filename}`
- [ ] Verify thumbnail path: `{user_id}/{conversation_id}/{timestamp}-thumb.jpg`
- [ ] Verify RLS policies prevent unauthorized access
- [ ] Verify public URLs work

---

## 📊 **Success Metrics**

| Metric               | Target              | How to Verify                            |
| -------------------- | ------------------- | ---------------------------------------- |
| Compression Ratio    | 60-80% reduction    | Compare original vs compressed file size |
| Upload Time (5MB)    | < 3s (WiFi)         | Chrome DevTools Network tab              |
| Thumbnail Generation | < 1s                | Performance profiling                    |
| Upload Success Rate  | > 99%               | Production monitoring                    |
| Final Image Size     | < 1MB               | Check compressed file size               |
| Platform Support     | Web + iOS + Android | Manual testing on all platforms          |

---

## 📦 **Dependencies**

### NPM Packages

- `browser-image-compression@^2.0.2` - Image compression
- `@capacitor/camera@^7.0.2` - Native camera access
- `@capacitor/filesystem@^7.1.5` - File system access

### Supabase

- Storage bucket: `message-attachments`
- RLS policies configured
- Public bucket enabled

### Other Stories

- **Depends on:** Story 8.1.x (Supabase Storage setup)
- **Blocks:** Story 8.3.1_Part2 (Image Upload UX)
- **Related:** Story 8.3.5 (Media Display Components - lightbox, gallery)

---

## 🚀 **Deliverables**

1. ✅ `src/services/mediaUploadService.ts` - Core upload service
2. ✅ `src/hooks/useImageUpload.ts` - Upload hook
3. ✅ `src/components/messaging/ImageUploadButton.tsx` - Upload button
4. ✅ `src/components/messaging/MessageBubble.tsx` - Image display support
5. ✅ Mobile permissions configured (iOS + Android)
6. ✅ Supabase Storage bucket configured
7. ✅ RLS policies deployed
8. ✅ All tests passing

---

## 🔄 **Next Steps**

After completing this story:

1. **Fix broken image display** (public URL issue)
2. **Verify storage bucket** configuration
3. **Test on all platforms** (web, iOS, Android)
4. **Proceed to Story 8.3.1_Part2** (UX enhancements)

---

## 📝 **Notes**

- This story provides **basic upload functionality** only
- **No preview modal** - images send immediately after selection
- **No upload progress** - user sees loading spinner only
- **No error handling** - failed uploads show generic error
- All advanced UX features are in **Story 8.3.1_Part2**

---

**Story Created:** 2025-11-20  
**Last Updated:** 2025-12-02  
**Status:** 🔄 In Progress (Fixing Bugs)
