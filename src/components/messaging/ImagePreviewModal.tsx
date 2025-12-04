import React, { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { Button } from '../ui/button'

interface ImagePreviewModalProps {
  isOpen: boolean
  imageFile: File
  imageUrl: string // Blob URL for preview
  onSend: (caption: string, useHD: boolean) => Promise<void>
  onCancel: () => void
}

/**
 * ImagePreviewModal Component
 * 
 * Full-screen modal for previewing image before sending
 * 
 * Features:
 * - Full-screen image preview
 * - Caption input (multiline, emoji support)
 * - HD quality toggle
 * - Send/Cancel buttons
 * - Keyboard shortcuts (Esc, Ctrl+Enter)
 * 
 * @example
 * ```tsx
 * <ImagePreviewModal
 *   isOpen={showPreview}
 *   imageFile={selectedFile}
 *   imageUrl={blobUrl}
 *   onSend={async (caption, useHD) => {
 *     await uploadImage(selectedFile, caption, useHD)
 *   }}
 *   onCancel={() => setShowPreview(false)}
 * />
 * ```
 */
export function ImagePreviewModal({
  isOpen,
  imageFile,
  imageUrl,
  onSend,
  onCancel
}: ImagePreviewModalProps) {
  const [caption, setCaption] = useState('')
  const [useHD, setUseHD] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  // Create blob URL from File when modal opens
  useEffect(() => {
    if (isOpen && imageFile) {
      const url = URL.createObjectURL(imageFile)
      setPreviewUrl(url)
      
      // Cleanup blob URL when modal closes
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [isOpen, imageFile])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCaption('')
      setUseHD(false)
      setIsSending(false)
    }
  }, [isOpen])

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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, caption, useHD])

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

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-in fade-in duration-300"
      onClick={handleCancel}
    >
      <div 
        className="relative w-full h-full max-w-4xl max-h-screen flex flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {/* Cancel Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isSending}
            className="text-white hover:bg-white/10"
            aria-label="Cancel"
          >
            <X className="w-6 h-6" />
          </Button>

          {/* HD Toggle */}
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={useHD}
              onChange={(e) => setUseHD(e.target.checked)}
              disabled={isSending}
              className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">HD Quality</span>
          </label>
        </div>

        {/* Image Preview */}
        <div className="flex-1 flex items-center justify-center mb-4 overflow-hidden">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </div>

        {/* Caption Input */}
        <div className="bg-white rounded-lg p-3 mb-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            disabled={isSending}
            className="w-full resize-none border-none focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400"
            rows={2}
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">
              {caption.length}/500
            </span>
            <span className="text-xs text-gray-500">
              {imageFile.name} • {(imageFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isSending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium"
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Send
            </>
          )}
        </Button>

        {/* Keyboard Hint */}
        <div className="text-center mt-2 text-xs text-white/50">
          Press <kbd className="px-1 py-0.5 bg-white/10 rounded">Esc</kbd> to cancel or{' '}
          <kbd className="px-1 py-0.5 bg-white/10 rounded">Ctrl+Enter</kbd> to send
        </div>
      </div>
    </div>
  )
}
