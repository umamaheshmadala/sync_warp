// =====================================================
// Story 5.5: Enhanced Sharing Limits - Service Layer
// Story 8.3.4 Part 2: Messaging Integration
// =====================================================

import { supabase } from '../lib/supabase';
import { messagingService } from './messagingService';
import type {
  SharingLimits,
  CanShareResult,
  SharingStatsToday,
  SharingLimitConfig,
  CouponSharingLogEntry,
} from '../types/sharingLimits';

/**
 * Get sharing limits for a user based on their Driver status
 */
export async function getSharingLimits(
  userId: string,
  isDriver: boolean = false
): Promise<SharingLimits> {
  console.log('📊 Getting sharing limits for user:', userId, 'isDriver:', isDriver);

  try {
    const { data, error } = await supabase
      .rpc('get_sharing_limits', {
        p_user_id: userId,
        p_is_driver: isDriver,
      });

    if (error) {
      console.error('❌ Get sharing limits error:', error);
      throw new Error(`Failed to get sharing limits: ${error.message}`);
    }

    console.log('✅ Sharing limits retrieved:', data);
    return data as SharingLimits;
  } catch (error) {
    console.error('❌ Get sharing limits error:', error);
    throw error;
  }
}

/**
 * Check if a user can share a coupon to a specific friend
 */
export async function canShareToFriend(
  senderId: string,
  recipientId: string,
  isDriver: boolean = false
): Promise<CanShareResult> {
  console.log('🔍 Checking if user can share:', {
    senderId,
    recipientId,
    isDriver,
  });

  try {
    const { data, error } = await supabase
      .rpc('can_share_to_friend', {
        p_sender_id: senderId,
        p_recipient_id: recipientId,
        p_is_driver: isDriver,
      });

    if (error) {
      console.error('❌ Can share to friend error:', error);
      throw new Error(`Failed to check sharing limits: ${error.message}`);
    }

    console.log('✅ Share check result:', data);
    return data as CanShareResult;
  } catch (error) {
    console.error('❌ Can share to friend error:', error);
    throw error;
  }
}

/**
 * Get sharing statistics for a user for today
 */
export async function getSharingStatsToday(
  userId: string
): Promise<SharingStatsToday> {
  console.log('📈 Getting sharing stats for today:', userId);

  try {
    const { data, error } = await supabase
      .rpc('get_sharing_stats_today', {
        p_user_id: userId,
      });

    if (error) {
      console.error('❌ Get sharing stats error:', error);
      throw new Error(`Failed to get sharing stats: ${error.message}`);
    }

    console.log('✅ Sharing stats retrieved:', data);
    return data as SharingStatsToday;
  } catch (error) {
    console.error('❌ Get sharing stats error:', error);
    throw error;
  }
}

/**
| * Log a coupon share activity with wallet transfer and messaging
| * Now requires collection_id and conversation_id for messaging integration
| */
export async function logCouponShare(
  senderId: string,
  recipientId: string,
  couponId: string,
  senderCollectionId: string,
  conversationId: string,
  isDriver: boolean = false
): Promise<any> {
  console.log('📝 Logging coupon share with wallet transfer and messaging:', {
    senderId,
    recipientId,
    couponId,
    senderCollectionId,
    conversationId,
    isDriver,
  });

  try {
    const { data, error } = await supabase
      .rpc('log_coupon_share', {
        p_sender_id: senderId,
        p_recipient_id: recipientId,
        p_coupon_id: couponId,
        p_sender_collection_id: senderCollectionId,
        p_conversation_id: conversationId,
        p_is_driver: isDriver,
      });

    if (error) {
      console.error('❌ Log coupon share error:', error);
      throw new Error(`Failed to log coupon share: ${error.message}`);
    }

    console.log('✅ Coupon share logged successfully with wallet transfer and message:', data);
    return data; // Returns success object with IDs including message_id
  } catch (error) {
    console.error('❌ Log coupon share error:', error);
    throw error;
  }
}

/**
 * Get all sharing limit configurations
 */
export async function getAllSharingLimitConfigs(): Promise<SharingLimitConfig[]> {
  console.log('📋 Getting all sharing limit configurations');

  try {
    const { data, error } = await supabase
      .from('sharing_limits_config')
      .select('*')
      .eq('is_active', true)
      .order('limit_type');

    if (error) {
      console.error('❌ Get limit configs error:', error);
      throw new Error(`Failed to get limit configurations: ${error.message}`);
    }

    console.log(`✅ Retrieved ${data.length} limit configurations`);
    return data as SharingLimitConfig[];
  } catch (error) {
    console.error('❌ Get limit configs error:', error);
    throw error;
  }
}

/**
 * Get sharing log entries for a user
 */
export async function getUserSharingLog(
  userId: string,
  limit: number = 50
): Promise<CouponSharingLogEntry[]> {
  console.log('📜 Getting sharing log for user:', userId);

  try {
    const { data, error } = await supabase
      .from('coupon_sharing_log')
      .select('*')
      .eq('sender_id', userId)
      .order('shared_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Get sharing log error:', error);
      throw new Error(`Failed to get sharing log: ${error.message}`);
    }

    console.log(`✅ Retrieved ${data.length} log entries`);
    return data as CouponSharingLogEntry[];
  } catch (error) {
    console.error('❌ Get sharing log error:', error);
    throw error;
  }
}

/**
 * Get sharing analytics for a date range
 */
export async function getSharingAnalytics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  console.log('📊 Getting sharing analytics:', {
    userId,
    startDate,
    endDate,
  });

  try {
    const { data, error } = await supabase
      .from('sharing_analytics')
      .select('*')
      .eq('sender_id', userId)
      .gte('sharing_day', startDate)
      .lte('sharing_day', endDate)
      .order('sharing_day', { ascending: false });

    if (error) {
      console.error('❌ Get sharing analytics error:', error);
      throw new Error(`Failed to get sharing analytics: ${error.message}`);
    }

    console.log(`✅ Retrieved ${data.length} analytics entries`);
    return data;
  } catch (error) {
    console.error('❌ Get sharing analytics error:', error);
    throw error;
  }
}

/**
 * Helper: Determine if user is a Driver
 * TODO: Implement actual Driver detection logic based on:
 * - User activity metrics
 * - Top 10% per city calculation
 * - Admin-configured thresholds
 * 
 * For now, returns false (regular user)
 */
export async function isUserDriver(userId: string): Promise<boolean> {
  console.log('🚗 Checking if user is a Driver:', userId);
  
  // TODO: Implement Driver detection logic
  // This would involve:
  // 1. Getting user's activity metrics (check-ins, reviews, shares)
  // 2. Comparing against city-wide top 10%
  // 3. Checking admin-configured thresholds
  
  // For MVP, return false (regular user)
  return false;
}

/**
 * Helper: Get current user ID from auth
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
| * Get shareable coupons for a user (coupons they can share)
| */
export async function getShareableCoupons(
  userId: string
): Promise<any[]> {
  console.log('🎫 Getting shareable coupons for user:', userId);

  try {
    const { data, error } = await supabase
      .rpc('get_shareable_coupons', {
        p_user_id: userId,
      });

    if (error) {
      console.error('❌ Get shareable coupons error:', error);
      throw new Error(`Failed to get shareable coupons: ${error.message}`);
    }

    console.log(`✅ Retrieved ${data?.length || 0} shareable coupons`);
    return data || [];
  } catch (error) {
    console.error('❌ Get shareable coupons error:', error);
    throw error;
  }
}

/**
| * Get lifecycle history for a coupon
| */
export async function getCouponLifecycle(
  couponId: string,
  userId?: string
): Promise<any[]> {
  console.log('📜 Getting coupon lifecycle:', { couponId, userId });

  try {
    const { data, error } = await supabase
      .rpc('get_coupon_lifecycle', {
        p_coupon_id: couponId,
        p_user_id: userId || null,
      });

    if (error) {
      console.error('❌ Get coupon lifecycle error:', error);
      throw new Error(`Failed to get coupon lifecycle: ${error.message}`);
    }

    console.log(`✅ Retrieved ${data?.length || 0} lifecycle events`);
    return data || [];
  } catch (error) {
    console.error('❌ Get coupon lifecycle error:', error);
    throw error;
  }
}

/**
| * Complete share workflow with validation, logging, and messaging
| * Now creates conversation and message automatically
| */
export async function shareWithLimitValidation(
  recipientId: string,
  couponId: string,
  senderCollectionId: string
): Promise<{ success: boolean; message: string; message_id?: string; conversation_id?: string; error?: string; canShareResult?: CanShareResult }> {
  console.log('🎁 Starting share workflow with validation and messaging');
  let conversationId: string | undefined;

  try {
    // Get current user
    const senderId = await getCurrentUserId();
    if (!senderId) {
      throw new Error('User not authenticated');
    }

    // Check how many copies recipient already has (for display count)
    console.log('🔍 Checking how many copies recipient already has...');
    const { count: existingCount, error: countError } = await supabase
      .from('user_coupon_collections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', recipientId)
      .eq('coupon_id', couponId)
      .in('status', ['active', 'used']); // Count active and used coupons

    if (countError) {
      console.error('❌ Error checking existing count:', countError);
      throw new Error(`Failed to check recipient's coupons: ${countError.message}`);
    }

    const couponCount = existingCount || 0;
    console.log(`📊 Recipient currently has ${couponCount} copies of this coupon`);
    console.log('✅ Proceeding with share (duplicates allowed)');

    // Check if user is a Driver
    const isDriver = await isUserDriver(senderId);

    // Check if user can share
    const canShareResult = await canShareToFriend(senderId, recipientId, isDriver);

    if (!canShareResult.can_share) {
      return {
        success: false,
        message: canShareResult.reason,
        canShareResult,
      };
    }

    // Get or create conversation FIRST
    console.log('💬 Getting or creating conversation...');
    conversationId = await messagingService.createOrGetConversation(recipientId);
    console.log('✅ Conversation ID:', conversationId);

    // Log the share with wallet transfer and message creation
    const result = await logCouponShare(
      senderId,
      recipientId,
      couponId,
      senderCollectionId,
      conversationId,
      isDriver
    );

    return {
      success: true,
      message: 'Coupon shared successfully',
      message_id: result.message_id,
      conversation_id: conversationId,
      canShareResult,
    };
  } catch (error: any) {
    console.error('❌ Share workflow error:', error);
    
    // CRITICAL: Even on failure, create a message to show the attempt
    if (conversationId) {
      try {
        console.log('⚠️ Creating failure message...');
        const failureMessageId = await messagingService.sendMessage({
          conversationId,
          content: 'Coupon sharing failed, try again from your wallet.',
          type: 'text',
          linkPreviews: [{
            type: 'coupon_share_failed',
            url: `sync://coupon/${couponId}`,
            title: 'Coupon Share Failed',
            description: 'Failed to share coupon. Please try again.',
            metadata: {
              coupon_id: couponId,
              error: error.message,
              timestamp: new Date().toISOString()
            }
          }]
        });
        
        return {
          success: false,
          message: error.message,
          message_id: failureMessageId,
          conversation_id: conversationId,
          error: error.message
        };
      } catch (msgError) {
        console.error('❌ Failed to create failure message:', msgError);
        // If even message creation fails, just throw original error
        throw error;
      }
    }
    throw error;
  }
}

// Export all functions
export default {
  getSharingLimits,
  canShareToFriend,
  getSharingStatsToday,
  logCouponShare,
  getAllSharingLimitConfigs,
  getUserSharingLog,
  getSharingAnalytics,
  isUserDriver,
  getCurrentUserId,
  shareWithLimitValidation,
  getShareableCoupons,
  getCouponLifecycle,
};
