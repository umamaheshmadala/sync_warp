# 🖼️ STORY 8.3.5: Media Display Components

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day  
**Priority:** P1 - High  
**Status:** ✅ Complete  
**Completed:** 2024-12-04

---

## 🎯 **Story Goal**

Implement **rich media display components** for rendering images and videos in messages. Includes image lightbox/gallery viewer, video player with controls, and responsive layouts for different screen sizes.

---

## 📱 **Platform Support**

| Platform    | Support | Implementation Notes                                                                                    |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------- |
| **Web**     | ✅ Full | Standard image viewer with lightbox, HTML5 video player                                                 |
| **iOS**     | ✅ Full | Native gestures (pinch-to-zoom), haptic feedback, action sheets, fullscreen video with orientation lock |
| **Android** | ✅ Full | Native gestures (pinch-to-zoom), haptic feedback, bottom sheets, fullscreen video with orientation lock |

### Required Capacitor Plugins

```bash
# Install for mobile app support
npm install @capacitor/haptics@^5.0.0              # Haptic feedback for interactions
npm install @capacitor/filesystem@^5.0.0           # Save images to device
npm install @capacitor/screen-orientation@^5.0.0   # Lock orientation for fullscreen video
npm install @capacitor/share@^5.0.0                # Share images/videos
```

### iOS Configuration

**1. Add Photo Library permissions to `ios/App/Info.plist`:**

```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save images from messages to your photo library</string>
```

### Android Configuration

**1. Add storage permissions to `android/app/src/main/AndroidManifest.xml`:**

```xml
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                 android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

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

#### Task 2.1: Install Dependencies for Mobile Gestures

```bash
# Install Shadcn Dialog component for lightbox
warp mcp run shadcn "add dialog"

# Install pinch-to-zoom library for mobile
npm install react-zoom-pan-pinch
```

#### Task 2.2: Create ImageLightbox Component with Mobile Support

```typescript
// src/components/messaging/ImageLightbox.tsx
import React from 'react'
import { X, Download, ChevronLeft, ChevronRight, Share2, Save } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
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
  const [showMobileActions, setShowMobileActions] = React.useState(false)
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null)

  const currentImage = images[currentIndex]
  const hasMultiple = images.length > 1
  const isMobile = Capacitor.isNativePlatform()

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  /**
   * Save image to device (mobile) or download (web)
   */
  const handleSaveImage = async () => {
    try {
      if (isMobile) {
        // Mobile: Save to device storage
        await Haptics.impact({ style: ImpactStyle.Light })

        const response = await fetch(currentImage)
        const blob = await response.blob()
        const reader = new FileReader()

        reader.onloadend = async () => {
          const base64 = reader.result as string
          const base64Data = base64.split(',')[1]

          await Filesystem.writeFile({
            path: `sync-image-${Date.now()}.jpg`,
            data: base64Data,
            directory: Directory.Documents
          })

          // Show success feedback (implement toast/alert)
          console.log('✅ Image saved to device')
        }

        reader.readAsDataURL(blob)
      } else {
        // Web: Traditional download
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
      }
    } catch (error) {
      console.error('Save/download failed:', error)
    }
  }

  /**
   * Share image via native share sheet (mobile) or Web Share API
   */
  const handleShareImage = async () => {
    try {
      if (isMobile) {
        await Haptics.impact({ style: ImpactStyle.Light })

        await Share.share({
          title: 'Share Image',
          url: currentImage,
          dialogTitle: 'Share this image'
        })
      } else if (navigator.share) {
        await navigator.share({
          title: 'Share Image',
          url: currentImage
        })
      }
    } catch (error) {
      console.log('Share cancelled or failed:', error)
    }
  }

  /**
   * Handle long-press on mobile to show actions
   */
  const handleTouchStart = () => {
    if (!isMobile) return

    longPressTimer.current = setTimeout(async () => {
      await Haptics.impact({ style: ImpactStyle.Medium })
      setShowMobileActions(true)
    }, 500) // 500ms long-press
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Legacy download method for web
  const handleDownload = handleSaveImage

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

          {/* Image with Pinch-to-Zoom (Mobile) */}
          <div
            className="flex items-center justify-center w-full h-full p-8"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {isMobile ? (
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                doubleClick={{ disabled: false, step: 0.5 }}  // Double-tap to zoom
                wheel={{ disabled: true }}  // Disable mouse wheel on mobile
                pinch={{ disabled: false }}  // Enable pinch-to-zoom
              >
                <TransformComponent>
                  <img
                    src={currentImage}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </TransformComponent>
              </TransformWrapper>
            ) : (
              <img
                src={currentImage}
                alt={`Image ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Mobile Action Sheet */}
          {showMobileActions && isMobile && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 animate-slide-up">
              <button
                onClick={() => {
                  handleSaveImage()
                  setShowMobileActions(false)
                }}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg"
              >
                <Save className="w-5 h-5" />
                <span className="font-medium">Save Image</span>
              </button>

              <button
                onClick={() => {
                  handleShareImage()
                  setShowMobileActions(false)
                }}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg"
              >
                <Share2 className="w-5 h-5" />
                <span className="font-medium">Share</span>
              </button>

              <button
                onClick={() => setShowMobileActions(false)}
                className="w-full flex items-center justify-center p-4 text-red-600 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

### **Phase 3: Video Message Component** (0.25 days)

#### Task 3.1: Create VideoMessage Component with Mobile Fullscreen Support

```typescript
// src/components/messaging/VideoMessage.tsx
import React, { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation, OrientationType } from '@capacitor/screen-orientation'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = Capacitor.isNativePlatform()

  const togglePlay = async () => {
    if (videoRef.current) {
      if (isMobile) {
        await Haptics.impact({ style: ImpactStyle.Light })
      }

      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = async () => {
    if (videoRef.current) {
      if (isMobile) {
        await Haptics.impact({ style: ImpactStyle.Light })
      }
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  /**
   * Toggle fullscreen with orientation lock on mobile
   */
  const toggleFullscreen = async () => {
    if (videoRef.current) {
      if (isMobile) {
        await Haptics.impact({ style: ImpactStyle.Medium })
      }

      if (document.fullscreenElement || isFullscreen) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }

        // Unlock orientation on mobile
        if (isMobile) {
          await ScreenOrientation.unlock()
        }

        setIsFullscreen(false)
      } else {
        // Enter fullscreen
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen()
        }

        // Lock to landscape on mobile
        if (isMobile) {
          await ScreenOrientation.lock({ orientation: OrientationType.LANDSCAPE })
        }

        setIsFullscreen(true)
      }
    }
  }

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isNowFullscreen = !!document.fullscreenElement
      setIsFullscreen(isNowFullscreen)

      if (isMobile) {
        if (isNowFullscreen) {
          await ScreenOrientation.lock({ orientation: OrientationType.LANDSCAPE })
        } else {
          await ScreenOrientation.unlock()
        }
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isMobile])

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
# Test image lightbox (web only)
warp mcp run puppeteer "click image, verify lightbox opens, navigate with arrows"

# Test video playback
warp mcp run puppeteer "click play button, verify video plays, test seek bar"
```

### 📱 Mobile Testing (iOS/Android)

**Manual Testing Required - Native gestures and orientation cannot be fully automated**

#### iOS Testing (Xcode Simulator + Physical Device)

1. **Image Viewer Tests:**
   - [ ] Tap image thumbnail → Opens fullscreen viewer
   - [ ] Pinch to zoom in → Zooms smoothly at 60fps
   - [ ] Pinch to zoom out → Zooms out smoothly
   - [ ] Double-tap → Zooms to 2x instantly
   - [ ] Double-tap again → Zooms back to 1x
   - [ ] Swipe left/right → Navigates between images (if multiple)
2. **Long-Press Action Sheet:**
   - [ ] Long-press image (500ms) → Haptic feedback (medium)
   - [ ] Action sheet appears with "Save Image", "Share", "Cancel"
   - [ ] Tap "Save Image" → Haptic feedback + saves to Documents folder
   - [ ] Verify saved: Check iOS Files app → "On My iPhone" → Sync folder
   - [ ] Tap "Share" → Native share sheet with iOS apps
   - [ ] Tap "Cancel" → Action sheet dismisses

3. **Video Player Tests:**
   - [ ] Tap video thumbnail → Video loads with poster image
   - [ ] Tap play button → Haptic feedback + video plays inline
   - [ ] Tap pause button → Haptic feedback + video pauses
   - [ ] Tap fullscreen button → Haptic feedback (medium) + enters fullscreen
   - [ ] **Orientation lock**: Fullscreen → Screen rotates to landscape automatically
   - [ ] Rotate device manually in fullscreen → Stays landscape (locked)
   - [ ] Exit fullscreen → Returns to portrait + orientation unlocks
   - [ ] Tap mute button → Haptic feedback + audio mutes
4. **Performance Tests:**
   - [ ] Load image gallery (10 images) → Scrolling is smooth (60fps)
   - [ ] Zoom large image (5MB+) → No lag, loads progressively
   - [ ] Play video → No dropped frames in Xcode Instruments
   - [ ] Switch between images quickly → No memory warnings

#### Android Testing (Android Emulator + Physical Device)

1. **Image Viewer Tests:**
   - [ ] Tap image thumbnail → Opens fullscreen viewer
   - [ ] Pinch to zoom in → Zooms smoothly at 60fps
   - [ ] Pinch to zoom out → Zooms out smoothly
   - [ ] Double-tap → Zooms to 2x instantly
   - [ ] Double-tap again → Zooms back to 1x
   - [ ] Swipe left/right → Navigates between images (if multiple)

2. **Long-Press Bottom Sheet:**
   - [ ] Long-press image (500ms) → Haptic feedback (medium)
   - [ ] Bottom sheet slides up with "Save Image", "Share", "Cancel"
   - [ ] Tap "Save Image" → Haptic feedback + saves to Gallery
   - [ ] Verify saved: Open Android Gallery app → Check "Sync" folder
   - [ ] Tap "Share" → Native share sheet with Android apps
   - [ ] Tap "Cancel" → Bottom sheet dismisses

3. **Video Player Tests:**
   - [ ] Tap video thumbnail → Video loads with poster image
   - [ ] Tap play button → Haptic feedback + video plays inline
   - [ ] Tap pause button → Haptic feedback + video pauses
   - [ ] Tap fullscreen button → Haptic feedback (medium) + enters fullscreen
   - [ ] **Orientation lock**: Fullscreen → Screen rotates to landscape automatically
   - [ ] Rotate device manually in fullscreen → Stays landscape (locked)
   - [ ] Exit fullscreen → Returns to portrait + orientation unlocks
   - [ ] Tap mute button → Haptic feedback + audio mutes

4. **Performance Tests:**
   - [ ] Load image gallery (10 images) → Scrolling is smooth (60fps)
   - [ ] Zoom large image (5MB+) → No lag, loads progressively
   - [ ] Play video → No dropped frames in Android Profiler
   - [ ] Switch between images quickly → No ANR (Application Not Responding)

#### Cross-Platform Mobile Edge Cases

- [ ] 📱 **Permissions**: First "Save Image" → Requests storage permission (Android)
- [ ] 📱 **Permissions denied**: Deny storage → Shows "Permission required" message
- [ ] 📱 **Orientation lock**: Enter fullscreen → Lock landscape → Exit → Unlock portrait
- [ ] 📱 **Gesture conflicts**: Pinch-to-zoom doesn't trigger swipe-to-dismiss
- [ ] 📱 **Low memory**: View large images → App doesn't crash, shows loading state
- [ ] 📱 **Background/Resume**: Enter fullscreen → Background app → Resume → Stays fullscreen
- [ ] 📱 **Video orientation**: Fullscreen video → Home button → Resume → Orientation unlocked
- [ ] 📱 **Haptic feedback**: All interactive elements trigger appropriate haptics
- [ ] 📱 **Share from fullscreen**: Long-press in fullscreen → Share works correctly
- [ ] 📱 **Memory management**: Load 50+ images → Old images unloaded, no crash

#### Platform-Specific Testing

```bash
# Test storage permissions (Android)
adb shell pm revoke com.sync.app android.permission.WRITE_EXTERNAL_STORAGE
# Then try saving image in app -> Should request permission

# Check saved images (iOS - Simulator)
open ~/Library/Developer/CoreSimulator/Devices/[DEVICE_ID]/data/Containers/Data/Application/[APP_ID]/Documents

# Check saved images (Android - Emulator)
adb shell ls /sdcard/Pictures/Sync

# Monitor orientation changes (iOS)
# Xcode -> Debug -> View Debugging -> Capture View Hierarchy (while in fullscreen)

# Monitor performance (Android)
adb shell dumpsys gfxinfo com.sync.app
# Look for "Janky frames" - should be < 5%
```

---

warp mcp run puppeteer "click image thumbnail, verify lightbox opens, test navigation, close lightbox"

# Test video controls

warp mcp run puppeteer "click play on video, verify playback starts, test seek, test mute"

# Test gallery navigation

warp mcp run puppeteer "open lightbox with 3 images, navigate using arrow keys, verify correct image displays"

````

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Image Load Time** | < 500ms (all platforms) | Chrome DevTools (Web), Xcode Instruments (iOS), Android Profiler (Android) |
| **Video Load Time** | < 1s (all platforms) | Chrome DevTools (Web), Xcode Instruments (iOS), Android Profiler (Android) |
| **Lazy Loading** | 100% compliance | Intersection Observer logs |
| **Memory Usage** | < 50MB for 20 images | Chrome DevTools Memory |
| **Responsive Design** | Works on all breakpoints | Device Mode testing |
| **📱 Pinch-to-Zoom Performance** | 60fps | Xcode Instruments (iOS), Android Profiler (Android) |
| **📱 Orientation Lock** | < 200ms | Manual device testing |
| **📱 Haptic Feedback Latency** | < 50ms | iOS/Android manual testing |
| **📱 Image Save Success** | 100% | iOS Files app / Android Gallery verification |
| **📱 Video Fullscreen Rotation** | Instant | Manual device testing |

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
````

---

## 📦 **Deliverables**

1. ✅ `src/components/messaging/ImageMessage.tsx` - Image display component
2. ✅ `src/components/messaging/ImageLightbox.tsx` - Fullscreen viewer with mobile pinch-to-zoom
3. ✅ `src/components/messaging/VideoMessage.tsx` - Video player with orientation lock
4. ✅ Updated `MessageBubble.tsx` with media support
5. ✅ iOS configuration: NSPhotoLibraryAddUsageDescription permission
6. ✅ Android configuration: Storage permissions
7. ✅ Mobile action sheet / bottom sheet for save/share
8. ✅ Unit tests for all components (all platforms)
9. ✅ Mobile testing checklist (iOS + Android) - 35 test cases
10. ✅ Chrome DevTools MCP performance tests
11. ✅ Puppeteer MCP E2E tests

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
**Estimated Completion:** 1.5 days (includes mobile support)  
**Risk Level:** Low (standard media components, established patterns, storage permissions)
