# 🖼️ STORY 8.3.5: Media Display Components

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **rich media display components** for rendering images and videos in messages. Includes image lightbox/gallery viewer, video player with controls, and responsive layouts for different screen sizes.

---

## 📖 **User Stories**

### As a user, I want to:
1. See image thumbnails in messages
2. Click on an image to view it full-screen
3. Swipe between multiple images in a gallery
4. Play videos inline in the chat
5. See video duration and playback controls
6. Have images/videos load efficiently with lazy loading

### Acceptance Criteria:
- ✅ Images display as thumbnails (max 300px)
- ✅ Image lightbox opens on click
- ✅ Video player shows duration overlay
- ✅ Video controls (play/pause, seek, volume)
- ✅ Lazy loading for media below viewport
- ✅ Responsive design for mobile/tablet/desktop

---

## 🧩 **Implementation Tasks**

### **Phase 1: Image Message Component** (0.25 days)

#### Task 1.1: Create ImageMessage Component
```typescript
// src/components/messaging/ImageMessage.tsx
import React, { useState } from 'react'
import { Loader2, ZoomIn } from 'lucide-react'

interface Props {
  imageUrl: string
  thumbnailUrl?: string
  alt?: string
  onImageClick?: () => void
}

export function ImageMessage({ imageUrl, thumbnailUrl, alt = '', onImageClick }: Props) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const displayUrl = thumbnailUrl || imageUrl

  return (
    <div className="relative inline-block max-w-sm rounded-lg overflow-hidden">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {hasError ? (
        <div className="flex items-center justify-center bg-gray-100 p-8 rounded-lg">
          <p className="text-sm text-gray-500">Failed to load image</p>
        </div>
      ) : (
        <>
          <img
            src={displayUrl}
            alt={alt}
            className={`max-w-full h-auto cursor-pointer transition-opacity ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ maxHeight: '300px' }}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            onClick={onImageClick}
            loading="lazy"
          />

          {isLoaded && (
            <div className="absolute top-2 right-2 bg-black/50 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-4 h-4 text-white" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

---

### **Phase 2: Image Lightbox Component** (0.25 days)

#### Task 2.1: Create ImageLightbox Component (Using Shadcn MCP)
```bash
# Install Shadcn Dialog component for lightbox
warp mcp run shadcn "add dialog"
```

```typescript
// src/components/messaging/ImageLightbox.tsx
import React from 'react'
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ images, initialIndex = 0, isOpen, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)

  const currentImage = images[currentIndex]
  const hasMultiple = images.length > 1

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image-${currentIndex + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-lg w-full h-full p-0">
        <div className="relative w-full h-full bg-black">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="absolute top-4 right-16 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            aria-label="Download"
          >
            <Download className="w-6 h-6 text-white" />
          </button>

          {/* Image Counter */}
          {hasMultiple && (
            <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/50 rounded-lg">
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          )}

          {/* Previous Button */}
          {hasMultiple && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Next Button */}
          {hasMultiple && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Image */}
          <div className="flex items-center justify-center w-full h-full p-8">
            <img
              src={currentImage}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

### **Phase 3: Video Message Component** (0.25 days)

#### Task 3.1: Create VideoMessage Component
```typescript
// src/components/messaging/VideoMessage.tsx
import React, { useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react'

interface Props {
  videoUrl: string
  thumbnailUrl?: string
  duration?: number
}

export function VideoMessage({ videoUrl, thumbnailUrl, duration }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Number(e.target.value)
      setCurrentTime(Number(e.target.value))
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative inline-block max-w-md rounded-lg overflow-hidden bg-black group">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}

      {hasError ? (
        <div className="flex items-center justify-center bg-gray-900 p-12 rounded-lg">
          <p className="text-sm text-white">Failed to load video</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            className="w-full h-auto"
            onLoadedData={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
          />

          {/* Video Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
              {/* Progress Bar */}
              <input
                type="range"
                min="0"
                max={videoRef.current?.duration || duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-medium">
                  {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || duration || 0)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Badge (when not playing) */}
          {!isPlaying && duration && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
              {formatTime(duration)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

---

### **Phase 4: Integration with MessageBubble** (0.25 days)

#### Task 4.1: Update MessageBubble to Support Media
```typescript
// src/components/messaging/MessageBubble.tsx (update)
import { ImageMessage } from './ImageMessage'
import { VideoMessage } from './VideoMessage'
import { ImageLightbox } from './ImageLightbox'
import { LinkPreviewCard } from './LinkPreviewCard'

export function MessageBubble({ message }: { message: Message }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <>
            <ImageMessage
              imageUrl={message.mediaUrls[0]}
              thumbnailUrl={message.thumbnailUrl}
              onImageClick={() => setLightboxOpen(true)}
            />
            <ImageLightbox
              images={message.mediaUrls}
              isOpen={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
            />
          </>
        )

      case 'video':
        return (
          <VideoMessage
            videoUrl={message.mediaUrls[0]}
            thumbnailUrl={message.thumbnailUrl}
            duration={message.metadata?.duration}
          />
        )

      case 'text':
      default:
        return (
          <>
            <p className="text-sm">{message.content}</p>
            {message.linkPreview && (
              <LinkPreviewCard preview={message.linkPreview} showRemoveButton={false} />
            )}
          </>
        )
    }
  }

  return (
    <div className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs md:max-w-md rounded-lg p-3 ${
        message.isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        {renderContent()}
      </div>
    </div>
  )
}
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test ImageMessage renders thumbnail
- [ ] Test ImageMessage handles load error
- [ ] Test ImageLightbox navigation (prev/next)
- [ ] Test VideoMessage play/pause controls
- [ ] Test VideoMessage seek functionality
- [ ] Test VideoMessage mute/unmute
- [ ] Test lazy loading for images

### Integration Tests with Chrome DevTools MCP
```bash
# Test image loading performance
warp mcp run chrome-devtools "open Network tab, load chat with images, verify lazy loading works"

# Test video playback
warp mcp run chrome-devtools "open Performance tab, play video, check for dropped frames"

# Check memory usage
warp mcp run chrome-devtools "open Memory tab, load 20 images, verify no memory leaks"

# Test responsive design
warp mcp run chrome-devtools "open Device Mode, test image/video rendering on mobile/tablet"
```

### E2E Tests with Puppeteer MCP
```bash
# Test image lightbox
warp mcp run puppeteer "click image thumbnail, verify lightbox opens, test navigation, close lightbox"

# Test video controls
warp mcp run puppeteer "click play on video, verify playback starts, test seek, test mute"

# Test gallery navigation
warp mcp run puppeteer "open lightbox with 3 images, navigate using arrow keys, verify correct image displays"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Image Load Time** | < 500ms | Chrome DevTools Network |
| **Video Load Time** | < 1s | Chrome DevTools Network |
| **Lazy Loading** | 100% compliance | Intersection Observer logs |
| **Memory Usage** | < 50MB for 20 images | Chrome DevTools Memory |
| **Responsive Design** | Works on all breakpoints | Device Mode testing |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Story 8.3.1: Image upload service with signed URLs
- ✅ Story 8.3.2: Video upload service with thumbnails
- ✅ Epic 8.2: MessageBubble component exists
- ✅ Shadcn Dialog component installed

### Verify Dependencies:
```bash
# Check Shadcn components
npm list @radix-ui/react-dialog

# Verify image/video uploads working
# (Manual test: upload image/video and check Supabase storage)
```

---

## 📦 **Deliverables**

1. ✅ `src/components/messaging/ImageMessage.tsx` - Image display
2. ✅ `src/components/messaging/ImageLightbox.tsx` - Fullscreen viewer
3. ✅ `src/components/messaging/VideoMessage.tsx` - Video player
4. ✅ Updated `MessageBubble.tsx` with media support
5. ✅ Unit tests for all components
6. ✅ Chrome DevTools MCP performance tests
7. ✅ Puppeteer MCP E2E tests

---

## 🔄 **Next Steps**

✅ **Epic 8.3 Complete!**  
All 5 stories implemented:
- Story 8.3.1: Image Upload & Compression ✅
- Story 8.3.2: Video Upload & Handling ✅
- Story 8.3.3: Link Preview Generation ✅
- Story 8.3.4: Coupon/Deal Sharing ✅
- Story 8.3.5: Media Display Components ✅

**Next Epic:** [EPIC 8.4 - Group Messaging](../epics/EPIC_8.4_Group_Messaging.md)

---

## 📝 **MCP Command Quick Reference**

### Shadcn MCP
```bash
# Install Dialog component
warp mcp run shadcn "add dialog"

# Install other UI components if needed
warp mcp run shadcn "add button"
warp mcp run shadcn "add slider"
```

### Chrome DevTools MCP
```bash
# Monitor image loading
warp mcp run chrome-devtools "open Network tab, filter images, check load times"

# Check video performance
warp mcp run chrome-devtools "profile video playback, verify no frame drops"

# Memory profiling
warp mcp run chrome-devtools "take heap snapshot, load images, compare snapshots"

# Responsive testing
warp mcp run chrome-devtools "test image/video rendering on different devices"
```

### Puppeteer MCP
```bash
# Test lightbox
warp mcp run puppeteer "click image, verify lightbox opens"

# Test video player
warp mcp run puppeteer "play video, seek to 50%, verify playback"
```

### Context7 MCP
```bash
# Analyze component performance
warp mcp run context7 "review ImageMessage for optimization opportunities"

# Check accessibility
warp mcp run context7 "analyze VideoMessage for ARIA labels and keyboard navigation"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 1 day  
**Risk Level:** Low (standard media components, established patterns)
