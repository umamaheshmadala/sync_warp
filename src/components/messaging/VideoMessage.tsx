import React, { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { cn } from '../../lib/utils'

interface VideoMessageProps {
  videoUrl: string
  thumbnailUrl?: string
  duration?: number
  onFullscreen?: () => void
}

/**
 * VideoMessage Component
 * 
 * Video player with inline playback and fullscreen support
 * 
 * Features:
 * - Play/pause, seek, mute/unmute, fullscreen controls
 * - Mobile: Haptic feedback on interactions
 * - Mobile: Orientation lock to landscape in fullscreen
 * - Duration badge when not playing
 * - Responsive controls overlay
 * 
 * @example
 * ```tsx
 * <VideoMessage
 *   videoUrl="https://example.com/video.mp4"
 *   thumbnailUrl="https://example.com/thumb.jpg"
 *   duration={120}
 * />
 * ```
 */
export function VideoMessage({ videoUrl, thumbnailUrl, duration, onFullscreen }: VideoMessageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(duration || 0)
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
    if (onFullscreen) {
      if (isMobile) {
        await Haptics.impact({ style: ImpactStyle.Medium })
      }

      // Pause inline video before opening modal
      if (isPlaying && videoRef.current) {
        videoRef.current.pause()
        setIsPlaying(false)
      }

      onFullscreen()
      return
    }

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
          try {
            await ScreenOrientation.unlock()
          } catch (error) {
            console.log('Orientation unlock failed:', error)
          }
        }

        setIsFullscreen(false)
      } else {
        // Enter fullscreen
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen()
        }

        // Lock to landscape on mobile
        if (isMobile) {
          try {
            await ScreenOrientation.lock({ orientation: 'landscape' })
          } catch (error) {
            console.log('Orientation lock failed:', error)
          }
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
          try {
            await ScreenOrientation.lock({ orientation: 'landscape' })
          } catch (error) {
            console.log('Orientation lock failed:', error)
          }
        } else {
          try {
            await ScreenOrientation.unlock()
          } catch (error) {
            console.log('Orientation unlock failed:', error)
          }
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

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
      setIsLoaded(true)
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
      {!isLoaded && !hasError && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 min-h-[200px]">
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
            style={{ maxHeight: '300px' }}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setHasError(true)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
          />

          {/* Video Controls Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}>
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
                max={videoDuration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                style={{
                  background: `linear-gradient(to right, white 0%, white ${(currentTime / (videoDuration || 1)) * 100}%, rgb(75 85 99) ${(currentTime / (videoDuration || 1)) * 100}%, rgb(75 85 99) 100%)`
                }}
              />

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-medium">
                  {formatTime(currentTime)} / {formatTime(videoDuration)}
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
          {!isPlaying && videoDuration > 0 && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
              {formatTime(videoDuration)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
