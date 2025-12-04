import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface ShareOptions {
  title: string
  text: string
  url: string
  files?: string[] // For images/videos
}

interface ShareMetadata {
  contentType: 'image' | 'video' | 'link' | 'coupon' | 'deal'
  contentId?: string // couponId or dealId
  messageId?: string
}

/**
 * Share Service
 * 
 * Provides cross-platform sharing functionality using:
 * - Web: Web Share API (with clipboard fallback)
 * - iOS: Native UIActivityViewController
 * - Android: Native Intent.ACTION_SEND
 * 
 * All shares are tracked in the shares table for analytics.
 */
class ShareService {
  /**
   * Share content using native share sheet
   * 📱 Supports Web + iOS + Android
   */
  async share(
    options: ShareOptions,
    metadata: ShareMetadata
  ): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        // MOBILE: Use Capacitor Share plugin
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          files: options.files,
          dialogTitle: 'Share via',
        })
      } else {
        // WEB: Use Web Share API or fallback
        if (this.isWebShareSupported()) {
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url,
          })
        } else {
          // Fallback: Copy to clipboard
          await navigator.clipboard.writeText(options.url)
          toast.success('Link copied to clipboard!')
        }
      }

      // Track share in database
      await this.trackShare(metadata)

      return true
    } catch (error: any) {
      // User cancelled share or error occurred
      if (error.message?.includes('cancel') || error.message?.includes('abort')) {
        console.log('User cancelled share')
        return false
      }

      console.error('❌ Share failed:', error)
      toast.error('Failed to share')
      return false
    }
  }

  /**
   * Share image from message
   */
  async shareImage(imageUrl: string, messageId: string): Promise<boolean> {
    return await this.share(
      {
        title: 'Check out this image!',
        text: 'Shared from SynC',
        url: imageUrl,
        files: [imageUrl],
      },
      {
        contentType: 'image',
        messageId,
      }
    )
  }

  /**
   * Share video from message
   */
  async shareVideo(videoUrl: string, messageId: string): Promise<boolean> {
    return await this.share(
      {
        title: 'Check out this video!',
        text: 'Shared from SynC',
        url: videoUrl,
        files: [videoUrl],
      },
      {
        contentType: 'video',
        messageId,
      }
    )
  }

  /**
   * Share link from message
   */
  async shareLink(
    url: string,
    title: string,
    messageId: string
  ): Promise<boolean> {
    return await this.share(
      {
        title: title || 'Check out this link!',
        text: 'Shared from SynC',
        url,
      },
      {
        contentType: 'link',
        messageId,
      }
    )
  }

  /**
   * Share coupon
   * 🎁 KEY USP: Track coupon shares for viral growth
   */
  async shareCoupon(couponId: string, couponTitle: string): Promise<boolean> {
    const url = `${window.location.origin}/coupons/${couponId}`

    return await this.share(
      {
        title: `🎁 ${couponTitle}`,
        text: 'Check out this amazing coupon on SynC!',
        url,
      },
      {
        contentType: 'coupon',
        contentId: couponId,
      }
    )
  }

  /**
   * Share deal/offer
   * 🏷️ KEY USP: Track deal shares for viral growth
   */
  async shareDeal(dealId: string, dealTitle: string): Promise<boolean> {
    const url = `${window.location.origin}/offers/${dealId}`

    return await this.share(
      {
        title: `🏷️ ${dealTitle}`,
        text: 'Check out this amazing deal on SynC!',
        url,
      },
      {
        contentType: 'deal',
        contentId: dealId,
      }
    )
  }

  /**
   * Track share in database (Epic 8.1 integration)
   */
  private async trackShare(metadata: ShareMetadata): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Insert into shares table (from Epic 8.1)
      const { error } = await supabase.from('shares').insert({
        user_id: user.id,
        content_type: metadata.contentType,
        content_id: metadata.contentId,
        message_id: metadata.messageId,
        platform: Capacitor.getPlatform(), // 'web', 'ios', or 'android'
        shared_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Failed to track share:', error)
      } else {
        console.log('✅ Share tracked:', metadata.contentType)
      }
    } catch (error) {
      console.error('Failed to track share:', error)
    }
  }

  /**
   * Check if Web Share API is supported
   */
  private isWebShareSupported(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator
  }

  /**
   * Check if device can share files
   */
  canShareFiles(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true // iOS and Android support file sharing
    }

    // Web: Check if navigator.share supports files
    return (
      typeof navigator !== 'undefined' &&
      'canShare' in navigator &&
      navigator.canShare?.({ files: [] as any }) === true
    )
  }
}

export const shareService = new ShareService()
