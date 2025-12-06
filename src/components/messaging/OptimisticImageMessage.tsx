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
  isOwn = true
}: OptimisticImageMessageProps) {
  const imageUrl = status === 'uploaded' && fullResUrl ? fullResUrl : thumbnailUrl

  return (
    <div className="space-y-2">
      {/* Image Container */}
      <div className="relative inline-block max-w-full">
        <img
          src={imageUrl}
          alt="Shared image"
          className={cn(
            "max-w-full h-auto rounded-lg transition-all duration-300",
            status === 'uploading' && "opacity-100", // Keep image visible
            status === 'failed' && "opacity-50 grayscale"
          )}
          style={{ maxHeight: '300px' }}
          loading="lazy"
        />

        {/* Upload Overlay - Transparent with progress */}
        {status === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
            {/* Cancel Button - Top Right */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors z-10"
                aria-label="Cancel upload"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Circular Progress */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                {/* Background Circle */}
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="white"
                    strokeOpacity="0.3"
                    strokeWidth="4"
                    fill="none"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - uploadProgress / 100)}`}
                    className="transition-all duration-300"
                  />
                </svg>

                {/* Percentage Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {uploadProgress}%
                  </span>
                </div>
              </div>

              {/* Uploading Text */}
              <div className="flex items-center gap-1 px-3 py-1 bg-black/60 rounded-full">
                <Loader2 className="w-3 h-3 text-white animate-spin" />
                <span className="text-xs text-white font-medium">Uploading...</span>
              </div>
            </div>
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
      {caption && (
        <p className="whitespace-pre-wrap text-sm">{caption}</p>
      )}
    </div>
  )
}
