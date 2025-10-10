# Story 4B.7: Media Management Rules Enforcement

**Epic:** 4B - Missing Business Owner Features  
**Priority:** 🟡 P2 - MEDIUM (Quality & Compliance)  
**Effort:** 3 days  
**Status:** 📝 PLANNED  
**Owner:** TBD

---

## 📋 Overview

**Problem:** Enhanced Project Brief specifies strict media upload rules:
- Max 4 images per product/coupon/ad
- Max 1 video (60 seconds maximum) per display item
- Upload state tracking (uploading → processing → transcoding → ready/failed)
- File size limits (images: 5MB, videos: 50MB)
- Format validation (JPG, PNG, WebP for images; MP4 for videos)

**Current State:** Basic media upload exists but lacks:
- Upload quantity enforcement
- Video duration limits
- Processing state tracking
- Thumbnail generation
- Video transcoding

**Solution:** Implement comprehensive media management with:
1. Frontend validation before upload
2. Backend enforcement of limits
3. Video transcoding pipeline
4. Progress tracking and status updates
5. Error handling with retry mechanisms
6. Storage optimization with CDN

**Business Value:**
- 🎨 **Consistent Quality** - all media meets standards
- ⚡ **Better Performance** - optimized file sizes
- 💾 **Storage Efficiency** - compression and CDN
- 🚫 **Prevent Abuse** - enforce limits

---

## 👥 User Stories

### Primary User Story
```
As a business owner,
I want to upload media with clear limits and validation,
So that my content displays properly and meets quality standards.
```

### Supporting User Stories
```
As a business owner,
I want to see upload progress for large files,
So that I know my upload is working.

As a business owner,
I want automatic thumbnail generation for videos,
So that they preview nicely.

As a platform admin,
I want to enforce media limits,
So that storage costs remain manageable.

As a customer,
I want media to load quickly,
So that I have a good browsing experience.
```

---

## ✅ Acceptance Criteria

### Must Have (MVP)

#### 1. Upload Limit Enforcement
- [ ] **Image Limits:**
  - [ ] Max 4 images per product/coupon/ad
  - [ ] UI shows "X/4 images" counter
  - [ ] Disable upload button when limit reached
  - [ ] Clear error message if limit exceeded
- [ ] **Video Limits:**
  - [ ] Max 1 video per item
  - [ ] Max duration: 60 seconds
  - [ ] Duration check before upload starts
  - [ ] Replace video if new one uploaded
- [ ] **File Size Validation:**
  - [ ] Images: Max 5MB each
  - [ ] Videos: Max 50MB
  - [ ] Client-side pre-validation
  - [ ] Server-side verification

#### 2. Format Validation
- [ ] **Supported Image Formats:**
  - [ ] JPG/JPEG
  - [ ] PNG
  - [ ] WebP
  - [ ] Reject other formats with clear error
- [ ] **Supported Video Formats:**
  - [ ] MP4 (H.264 codec)
  - [ ] Reject other formats
  - [ ] Show codec requirements in UI

#### 3. Upload State Machine
- [ ] **State Transitions:**
  - [ ] `uploading` - File transfer in progress
  - [ ] `processing` - Server-side validation
  - [ ] `transcoding` - Video conversion (videos only)
  - [ ] `ready` - Available for use
  - [ ] `failed` - Error occurred
- [ ] **Progress Tracking:**
  - [ ] Upload percentage (0-100%)
  - [ ] Processing indicator
  - [ ] Transcoding progress
  - [ ] Success/failure notification
- [ ] **Error Recovery:**
  - [ ] Retry button for failed uploads
  - [ ] Clear error messages
  - [ ] Resume upload option (future)

#### 4. Video Processing
- [ ] **Transcoding Pipeline:**
  - [ ] Convert to H.264 MP4
  - [ ] Multiple quality levels (480p, 720p)
  - [ ] Optimize for web playback
  - [ ] Generate HLS/DASH manifests (future)
- [ ] **Thumbnail Generation:**
  - [ ] Extract frame at 3 seconds
  - [ ] Generate multiple sizes (small, medium, large)
  - [ ] Save thumbnail URLs to database
- [ ] **Duration Validation:**
  - [ ] Extract video duration on upload
  - [ ] Reject if >60 seconds
  - [ ] Store duration in database

#### 5. Storage Optimization
- [ ] **Image Compression:**
  - [ ] Auto-compress to reduce file size
  - [ ] Maintain acceptable quality
  - [ ] Generate responsive sizes
- [ ] **CDN Integration:**
  - [ ] Upload to CDN-backed storage
  - [ ] Return CDN URLs
  - [ ] Cache headers configured
- [ ] **Cleanup:**
  - [ ] Delete orphaned media files
  - [ ] Remove old failed uploads
  - [ ] Archive replaced media

### Should Have
- [ ] Batch upload for multiple images
- [ ] Drag-and-drop interface
- [ ] Image cropping/editing
- [ ] Video trimming

### Won't Have (This Story)
- ⛔ Advanced video editing
- ⛔ Live streaming support
- ⛔ 360° video support
- ⛔ AR/VR content

---

## 🛠️ Technical Requirements

### Database Schema

#### Update: `media` table
```sql
-- Add new columns to existing media table
ALTER TABLE media
ADD COLUMN upload_state TEXT DEFAULT 'uploading' 
  CHECK (upload_state IN ('uploading', 'processing', 'transcoding', 'ready', 'failed')),
ADD COLUMN processing_started_at TIMESTAMPTZ,
ADD COLUMN processing_completed_at TIMESTAMPTZ,
ADD COLUMN processing_error TEXT,
ADD COLUMN transcoded_url TEXT,
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN thumbnail_small_url TEXT,
ADD COLUMN thumbnail_medium_url TEXT,
ADD COLUMN thumbnail_large_url TEXT,
ADD COLUMN duration_seconds INTEGER,
ADD COLUMN file_size_bytes BIGINT,
ADD COLUMN original_filename TEXT,
ADD COLUMN mime_type TEXT,
ADD COLUMN width INTEGER,
ADD COLUMN height INTEGER,
ADD COLUMN upload_progress INTEGER DEFAULT 0,
ADD COLUMN retry_count INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX idx_media_upload_state ON media(upload_state);
CREATE INDEX idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX idx_media_failed ON media(upload_state, processing_error) WHERE upload_state = 'failed';
```

#### New Table: `media_processing_queue`
```sql
CREATE TABLE media_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  
  task_type TEXT NOT NULL CHECK (task_type IN ('transcode', 'thumbnail', 'compress', 'optimize')),
  priority INTEGER DEFAULT 5,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_processing_queue_status ON media_processing_queue(status, priority);
CREATE INDEX idx_processing_queue_media ON media_processing_queue(media_id);
```

### API Endpoints

#### 1. Upload Media
```typescript
POST /api/media/upload
Body: FormData {
  file: File,
  entityType: 'product' | 'coupon' | 'ad' | 'business',
  entityId: string,
  mediaType: 'image' | 'video'
}
Response: {
  mediaId: string,
  uploadState: 'uploading',
  progressUrl: string // for polling
}
```

#### 2. Get Upload Progress
```typescript
GET /api/media/progress/{mediaId}
Response: {
  mediaId: string,
  uploadState: string,
  progress: number, // 0-100
  thumbnailUrl?: string,
  error?: string
}
```

#### 3. Validate Media Limits
```typescript
GET /api/media/limits?entityType={type}&entityId={id}
Response: {
  images: {
    current: number,
    max: number,
    canUpload: boolean
  },
  videos: {
    current: number,
    max: number,
    canUpload: boolean
  }
}
```

#### 4. Retry Failed Upload
```typescript
POST /api/media/retry/{mediaId}
Response: {
  success: boolean,
  newState: string
}
```

#### 5. Delete Media
```typescript
DELETE /api/media/{mediaId}
Response: {
  success: boolean
}
```

### Background Jobs

#### 1. Video Transcoding Job
```typescript
// Runs on media_processing_queue
async function processVideoTranscode(mediaId: string) {
  // 1. Download original video
  // 2. Extract metadata (duration, resolution)
  // 3. Validate duration (<60 seconds)
  // 4. Transcode to H.264 MP4
  // 5. Generate quality variants (480p, 720p)
  // 6. Upload transcoded files
  // 7. Update media record with URLs
  // 8. Update state to 'ready'
}
```

#### 2. Thumbnail Generation Job
```typescript
async function generateThumbnails(mediaId: string) {
  // 1. Extract frame at 3 seconds
  // 2. Generate 3 sizes (small: 150px, medium: 300px, large: 600px)
  // 3. Upload thumbnails
  // 4. Update media record with URLs
}
```

#### 3. Image Optimization Job
```typescript
async function optimizeImage(mediaId: string) {
  // 1. Download original
  // 2. Compress with quality 85%
  // 3. Generate responsive sizes
  // 4. Upload optimized versions
  // 5. Update media record
}
```

#### 4. Cleanup Job
```typescript
// Runs daily
async function cleanupOrphanedMedia() {
  // 1. Find media older than 24h with state 'failed'
  // 2. Delete from storage
  // 3. Delete from database
  
  // 4. Find media not linked to any entity
  // 5. Delete after 7 days grace period
}
```

### React Components

#### 1. `MediaUploader.tsx`
```typescript
src/components/common/media/MediaUploader.tsx
- File input with drag-and-drop
- Upload progress bar
- Preview thumbnails
- Error display
- Limit indicators (X/4 images)
```

#### 2. `MediaGallery.tsx`
```typescript
src/components/common/media/MediaGallery.tsx
- Display uploaded media
- Grid layout for images
- Video player
- Delete button
- Reorder functionality
```

#### 3. `VideoUploader.tsx`
```typescript
src/components/common/media/VideoUploader.tsx
- Video file selector
- Duration pre-check
- Transcoding progress
- Thumbnail preview
- Replace video option
```

#### 4. `UploadProgress.tsx`
```typescript
src/components/common/media/UploadProgress.tsx
- Progress bar (0-100%)
- State indicator
- Cancel button
- Retry button (if failed)
- Estimated time remaining
```

### Custom Hooks

#### `useMediaUpload.ts`
```typescript
export function useMediaUpload(entityType: string, entityId: string) {
  const uploadMedia = async (file: File, type: 'image' | 'video') => {...}
  const checkLimits = async () => {...}
  const deleteMedia = async (mediaId: string) => {...}
  const retryUpload = async (mediaId: string) => {...}
  
  return {
    uploadMedia,
    checkLimits,
    deleteMedia,
    retryUpload,
    uploading,
    progress,
    error
  }
}
```

#### `useMediaProcessing.ts`
```typescript
export function useMediaProcessing(mediaId: string) {
  const pollProgress = async () => {...}
  const getState = async () => {...}
  
  return {
    state,
    progress,
    thumbnailUrl,
    error,
    loading
  }
}
```

### Third-Party Services

#### Option 1: FFmpeg (Self-Hosted)
```typescript
import ffmpeg from 'fluent-ffmpeg'

async function transcodeVideo(inputPath: string, outputPath: string) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('1280x720')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath)
  })
}
```

#### Option 2: Cloudinary (Cloud Service)
```typescript
import { v2 as cloudinary } from 'cloudinary'

async function uploadToCloudinary(file: Buffer) {
  return cloudinary.uploader.upload(file, {
    resource_type: 'video',
    eager: [
      { width: 1280, height: 720, crop: 'fit', format: 'mp4' },
      { width: 640, height: 480, crop: 'fit', format: 'mp4' }
    ],
    eager_async: true
  })
}
```

---

## 🎨 UI/UX Requirements

### Wireframe: Image Upload Interface

```
┌──────────────────────────────────────────┐
│ Product Images                    (2/4)  │
├──────────────────────────────────────────┤
│                                           │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │         │ │         │ │ [+]     │     │
│ │ Image 1 │ │ Image 2 │ │ Upload  │     │
│ │ [X]     │ │ [X]     │ │ Image   │     │
│ └─────────┘ └─────────┘ └─────────┘     │
│                                           │
│ Supported: JPG, PNG, WebP                │
│ Max size: 5MB per image                  │
│ You can upload 2 more images             │
│                                           │
│ [Browse Files] or drag & drop here       │
└──────────────────────────────────────────┘
```

### Wireframe: Video Upload with Progress

```
┌──────────────────────────────────────────┐
│ Product Video                      (0/1) │
├──────────────────────────────────────────┤
│                                           │
│ ┌────────────────────────────────────┐  │
│ │ Uploading: product-demo.mp4        │  │
│ │                                    │  │
│ │ [████████████░░░░░░░░░░] 65%      │  │
│ │                                    │  │
│ │ Transcoding video...               │  │
│ │ Estimated: 2 minutes remaining     │  │
│ │                                    │  │
│ │ [Cancel Upload]                    │  │
│ └────────────────────────────────────┘  │
│                                           │
│ Once complete:                            │
│ ✓ Video optimized for web playback       │
│ ✓ Thumbnail generated automatically       │
│                                           │
└──────────────────────────────────────────┘
```

### Wireframe: Upload Error State

```
┌──────────────────────────────────────────┐
│ Upload Failed                             │
├──────────────────────────────────────────┤
│                                           │
│ ⚠️ File: vacation-video.mp4              │
│                                           │
│ Error: Video duration exceeds 60 seconds │
│                                           │
│ Your video is 2 minutes 35 seconds long. │
│ Please trim it to under 60 seconds and   │
│ try again.                                │
│                                           │
│ Tips:                                     │
│ • Use video editing software to trim     │
│ • Focus on the most important content    │
│ • Keep it short and engaging             │
│                                           │
│ [Choose Different File] [Cancel]         │
└──────────────────────────────────────────┘
```

---

## 🧪 Test Plan

### Unit Tests

```typescript
describe('Media Validation', () => {
  it('rejects files over 5MB for images')
  it('rejects files over 50MB for videos')
  it('validates supported formats')
  it('rejects unsupported formats')
  it('checks image count limits (max 4)')
  it('checks video count limits (max 1)')
  it('validates video duration (<60s)')
})

describe('Upload State Machine', () => {
  it('transitions uploading -> processing')
  it('transitions processing -> transcoding for videos')
  it('transitions to ready on success')
  it('transitions to failed on error')
  it('increments retry count on failure')
})
```

### Integration Tests

```typescript
describe('Media Upload Flow', () => {
  it('uploads image successfully')
  it('uploads video and transcodes')
  it('generates thumbnails')
  it('enforces upload limits')
  it('retries failed uploads')
  it('cleans up orphaned files')
})
```

### E2E Test Scenarios

```gherkin
Given a business owner is creating a product
When they upload 4 images
Then all images are accepted
When they try to upload a 5th image
Then error message shows "Maximum 4 images reached"

Given a business owner uploads a video
When video duration is 45 seconds
Then upload proceeds normally
And transcoding starts
And thumbnail is generated
When video duration is 75 seconds
Then upload is rejected
And error shows "Video must be under 60 seconds"
```

---

## 📝 Implementation Plan

### Day 1: Schema & Validation
- [ ] Update media table schema
- [ ] Create processing queue table
- [ ] Add RLS policies
- [ ] Implement file validation logic
- [ ] Create limit checking API
- [ ] Unit tests for validation

### Day 2: Upload & Processing
- [ ] Implement upload endpoint
- [ ] Create progress tracking
- [ ] Build FFmpeg transcoding job
- [ ] Thumbnail generation job
- [ ] Image optimization job
- [ ] Queue management

### Day 3: UI & Testing
- [ ] MediaUploader component
- [ ] VideoUploader component
- [ ] UploadProgress component
- [ ] MediaGallery component
- [ ] Integration tests
- [ ] E2E scenarios
- [ ] Error handling polish
- [ ] Documentation

---

## 🔗 Integration Points

### Existing Systems
- **Products:** Link media to products
- **Coupons:** Link media to coupons
- **Ads:** Link media to ad requests
- **Businesses:** Business profile images

### External Services
- **Storage:** Supabase Storage or S3
- **CDN:** CloudFront or Cloudinary
- **Transcoding:** FFmpeg or Cloudinary

---

## 🚨 Edge Cases & Error Handling

### Edge Cases
1. **Network interruption:** Resume upload if possible
2. **Duplicate uploads:** Detect and skip
3. **Corrupted files:** Validate integrity
4. **Very slow uploads:** Show patience message
5. **Browser refresh:** Save progress

### Error Recovery
- Retry failed transcoding jobs (max 3 attempts)
- Graceful degradation if thumbnails fail
- Quarantine problem files for manual review
- Email admin on repeated failures

---

## 📊 Success Metrics

### Functional Metrics
- [ ] Upload success rate >98%
- [ ] Transcoding success rate >95%
- [ ] Average upload time <30s for images
- [ ] Average transcode time <2min for videos

### Business Metrics
- [ ] Storage cost per user
- [ ] CDN bandwidth usage
- [ ] User satisfaction with media quality

---

## 📚 Definition of Done

### Code Complete
- [ ] All database migrations applied
- [ ] Upload API functional
- [ ] Processing pipeline working
- [ ] UI components complete
- [ ] Limit enforcement active

### Testing Complete
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E scenarios verified
- [ ] Performance benchmarks met

### Documentation Complete
- [ ] API documentation
- [ ] User guide with examples
- [ ] Admin troubleshooting guide
- [ ] README updated

---

## 🔄 Future Enhancements

### Phase 2
- Batch upload for multiple files
- Client-side image cropping
- Video trimming tool
- Advanced compression options

### Phase 3
- Live streaming support
- 360° video support
- AR/VR content
- AI-powered image tagging

---

**Story Status:** 📝 PLANNED  
**Blocked By:** None ✅  
**Blocking:** None  
**Ready for Development:** YES 🚀

