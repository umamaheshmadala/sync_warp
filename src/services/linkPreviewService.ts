// src/services/linkPreviewService.ts
import { supabase } from '../lib/supabase'

import { LinkPreview } from '../types/messaging'
export type { LinkPreview }

class LinkPreviewService {
  private readonly URL_REGEX = /(https?:\/\/[^\s]+)/g

  /**
   * Extract URLs from message content
   */
  extractUrls(text: string): string[] {
    const matches = text.match(this.URL_REGEX)
    return matches ? Array.from(new Set(matches)) : []
  }

  /**
   * Detect if URL is a SynC entity
   */
  private detectSyncUrl(url: string): {
    type: LinkPreview['type'] | null;
    id: string | null;
    slug?: string
  } {
    try {
      const urlObj = new URL(url)
      // Check for supported domains (localhost, sync.app, netlify deployment)
      if (!urlObj.hostname.match(/(localhost|sync\.app|netlify\.app)/)) {
        return { type: null, id: null }
      }

      const path = urlObj.pathname

      // Storefront: /business/:slug
      const storefrontMatch = path.match(/^\/business\/([^/]+)$/)
      if (storefrontMatch) return { type: 'sync-storefront', id: null, slug: storefrontMatch[1] }

      // Product: /business/:slug/product/:id
      const productMatch = path.match(/\/product\/([^/]+)/)
      if (productMatch) return { type: 'sync-product', id: productMatch[1] }

      // Offer: /business/:slug/offers?offerId=:id OR /offers/:id
      // Check for deep link format first
      const offerDeepLinkMatch = path.match(/\/business\/([^/]+)\/offers\?.*offerId=([^&]+)/)
      if (offerDeepLinkMatch) {
        return { type: 'sync-offer', id: offerDeepLinkMatch[2], slug: offerDeepLinkMatch[1] }
      }

      const offerMatch = path.match(/\/offer\/([^/]+)/) || path.match(/^\/offers\/([^/]+)/)
      if (offerMatch) return { type: 'sync-offer', id: offerMatch[1] }

      // Profile: /profile/:id
      const profileMatch = path.match(/^\/profile\/([^/]+)/)
      if (profileMatch) return { type: 'sync-profile', id: profileMatch[1] }

      // Legacy Coupons
      const couponMatch = path.match(/^\/coupons\/([^/]+)/)
      if (couponMatch) return { type: 'sync-coupon', id: couponMatch[1] }

      return { type: null, id: null }
    } catch {
      return { type: null, id: null }
    }
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
          couponId: data.id,
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
          offerId: data.id,
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
   * Fetch SynC storefront preview
   */
  private async fetchSyncStorefrontPreview(slug: string): Promise<LinkPreview | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, tagline, logo_url, slug')
        .eq('slug', slug)
        .single()

      if (error || !data) return null

      return {
        url: `${window.location.origin}/business/${data.slug}`,
        title: data.name,
        description: data.tagline || data.description?.substring(0, 100) || '',
        image: data.logo_url,
        type: 'sync-storefront',
        metadata: {
          entityType: 'storefront',
          entityId: data.id,
          businessId: data.id,
          businessSlug: data.slug,
          businessLogo: data.logo_url
        }
      }
    } catch { return null }
  }

  /**
   * Fetch SynC product preview
   */
  private async fetchSyncProductPreview(productId: string): Promise<LinkPreview | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, currency, image_url, business:businesses(name, slug)')
        .eq('id', productId)
        .single()

      if (error || !data) return null

      const business = (data as any).business?.[0] || (data as any).business

      return {
        url: `${window.location.origin}/business/${business?.slug}/product/${data.id}`,
        title: data.name,
        description: `${data.currency} ${data.price} - ${data.description?.substring(0, 50)}`,
        image: data.image_url,
        type: 'sync-product',
        metadata: {
          entityType: 'product',
          entityId: data.id,
          productId: data.id,
          price: data.price,
          currency: data.currency,
          businessName: business?.name,
          businessSlug: business?.slug
        }
      }
    } catch { return null }
  }

  /**
   * Fetch SynC offer preview
   */
  private async fetchSyncOfferPreview(offerId: string, slug?: string): Promise<LinkPreview | null> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id, 
          title, 
          description, 
          image_url, 
          discount_value, 
          valid_until, 
          offer_code,
          status,
          audit_code,
          business:businesses(name, logo_url, slug),
          offer_type:offer_types(name, category:offer_categories(name))
        `)
        .eq('id', offerId)
        .single()

      if (error || !data) return null

      // Handle relations
      const business = (data as any).business?.[0] || (data as any).business
      const offerType = (data as any).offer_type?.[0] || (data as any).offer_type
      const categoryName = offerType?.category?.name

      // Construct URL pointing to business offers tab with query param
      // Use provided slug if available, otherwise try to use business slug or fallback
      const targetSlug = slug || business?.slug;

      const targetUrl = targetSlug
        ? `${window.location.origin}/business/${targetSlug}/offers?offerId=${data.id}`
        : `${window.location.origin}/offers/${data.id}`;

      return {
        url: targetUrl,
        title: data.title,
        description: `${data.discount_value}% OFF - Expires ${data.valid_until ? new Date(data.valid_until).toLocaleDateString() : 'soon'}`,
        image: data.image_url || business?.logo_url,
        type: 'sync-offer',
        metadata: {
          entityType: 'offer',
          entityId: data.id,
          offerId: data.id,
          discountValue: data.discount_value,
          validUntil: data.valid_until,
          businessName: business?.name,
          // Extra props for TicketOfferCard
          offerCode: data.offer_code,
          status: data.status,
          auditCode: data.audit_code,
          offerTypeName: offerType?.name,
          categoryName: categoryName
        }
      }
    } catch { return null }
  }


  /**
   * Fetch SynC profile preview
   */
  private async fetchSyncProfilePreview(userId: string): Promise<LinkPreview | null> {
    try {
      // 1. Check privacy settings
      const { data: privacy } = await supabase
        .from('privacy_settings')
        .select('profile_visibility')
        .eq('user_id', userId)
        .single()

      const isPrivate = privacy?.profile_visibility === 'private'

      // 2. Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single()

      if (!profile) return null

      return {
        url: `${window.location.origin}/profile/${profile.id}`,
        title: isPrivate ? 'SynC User' : (profile.full_name || 'SynC User'),
        description: isPrivate ? 'Private Profile' : 'Connect on SynC',
        image: isPrivate ? undefined : profile.avatar_url,
        type: 'sync-profile',
        metadata: {
          entityType: 'profile',
          entityId: profile.id,
          userId: profile.id,
          isPrivate
        }
      }
    } catch { return null }
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
    const { type, id, slug } = this.detectSyncUrl(url)

    if (type === 'sync-storefront' && slug) {
      return this.fetchSyncStorefrontPreview(slug)
    }
    if (type === 'sync-product' && id) {
      return this.fetchSyncProductPreview(id)
    }
    if (type === 'sync-offer' && id) {
      return this.fetchSyncOfferPreview(id, slug)
    }
    if (type === 'sync-profile' && id) {
      return this.fetchSyncProfilePreview(id)
    }
    if (type === 'sync-coupon' && id) {
      return this.fetchSyncCouponPreview(id)
    }
    if (type === 'sync-deal' && id) {
      return this.fetchSyncDealPreview(id)
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
