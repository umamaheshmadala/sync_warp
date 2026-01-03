import React, { useState, useRef, useEffect } from 'react'
import { Loader2, Play, X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface VideoPlayerProps {
  videoUrl: string
  thumbnailUrl: string
  onClose: () => void
}

export function VideoPlayer({ videoUrl, thumbnailUrl, onClose }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Track video loading progress
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const duration = video.duration
        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100
          setLoadProgress(Math.round(progress))
        }
      }
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      setLoadProgress(100)
    }

    const handleError = () => {
      setIsLoading(false)
      setError('Failed to load video')
    }

    video.addEventListener('progress', handleProgress)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Close video"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Video container */}
      <div 
        className="relative max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg z-10">
            <div className="flex flex-col items-center gap-3">
              {/* Circular progress */}
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="white"
                    strokeOpacity="0.3"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - loadProgress / 100)}`}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {loadProgress}%
                  </span>
                </div>
              </div>
              <span className="text-white text-sm font-medium">
                Loading video...
              </span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-10">
            <div className="text-center">
              <p className="text-white text-lg font-medium">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          controls
          autoPlay
          className="w-full h-auto rounded-lg shadow-2xl"
          style={{ maxHeight: '80vh' }}
        />
      </div>
    </div>,
    document.body
  )
}
