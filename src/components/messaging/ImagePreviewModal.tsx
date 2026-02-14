import React, { useState, useEffect } from 'react'
import { X, Check, Trash2, ChevronLeft, ChevronRight, GripHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { Reorder, useDragControls } from 'framer-motion'

interface ImagePreviewModalProps {
  isOpen: boolean
  imageFiles: File[]
  imageUrls: string[] // Blob URLs for preview
  onSend: (caption: string, useHD: boolean) => Promise<void>
  onCancel: () => void
  onRemoveImage?: (index: number) => void
  // Callback to update parent state when reordered
  onReorder?: (newFiles: File[], newUrls: string[]) => void
}

/**
 * ImagePreviewModal Component
 *
 * Full-screen modal for previewing multiple images before sending
 *
 * Features:
 * - Full-screen image preview
 * - Thumbnail carousel for multiple images with Drag-and-Drop Reordering
 * - Caption input (multiline, emoji support)
 * - HD quality toggle
 * - Send/Cancel buttons
 * - Keyboard shortcuts (Esc, Ctrl+Enter, Left/Right arrows)
 */
export function ImagePreviewModal({
  isOpen,
  imageFiles,
  imageUrls,
  onSend,
  onCancel,
  onRemoveImage,
  onReorder
}: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [caption, setCaption] = useState('')
  const [useHD, setUseHD] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Local state for reordering to avoid parent flicker, but we need to sync with parent
  // actually, syncing with parent immediately is better for simplicity if parent supports it
  // If parent doesn't support onReorder, we can't really reorder effectively since parent holds the source of truth for upload.
  // We'll assume parent WILL support it. If not, we should probably add internal state, but upload uses parent state.
  // So we MUST update parent state.

  // Reset state when modal opens/closes or images change
  useEffect(() => {
    if (!isOpen) {
      setCaption('')
      setUseHD(false)
      setIsSending(false)
      setCurrentIndex(0)
    }
  }, [isOpen])

  // Adjust current index if selected image is removed
  useEffect(() => {
    if (currentIndex >= imageUrls.length && imageUrls.length > 0) {
      setCurrentIndex(imageUrls.length - 1)
    }
  }, [imageUrls.length, currentIndex])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }

      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(0, prev - 1))
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(imageUrls.length - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, caption, useHD, imageUrls.length])

  const handleSend = async () => {
    if (isSending) return

    try {
      setIsSending(true)
      await onSend(caption, useHD)
      // Modal will close via onCancel after successful send
    } catch (error) {
      console.error('Failed to send image:', error)
      setIsSending(false)
    }
  }

  const handleCancel = () => {
    if (isSending) return
    onCancel()
  }

  const handleRemoveCurrent = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (imageUrls.length <= 1) {
      handleCancel() // Close if removing last image
    } else {
      onRemoveImage?.(currentIndex)
    }
  }

  const handleReorder = (newOrderUrls: string[]) => {
    if (!onReorder) return;

    // Reconstruct files array based on new url order
    // We need to map back URL -> File. 
    // Assumption: imageUrls and imageFiles are index-matched.
    // We can create a map first.
    const urlToFileMap = new Map<string, File>();
    imageUrls.forEach((url, i) => {
      urlToFileMap.set(url, imageFiles[i]);
    });

    const newFiles = newOrderUrls.map(url => urlToFileMap.get(url)).filter(Boolean) as File[];

    onReorder(newFiles, newOrderUrls);
  }

  if (!isOpen || imageUrls.length === 0) return null

  const currentUrl = imageUrls[currentIndex]
  const currentFile = imageFiles[currentIndex]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 animate-in fade-in duration-300"
      onClick={handleCancel}
    >
      <div
        className="relative w-full h-full max-w-5xl max-h-screen flex flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 z-10">
          {/* Cancel Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isSending}
            className="text-white hover:bg-white/10 rounded-full"
            aria-label="Cancel"
          >
            <X className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="text-white/80 text-sm font-medium">
              {currentIndex + 1} / {imageUrls.length}
            </div>

            {/* Remove Image Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveCurrent}
              disabled={isSending}
              className="text-white hover:bg-white/10 hover:text-red-400 rounded-full"
              title="Remove this image"
            >
              <Trash2 className="w-5 h-5" />
            </Button>

            {/* HD Toggle */}
            <label className="flex items-center gap-2 text-white cursor-pointer select-none bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
              <input
                type="checkbox"
                checked={useHD}
                onChange={(e) => setUseHD(e.target.checked)}
                disabled={isSending}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold tracking-wider">HD</span>
            </label>
          </div>
        </div>

        {/* Main Image Preview Area */}
        <div className="flex-1 relative flex items-center justify-center min-h-0 mb-4 overflow-hidden group">
          {/* Previous Button */}
          {currentIndex > 0 && (
            <button
              className="absolute left-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 z-10"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(prev => prev - 1)
              }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {currentUrl && (
            <img
              src={currentUrl}
              alt={`Preview ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-200"
              style={{ maxHeight: 'calc(100vh - 250px)' }}
            />
          )}

          {/* Next Button */}
          {currentIndex < imageUrls.length - 1 && (
            <button
              className="absolute right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 z-10"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(prev => prev + 1)
              }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Footer Area with Carousel and Input */}
        <div className="flex flex-col gap-4 z-10">
          {/* Thumbnail Carousel with Reordering */}
          {imageUrls.length > 1 && (
            <div className="flex justify-center w-full overflow-x-auto py-2 px-4 no-scrollbar">
              <Reorder.Group
                axis="x"
                values={imageUrls}
                onReorder={handleReorder}
                className="flex gap-2"
              >
                {imageUrls.map((url, idx) => (
                  <Reorder.Item
                    key={url}
                    value={url}
                    className="relative"
                  >
                    <div
                      className={cn(
                        "relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer group",
                        idx === currentIndex
                          ? "border-blue-500 opacity-100 scale-110"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover pointer-events-none" // prevent img drag interfering with Reorder
                      />
                      {/* Drag handle hint on hover */}
                      <div className="absolute inset-x-0 bottom-0 h-4 bg-black/40 hidden group-hover:flex items-center justify-center pointer-events-none">
                        <GripHorizontal className="w-3 h-3 text-white/80" />
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          )}

          {/* Caption Input */}
          <div className="bg-white rounded-2xl p-1 relative shadow-lg max-w-2xl mx-auto w-full">
            <div className="relative flex items-end">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                disabled={isSending}
                className="w-full resize-none border-none focus:outline-none focus:ring-0 text-gray-900 placeholder:text-gray-400 py-3 px-4 min-h-[48px] max-h-[120px] rounded-xl bg-transparent text-[15px] leading-relaxed"
                rows={1}
                maxLength={1000}
                style={{ height: 'auto', minHeight: '48px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={isSending}
                className={cn(
                  "m-1 p-2 rounded-full flex-shrink-0 transition-all duration-200",
                  "bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                )}
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="px-4 pb-1 flex justify-between text-[11px] text-gray-400 font-medium">
              <span>
                {imageFiles.length} photo{imageFiles.length !== 1 ? 's' : ''} selected
              </span>
              {currentFile && (
                <span>
                  {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

