import React from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface OptimisticImageMessageProps {
  thumbnailUrl: string
  fullResUrl?: string
  uploadProgress: number
  status: 'uploading' | 'uploaded' | 'failed'
  onCancel?: () => void
  onRetry?: () => void
  caption?: string
  isOwn?: boolean
  hideCaption?: boolean
  className?: string
}

/**
 * OptimisticImageMessage Component
 * 
 * Displays image optimistically (before upload completes)
 * 
 * Features:
 * - Shows image immediately
 * - Transparent overlay during upload
 * - Progress indicator
 * - Cancel button (X) on top-right
 * - Smooth transition to full-res
 */
export function OptimisticImageMessage({
  thumbnailUrl,
  fullResUrl,
  uploadProgress,
  status,
  onCancel,
  onRetry,
  caption,
  isOwn = true,
  hideCaption = false,
  className
}: OptimisticImageMessageProps) {
  const imageUrl = status === 'uploaded' && fullResUrl ? fullResUrl : thumbnailUrl
  const isGridItem = hideCaption // Heuristic: if caption is hidden, it's likely a grid item

  return (
    <div className={cn("space-y-2", isGridItem && "h-full w-full space-y-0", className)}>
      {/* Image Container - with overflow hidden to contain progress indicator */}
      <div className={cn(
        "relative inline-block overflow-hidden rounded-lg",
        isGridItem ? "w-full h-full" : "max-w-full min-w-[120px]"
      )}>
        <img
          src={imageUrl}
          alt="Shared image"
          className={cn(
            "transition-all duration-300",
            status === 'uploading' && "opacity-100", // Keep image visible
            status === 'failed' && "opacity-50 grayscale",
            isGridItem ? "w-full h-full object-cover" : "max-w-full w-auto h-auto block"
          )}
          style={isGridItem ? {} : { maxHeight: '300px', minHeight: '80px', minWidth: '120px', objectFit: 'cover' }}
          loading="lazy"
        />

        {/* Upload Overlay - WhatsApp Style */}
        {status === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
            {/* Circular Progress with Cancel Button */}
            <button
              onClick={onCancel}
              className="relative w-14 h-14 flex items-center justify-center"
              aria-label="Cancel upload"
            >
              {/* Background Circle */}
              <svg className="absolute w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Progress Arc */}
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="white"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - uploadProgress / 100)}`}
                  className="transition-all duration-150 ease-out"
                />
              </svg>

              {/* Cancel X Icon in Center */}
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md z-10">
                <X className="w-5 h-5 text-gray-700" />
              </div>
            </button>
          </div>
        )}

        {/* Failed Overlay */}
        {status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg">
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                <X className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Upload failed</span>

              {/* Retry Button */}
              {onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRetry()
                  }}
                  className="mt-1 px-3 py-1.5 bg-white text-red-600 rounded-full text-xs font-bold shadow-sm hover:bg-gray-100 transition-colors flex items-center gap-1"
                >
                  <Loader2 className="w-3 h-3" />
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Caption */}
      {!hideCaption && caption && (
        <p className="whitespace-pre-wrap text-sm">{caption}</p>
      )}
    </div>
  )
}
