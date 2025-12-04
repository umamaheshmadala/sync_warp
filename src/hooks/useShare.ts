import { useState, useCallback } from 'react'
import { shareService } from '../services/shareService'

/**
 * Custom hook for sharing content
 * 
 * Provides easy-to-use share methods with loading state management
 * 
 * @example
 * ```tsx
 * const { shareImage, isSharing } = useShare()
 * 
 * <button onClick={() => shareImage(url, messageId)} disabled={isSharing}>
 *   Share Image
 * </button>
 * ```
 */
export function useShare() {
  const [isSharing, setIsSharing] = useState(false)

  const shareImage = useCallback(
    async (imageUrl: string, messageId: string) => {
      setIsSharing(true)
      try {
        return await shareService.shareImage(imageUrl, messageId)
      } finally {
        setIsSharing(false)
      }
    },
    []
  )

  const shareVideo = useCallback(
    async (videoUrl: string, messageId: string) => {
      setIsSharing(true)
      try {
        return await shareService.shareVideo(videoUrl, messageId)
      } finally {
        setIsSharing(false)
      }
    },
    []
  )

  const shareLink = useCallback(
    async (url: string, title: string, messageId: string) => {
      setIsSharing(true)
      try {
        return await shareService.shareLink(url, title, messageId)
      } finally {
        setIsSharing(false)
      }
    },
    []
  )

  const shareCoupon = useCallback(
    async (couponId: string, couponTitle: string) => {
      setIsSharing(true)
      try {
        return await shareService.shareCoupon(couponId, couponTitle)
      } finally {
        setIsSharing(false)
      }
    },
    []
  )

  const shareDeal = useCallback(async (dealId: string, dealTitle: string) => {
    setIsSharing(true)
    try {
      return await shareService.shareDeal(dealId, dealTitle)
    } finally {
      setIsSharing(false)
    }
  }, [])

  return {
    isSharing,
    shareImage,
    shareVideo,
    shareLink,
    shareCoupon,
    shareDeal,
    canShareFiles: shareService.canShareFiles(),
  }
}
