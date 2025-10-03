// couponStatsService.ts
// Service to verify and fix coupon statistics
// Ensures usage_count and collection_count are accurate

import { supabase } from '../lib/supabase';

export interface CouponStatsDiscrepancy {
  coupon_id: string;
  coupon_title: string; // VARCHAR(100) from database
  old_usage_count: number;
  new_usage_count: number;
  old_collection_count: number;
  new_collection_count: number;
  usage_diff: number;
  collection_diff: number;
}

export interface FixStatsResult {
  success: boolean;
  fixed_count: number;
  message: string;
}

class CouponStatsService {
  /**
   * Verify coupon statistics and identify any discrepancies
   * Returns a list of coupons with incorrect stats
   */
  async verifyStats(businessId?: string): Promise<CouponStatsDiscrepancy[]> {
    try {
      console.log('🔍 [CouponStats] Verifying coupon statistics...');
      
      const { data, error } = await supabase
        .rpc('recalculate_coupon_stats');

      if (error) {
        console.error('❌ [CouponStats] Error verifying stats:', error);
        throw error;
      }

      // Filter by business if provided
      let discrepancies = data || [];
      if (businessId) {
        // Get coupons for this business
        const { data: businessCoupons } = await supabase
          .from('business_coupons')
          .select('id')
          .eq('business_id', businessId);
        
        const businessCouponIds = new Set(businessCoupons?.map(c => c.id) || []);
        discrepancies = discrepancies.filter((d: CouponStatsDiscrepancy) => 
          businessCouponIds.has(d.coupon_id)
        );
      }

      console.log(`📊 [CouponStats] Found ${discrepancies.length} discrepancies`);
      
      if (discrepancies.length > 0) {
        console.table(discrepancies);
      }

      return discrepancies;
    } catch (error) {
      console.error('❌ [CouponStats] Failed to verify stats:', error);
      return [];
    }
  }

  /**
   * Fix all coupon statistics by recalculating from actual data
   */
  async fixStats(): Promise<FixStatsResult> {
    try {
      console.log('🔧 [CouponStats] Fixing coupon statistics...');
      
      const { data, error } = await supabase
        .rpc('fix_coupon_stats');

      if (error) {
        console.error('❌ [CouponStats] Error fixing stats:', error);
        throw error;
      }

      const result = data as FixStatsResult;
      console.log(`✅ [CouponStats] ${result.message}`);
      
      return result;
    } catch (error) {
      console.error('❌ [CouponStats] Failed to fix stats:', error);
      return {
        success: false,
        fixed_count: 0,
        message: 'Failed to fix statistics: ' + (error as Error).message
      };
    }
  }

  /**
   * Get accurate stats for a specific coupon
   */
  async getCouponStats(couponId: string) {
    try {
      const { data: redemptions } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', couponId)
        .eq('status', 'completed');

      const { data: collections } = await supabase
        .from('user_coupon_collections')
        .select('id')
        .eq('coupon_id', couponId);

      return {
        usage_count: redemptions?.length || 0,
        collection_count: collections?.length || 0
      };
    } catch (error) {
      console.error('❌ [CouponStats] Failed to get coupon stats:', error);
      return { usage_count: 0, collection_count: 0 };
    }
  }

  /**
   * Manually update a coupon's stats (use with caution)
   */
  async updateCouponStats(
    couponId: string, 
    usageCount: number, 
    collectionCount: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('business_coupons')
        .update({
          usage_count: usageCount,
          collection_count: collectionCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', couponId);

      if (error) throw error;

      console.log(`✅ [CouponStats] Updated stats for coupon ${couponId}`);
      return true;
    } catch (error) {
      console.error('❌ [CouponStats] Failed to update stats:', error);
      return false;
    }
  }
}

export const couponStatsService = new CouponStatsService();
