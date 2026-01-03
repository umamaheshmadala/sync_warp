import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, Download, ChevronLeft, ChevronRight, Share2, Save } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../ui/dialog'
import toast from 'react-hot-toast'

interface ImageLightboxProps {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

/**
 * ImageLightbox Component
 * 
 * Fullscreen image viewer with mobile gestures and native sharing
 * 
 * Features:
 * - Web: Fullscreen modal, download, keyboard navigation
 * - Mobile: Pinch-to-zoom, double-tap, long-press action sheet, native share
 * - Animations: Smooth slide transitions between images
 */
export function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(0) // -1 for left (prev), 1 for right (next)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  // Swipe detection
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const MIN_SWIPE_DISTANCE = 50

  const currentImage = images[currentIndex]
  const hasMultiple = images.length > 1
  const isMobile = Capacitor.isNativePlatform()

  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  }

  // Navigation
  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setDirection(-1)
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images])

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setDirection(1)
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images])

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

          toast.success('Image saved to device')
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
        toast.success('Image downloaded')
      }
    } catch (error) {
      console.error('Save/download failed:', error)
      toast.error('Failed to save image')
    }
  }

  /**
   * Share image via native share sheet (mobile) or Web Share API
   */
  const handleShareImage = async () => {
    try {
      if (isMobile) {
        await Haptics.impact({ style: ImpactStyle.Light })
      }

      // Use shareService for cross-platform sharing with tracking
      const { shareService } = await import('../../services/shareService')
      await shareService.shareImage(currentImage, 'lightbox-share')
    } catch (error) {
      // User cancelled or error
      console.log('Share cancelled or failed:', error)
    }
  }

  /**
   * Handle touch start - track position for swipe detection
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY

    if (!isMobile) return

    longPressTimer.current = setTimeout(async () => {
      await Haptics.impact({ style: ImpactStyle.Medium })
      setShowMobileActions(true)
    }, 500) // 500ms long-press
  }

  /**
   * Handle touch end - detect swipe for navigation
   */
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Calculate swipe distance
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
      if (deltaX > 0) {
        // Swipe right - go to previous
        goToPrevious()
      } else {
        // Swipe left - go to next
        goToNext()
      }
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault() // Prevent default focus behavior
        goToPrevious()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault() // Prevent default focus behavior
        goToNext()
      }
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, goToPrevious, goToNext, onClose])

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setDirection(0) // Reset direction
    }
  }, [isOpen, initialIndex])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-screen h-screen max-h-screen p-0 bg-black border-none overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <div className="relative w-full h-full bg-black overflow-hidden">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleSaveImage}
            className="absolute top-4 right-16 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            aria-label={isMobile ? "Save image" : "Download"}
          >
            {isMobile ? (
              <Save className="w-6 h-6 text-white" />
            ) : (
              <Download className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Share Button (Mobile/Web Share API) */}
          {(isMobile || navigator.share) && (
            <button
              type="button"
              onClick={handleShareImage}
              className="absolute top-4 right-28 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Image Counter */}
          {hasMultiple && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/50 rounded-lg">
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          )}

          {/* Previous Button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Next Button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Image with Transitions and Pinch-to-Zoom */}
          <div
            className="flex items-center justify-center w-full h-full overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="absolute inset-0 flex items-center justify-center p-0 md:p-8 w-full h-full"
              >
                {isMobile ? (
                  <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={4}
                    doubleClick={{ disabled: false, step: 0.5 }}  // Double-tap to zoom
                    wheel={{ disabled: true }}  // Disable mouse wheel on mobile
                    pinch={{ disabled: false }}  // Enable pinch-to-zoom
                    panning={{ disabled: true }}  // DISABLE panning by default to allow swipe
                    limitToBounds={true}
                    centerOnInit={true}
                  >
                    <TransformComponent>
                      <img
                        src={currentImage}
                        alt={`Image ${currentIndex + 1}`}
                        className="max-w-full max-h-full object-contain"
                        style={{ maxHeight: 'calc(100vh - 4rem)' }}
                      />
                    </TransformComponent>
                  </TransformWrapper>
                ) : (
                  <img
                    src={currentImage}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: 'calc(100vh - 4rem)' }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile Action Sheet */}
          {showMobileActions && isMobile && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 animate-slide-up z-30">
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
