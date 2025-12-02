import React from 'react'
import { Loader2, X, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface OptimisticVideoMessageProps {
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
 * OptimisticVideoMessage Component
 * 
 * Displays video optimistically (before upload completes)
 * 
 * Features:
 * - Shows video thumbnail immediately
 * - Transparent overlay during upload
 * - Progress indicator
 * - Cancel button (X) on top-right
 * - Play button overlay when uploaded
 * - Retry button for failed uploads
 */
export function OptimisticVideoMessage({
  thumbnailUrl,
  fullResUrl,
  uploadProgress,
  status,
  onCancel,
  onRetry,
  caption,
  isOwn = true
}: OptimisticVideoMessageProps) {
  const videoUrl = status === 'uploaded' && fullResUrl ? fullResUrl : thumbnailUrl

  return (
    <div className="space-y-2">
      {/* Video Container */}
      <div className="relative inline-block max-w-full">
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className={cn(
            "max-w-full h-auto rounded-lg transition-all duration-300",
            status === 'uploading' && "opacity-100", // Keep thumbnail visible
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
                  <span className="text-white text-sm font-semibold">
                    {uploadProgress}%
                  </span>
                </div>
              </div>
              <span className="text-white text-xs font-medium">
                Uploading video...
              </span>
            </div>
          </div>
        )}

        {/* Failed Overlay */}
        {status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                <X className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Upload failed</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-white/90 hover:bg-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm font-medium">Retry</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Play Button Overlay (when uploaded) */}
        {status === 'uploaded' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <p className="whitespace-pre-wrap text-sm mt-2">{caption}</p>
      )}
    </div>
  )
}
