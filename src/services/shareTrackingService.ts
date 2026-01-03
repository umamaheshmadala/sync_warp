// src/services/shareTrackingService.ts
// Enhanced share tracking service with messaging integration and native share sheet support
// Story 8.3.4 - Coupon/Deal Sharing Integration

import { supabase } from '@/lib/supabase';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { trackShare as trackShareBase, getShareCount as getShareCountBase, type ShareEvent } from './shareTracker';

export type ShareableType = 'coupon' | 'offer' | 'product' | 'storefront';
export type SharePlatform = 'web' | 'ios' | 'android';
export type ShareMethod = 'message' | 'share_sheet' | 'link' | 'web_share' | 'copy' | 'whatsapp' | 'facebook' | 'twitter' | 'email';

export interface ShareTrackingEvent {
  shareableType: ShareableType;
  shareableId: string;
  conversationId?: string;
  sharedWithUserId?: string;
  sharePlatform?: SharePlatform;
  shareMethod?: ShareMethod;
  metadata?: Record<string, any>;
}

export interface ShareableContent {
  type: ShareableType;
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
}

class ShareTrackingService {
  /**
   * Detect current platform
   */
  private detectPlatform(): SharePlatform {
    if (!Capacitor.isNativePlatform()) return 'web';
    
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
    return 'web';
  }

  /**
   * Track a coupon/deal share event with messaging integration
   */
  async trackShare(event: ShareTrackingEvent): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('User not authenticated, tracking anonymous share');
      }

      // Auto-detect platform if not provided
      const platform: SharePlatform = event.sharePlatform || this.detectPlatform();
      const method: ShareMethod = event.shareMethod || 'message';

      // Insert share record with new columns
      const { error: insertError } = await supabase
        .from('shares')
        .insert({
          user_id: user?.id || null,
          type: event.shareableType,
          entity_id: event.shareableId,
          share_platform: platform,
          share_method: method,
          conversation_id: event.conversationId || null,
          shared_with_user_id: event.sharedWithUserId || null,
          metadata: event.metadata || {}
        });

      if (insertError) {
        console.error('Failed to track share:', insertError);
        return;
      }

      console.log('✅ Share tracked:', { ...event, platform, method });
    } catch (error) {
      console.error('❌ Error tracking share:', error);
      // Don't throw - share tracking is non-critical
    }
  }

  /**
   * Get share count for a coupon/deal
   */
  async getShareCount(shareableType: ShareableType, shareableId: string): Promise<number> {
    return getShareCountBase(shareableId, shareableType);
  }

  /**
   * Get most shared coupons using RPC function
   */
  async getMostSharedCoupons(limit: number = 10): Promise<Array<{
    coupon_id: string;
    share_count: number;
    title: string;
    discount_value: number;
    discount_type: string;
    brand_name: string;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_most_shared_coupons', { limit_count: limit });

      if (error) {
        console.error('Failed to get most shared coupons:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching most shared coupons:', error);
      return [];
    }
  }

  /**
   * Get most shared deals using RPC function
   */
  async getMostSharedDeals(limit: number = 10): Promise<Array<{
    offer_id: string;
    share_count: number;
    title: string;
    price: number;
    original_price: number;
    brand_name: string;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_most_shared_deals', { limit_count: limit });

      if (error) {
        console.error('Failed to get most shared deals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching most shared deals:', error);
      return [];
    }
  }

  /**
   * Get user's share history
   */
  async getUserShareHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select(`
          *,
          coupon:coupons(id, title),
          offer:offers(id, title),
          conversation:conversations(id, title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get share history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching share history:', error);
      return [];
    }
  }

  /**
   * Get share analytics by platform
   */
  async getShareAnalyticsByPlatform(entityType?: ShareableType, daysBack: number = 30): Promise<Array<{
    share_platform: string;
    share_count: number;
    percentage: number;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_share_analytics_by_platform', {
          p_entity_type: entityType || null,
          p_days_back: daysBack
        });

      if (error) {
        console.error('Failed to get platform analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      return [];
    }
  }

  /**
   * Get share analytics by method
   */
  async getShareAnalyticsByMethod(entityType?: ShareableType, daysBack: number = 30): Promise<Array<{
    share_method: string;
    share_count: number;
    percentage: number;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_share_analytics_by_method', {
          p_entity_type: entityType || null,
          p_days_back: daysBack
        });

      if (error) {
        console.error('Failed to get method analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching method analytics:', error);
      return [];
    }
  }

  /**
   * Share coupon/deal via native share sheet (mobile) or Web Share API
   * Automatically tracks share event in database
   */
  async shareViaShareSheet(shareable: ShareableContent): Promise<boolean> {
    try {
      const url = `https://sync.app/${shareable.type === 'coupon' ? 'coupons' : shareable.type === 'offer' ? 'offers' : shareable.type}/${shareable.id}`;
      
      if (Capacitor.isNativePlatform()) {
        // Mobile: Trigger haptic feedback
        try {
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch (hapticError) {
          console.warn('Haptic feedback failed:', hapticError);
        }
        
        // Mobile: Native share sheet
        const result = await Share.share({
          title: shareable.title,
          text: shareable.description || `Check out this ${shareable.type} on SynC!`,
          url,
          dialogTitle: `Share ${shareable.type === 'coupon' ? 'Coupon' : shareable.type === 'offer' ? 'Deal' : 'Item'}`
        });
        
        // Track the share
        await this.trackShare({
          shareableType: shareable.type,
          shareableId: shareable.id,
          shareMethod: 'share_sheet',
          metadata: {
            title: shareable.title,
            hasImage: !!shareable.imageUrl
          }
        });
        
        const platform = this.detectPlatform();
        console.log(`📱 ${platform} share sheet opened`);
        
        return true;
      } else {
        // Web: Use Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: shareable.title,
            text: shareable.description,
            url
          });
          
          // Track the share
          await this.trackShare({
            shareableType: shareable.type,
            shareableId: shareable.id,
            shareMethod: 'web_share',
            metadata: {
              title: shareable.title
            }
          });
          
          return true;
        } else {
          // Fallback: Copy link to clipboard
          await navigator.clipboard.writeText(url);
          
          // Track the share
          await this.trackShare({
            shareableType: shareable.type,
            shareableId: shareable.id,
            shareMethod: 'copy',
            metadata: {
              title: shareable.title,
              fallback: true
            }
          });
          
          console.log('📋 Link copied to clipboard (Web fallback)');
          return true;
        }
      }
    } catch (error) {
      // User cancelled share or error occurred
      console.log('Share cancelled or failed:', error);
      return false;
    }
  }
}

export const shareTrackingService = new ShareTrackingService();
export default shareTrackingService;
