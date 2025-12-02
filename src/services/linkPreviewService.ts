// src/services/linkPreviewService.ts
import { supabase } from '../lib/supabase'

import { LinkPreview } from '../types/messaging'
export type { LinkPreview }

class LinkPreviewService {
  private readonly URL_REGEX = /(https?:\/\/[^\s]+)/g
  private readonly SYNC_COUPON_REGEX = /https?:\/\/(localhost:5173|sync\.app)\/coupons\/([a-zA-Z0-9-]+)/
  private readonly SYNC_DEAL_REGEX = /https?:\/\/(localhost:5173|sync\.app)\/offers\/([a-zA-Z0-9-]+)/

  /**
   * Extract URLs from message content
   */
  extractUrls(text: string): string[] {
    const matches = text.match(this.URL_REGEX)
    return matches ? Array.from(new Set(matches)) : []
  }

  /**
   * Detect if URL is a SynC coupon/deal
   */
  private detectSyncUrl(url: string): { type: 'sync-coupon' | 'sync-deal' | null; id: string | null } {
    let match = url.match(this.SYNC_COUPON_REGEX)
    if (match) return { type: 'sync-coupon', id: match[2] }

    match = url.match(this.SYNC_DEAL_REGEX)
    if (match) return { type: 'sync-deal', id: match[2] }

    return { type: null, id: null }
  }

  /**
   * Fetch SynC coupon preview data
   */
  private async fetchSyncCouponPreview(couponId: string): Promise<LinkPreview | null> {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('id, title, description, discount_value, discount_type, brand:brands(name, logo_url)')
        .eq('id', couponId)
        .single()

      if (error || !data) return null

      // Handle brand relation (Supabase returns array)
      const brand = (data as any).brand?.[0] || (data as any).brand

      const discountText = data.discount_type === 'percentage' 
        ? `${data.discount_value}% off`
        : `$${data.discount_value} off`

      return {
        url: `${window.location.origin}/coupons/${couponId}`,
        title: data.title,
        description: data.description || discountText,
        image: brand?.logo_url,
        type: 'sync-coupon',
        metadata: {
          discountValue: data.discount_value,
          discountType: data.discount_type,
          brandName: brand?.name
        }
      }
    } catch (error) {
      console.error('Failed to fetch coupon preview:', error)
      return null
    }
  }

  /**
   * Fetch SynC deal preview data
   */
  private async fetchSyncDealPreview(dealId: string): Promise<LinkPreview | null> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('id, title, description, image_url, price, original_price, brand:brands(name, logo_url)')
        .eq('id', dealId)
        .single()

      if (error || !data) return null

      // Handle brand relation (Supabase returns array)
      const brand = (data as any).brand?.[0] || (data as any).brand

      const savings = data.original_price && data.price 
        ? data.original_price - data.price 
        : 0

      return {
        url: `${window.location.origin}/offers/${dealId}`,
        title: data.title,
        description: data.description || `Save $${savings.toFixed(2)}`,
        image: data.image_url || brand?.logo_url,
        type: 'sync-deal',
        metadata: {
          price: data.price,
          originalPrice: data.original_price,
          savings,
          brandName: brand?.name
        }
      }
    } catch (error) {
      console.error('Failed to fetch deal preview:', error)
      return null
    }
  }

  /**
   * Fetch Open Graph metadata for generic URL using Supabase Edge Function
   */
  private async fetchOpenGraphPreview(url: string): Promise<LinkPreview | null> {
    try {
      console.log('🔍 Fetching Open Graph preview for:', url)
      
      // Call Supabase Edge Function for Open Graph fetching
      const { data, error } = await supabase.functions.invoke('link-preview', {
        body: { url }
      })

      console.log('📦 Edge Function response:', { data, error })

      if (error) {
        console.error('❌ Edge Function error:', error)
        throw error
      }

      if (data && data.title) {
        console.log('✅ Successfully fetched Open Graph data:', data)
        return {
          url,
          title: data.title,
          description: data.description || '',
          image: data.image,
          favicon: data.favicon,
          type: 'generic'
        }
      }

      // Fallback if no data returned
      console.warn('⚠️ No metadata returned from Edge Function')
      throw new Error('No metadata returned')
    } catch (error) {
      console.error('❌ Failed to fetch Open Graph preview:', error)
      
      // Fallback: use hostname as title with favicon
      try {
        const hostname = new URL(url).hostname
        console.log('🔄 Using hostname fallback:', hostname)
        return {
          url,
          title: hostname,
          description: '',
          type: 'generic',
          favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
        }
      } catch {
        return null
      }
    }
  }

  /**
   * Generate link preview
   */
  async generatePreview(url: string): Promise<LinkPreview | null> {
    // Check if it's a SynC URL
    const syncDetection = this.detectSyncUrl(url)

    if (syncDetection.type === 'sync-coupon' && syncDetection.id) {
      return this.fetchSyncCouponPreview(syncDetection.id)
    }

    if (syncDetection.type === 'sync-deal' && syncDetection.id) {
      return this.fetchSyncDealPreview(syncDetection.id)
    }

    // Generic URL - fetch Open Graph data
    return this.fetchOpenGraphPreview(url)
  }

  /**
   * Generate previews for all URLs in text
   */
  async generatePreviews(text: string): Promise<LinkPreview[]> {
    const urls = this.extractUrls(text)
    
    // Limit to first 3 URLs to avoid performance issues
    const urlsToPreview = urls.slice(0, 3)

    const previews = await Promise.allSettled(
      urlsToPreview.map(url => this.generatePreview(url))
    )

    return previews
      .filter((result): result is PromiseFulfilledResult<LinkPreview | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as LinkPreview)
  }
}

export const linkPreviewService = new LinkPreviewService()
