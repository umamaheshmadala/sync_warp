import React, { useState, useRef, useEffect } from 'react'
import { Loader2, Play, X, Download, Share2, Save } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Filesystem, Directory } from '@capacitor/filesystem'
import toast from 'react-hot-toast'

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
  const isMobile = Capacitor.isNativePlatform()

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

  const handleSaveVideo = async () => {
    try {
      if (isMobile) {
        // Mobile: Save to device storage
        await Haptics.impact({ style: ImpactStyle.Light })

        const response = await fetch(videoUrl)
        const blob = await response.blob()
        const reader = new FileReader()

        reader.onloadend = async () => {
          const base64 = reader.result as string
          const base64Data = base64.split(',')[1]

          await Filesystem.writeFile({
            path: `sync-video-${Date.now()}.mp4`,
            data: base64Data,
            directory: Directory.Documents
          })

          toast.success('Video saved to device')
        }

        reader.readAsDataURL(blob)
      } else {
        // Web: Traditional download
        const response = await fetch(videoUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `video-${Date.now()}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Video downloaded')
      }
    } catch (error) {
      console.error('Save/download failed:', error)
      toast.error('Failed to save video')
    }
  }

  const handleShareVideo = async () => {
    try {
      if (isMobile) {
        await Haptics.impact({ style: ImpactStyle.Light })
      }

      // Use shareService for cross-platform sharing with tracking
      const { shareService } = await import('../../services/shareService')
      await shareService.shareVideo(videoUrl, 'video-player-share')
    } catch (error) {
      console.log('Share cancelled or failed:', error)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar Actions - Fixed to viewport to ensure visibility regardless of video size */}
      <div
        className="fixed top-4 right-4 z-[70] flex items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Share Button */}
        {(isMobile || navigator.share) && (
          <button
            onClick={handleShareVideo}
            className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/10"
            aria-label="Share"
            title="Share"
          >
            <Share2 className="w-6 h-6" />
          </button>
        )}

        {/* Download Button */}
        <button
          onClick={handleSaveVideo}
          className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/10"
          aria-label={isMobile ? "Save video" : "Download"}
          title={isMobile ? "Save video" : "Download"}
        >
          {isMobile ? (
            <Save className="w-6 h-6" />
          ) : (
            <Download className="w-6 h-6" />
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/10"
          aria-label="Close video"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Video container - Removing aspect-video to allow natural aspect ratio, especialy for vertical videos */}
      <div
        className="relative w-full max-w-5xl h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              {/* Circular progress */}
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="white"
                    strokeOpacity="0.2"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - loadProgress / 100)}`}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {loadProgress}%
                  </span>
                </div>
              </div>
              <span className="text-white/80 text-sm font-medium animate-pulse">
                Loading video...
              </span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center p-6 bg-zinc-900 rounded-xl border border-white/10">
              <p className="text-red-400 text-lg font-medium mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="Close error"
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
          playsInline
          className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg"
        />
      </div>
    </div>,
    document.body
  )
}
