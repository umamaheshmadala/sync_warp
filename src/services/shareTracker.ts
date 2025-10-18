// src/services/shareTracker.ts
// Service for tracking and analyzing social share events
// Story 4.9 - Social Sharing Actions

import { supabase } from '@/lib/supabase';

export interface ShareEvent {
  type: 'storefront' | 'product' | 'offer' | 'coupon';
  entity_id: string;
  method: 'web_share' | 'copy' | 'whatsapp' | 'facebook' | 'twitter' | 'email';
  metadata?: Record<string, any>;
}

export interface ShareStats {
  total: number;
  methods: Record<string, number>;
  recent: Array<{
    id: string;
    created_at: string;
    method: string;
  }>;
}

/**
 * Track a share event in the database
 * 
 * @param event - Share event details
 * @returns Share ID or null on error
 * 
 * @example
 * ```ts
 * const shareId = await trackShare({
 *   type: 'storefront',
 *   entity_id: 'business-uuid',
 *   method: 'web_share',
 *   metadata: { business_name: 'Joe\'s Pizza' }
 * });
 * ```
 */
export async function trackShare(event: ShareEvent): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.rpc('track_share', {
      p_user_id: user?.id || null,
      p_type: event.type,
      p_entity_id: event.entity_id,
      p_method: event.method
    });

    if (error) {
      console.error('Failed to track share:', error);
      return null;
    }
    
    // Optional: Track in analytics if available
    if (typeof window !== 'undefined' && (window as any).analytics) {
      try {
        (window as any).analytics.track('Share Success', {
          type: event.type,
          entity_id: event.entity_id,
          method: event.method,
          ...event.metadata
        });
      } catch (analyticsError) {
        // Analytics failure shouldn't break the share tracking
        console.warn('Analytics tracking failed:', analyticsError);
      }
    }
    
    return data as string;
  } catch (err) {
    console.error('Error tracking share:', err);
    return null;
  }
}

/**
 * Get share statistics for an entity
 * 
 * @param entityId - Entity ID to get stats for
 * @param type - Type of entity (storefront, product, offer, coupon)
 * @returns Share statistics including total count, method breakdown, and recent shares
 * 
 * @example
 * ```ts
 * const stats = await getShareStats('business-uuid', 'storefront');
 * console.log(`Total shares: ${stats.total}`);
 * console.log(`Shared via native: ${stats.methods.web_share || 0}`);
 * ```
 */
export async function getShareStats(
  entityId: string,
  type: string
): Promise<ShareStats> {
  try {
    const { data, error, count } = await supabase
      .from('shares')
      .select('id, method, created_at', { count: 'exact' })
      .eq('entity_id', entityId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to fetch share stats:', error);
      return { total: 0, methods: {}, recent: [] };
    }

    // Count shares by method
    const methods: Record<string, number> = {};
    (data || []).forEach(share => {
      methods[share.method] = (methods[share.method] || 0) + 1;
    });

    return {
      total: count || 0,
      methods,
      recent: (data || []).map(s => ({
        id: s.id,
        created_at: s.created_at,
        method: s.method
      }))
    };
  } catch (err) {
    console.error('Error fetching share stats:', err);
    return { total: 0, methods: {}, recent: [] };
  }
}

/**
 * Build UTM-tagged URL for share tracking
 * 
 * @param url - Base URL to add UTM parameters to
 * @param source - UTM source (default: 'share_button')
 * @param medium - UTM medium (default: 'social')
 * @param campaign - UTM campaign (optional, e.g., 'storefront', 'product')
 * @returns URL with UTM parameters appended
 * 
 * @example
 * ```ts
 * const url = buildUtmUrl(
 *   'https://sync.com/business/123',
 *   'share_button',
 *   'native',
 *   'storefront'
 * );
 * // Returns: https://sync.com/business/123?utm_source=share_button&utm_medium=native&utm_campaign=storefront
 * ```
 */
export function buildUtmUrl(
  url: string,
  source: string = 'share_button',
  medium: string = 'social',
  campaign?: string
): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    urlObj.searchParams.set('utm_source', source);
    urlObj.searchParams.set('utm_medium', medium);
    
    if (campaign) {
      urlObj.searchParams.set('utm_campaign', campaign);
    }
    
    return urlObj.toString();
  } catch (err) {
    console.error('Error building UTM URL:', err);
    // Return original URL if something goes wrong
    return url;
  }
}

/**
 * Get total share count for an entity (lightweight query)
 * 
 * @param entityId - Entity ID
 * @param type - Entity type
 * @returns Total share count
 * 
 * @example
 * ```ts
 * const count = await getShareCount('business-uuid', 'storefront');
 * // Returns: 42
 * ```
 */
export async function getShareCount(
  entityId: string,
  type: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('shares')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('type', type);

    if (error) {
      console.error('Failed to fetch share count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error fetching share count:', err);
    return 0;
  }
}
