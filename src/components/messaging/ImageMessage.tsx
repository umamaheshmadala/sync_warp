import React, { useState } from 'react'
import { Loader2, ZoomIn } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ImageMessageProps {
  imageUrl: string
  thumbnailUrl?: string
  alt?: string
  onImageClick?: () => void
}

/**
 * ImageMessage Component
 * 
 * Displays image thumbnails in messages with lazy loading and click-to-expand
 * 
 * Features:
 * - Lazy loading with loading="lazy" attribute
 * - Loading state with spinner
 * - Error state with fallback message
 * - Max height 300px constraint
 * - Hover zoom icon overlay
 * - Click handler to open lightbox
 * 
 * @example
 * ```tsx
 * <ImageMessage
 *   imageUrl="https://example.com/image.jpg"
 *   thumbnailUrl="https://example.com/thumb.jpg"
 *   onImageClick={() => setLightboxOpen(true)}
 * />
 * ```
 */
export function ImageMessage({ 
  imageUrl, 
  thumbnailUrl, 
  alt = 'Shared image', 
  onImageClick 
}: ImageMessageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const displayUrl = thumbnailUrl || imageUrl

  return (
    <div className="relative inline-block max-w-full group">
      {/* Loading State */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg min-h-[100px]">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {hasError ? (
        <div className="flex items-center justify-center bg-gray-100 p-8 rounded-lg min-w-[200px]">
          <p className="text-sm text-gray-500">Failed to load image</p>
        </div>
      ) : (
        <>
          {/* Image */}
          <img
            src={displayUrl}
            alt={alt}
            className={cn(
              "max-w-full h-auto rounded-lg cursor-pointer transition-all duration-300",
              isLoaded ? 'opacity-100' : 'opacity-0',
              onImageClick && 'hover:opacity-90'
            )}
            style={{ maxHeight: '300px' }}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            onClick={onImageClick}
            loading="lazy"
          />

          {/* Zoom Icon Overlay (on hover) */}
          {isLoaded && onImageClick && (
            <div className="absolute top-2 right-2 bg-black/50 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <ZoomIn className="w-4 h-4 text-white" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
