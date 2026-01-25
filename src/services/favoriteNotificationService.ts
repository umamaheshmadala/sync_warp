// =====================================================
// Story 5.2.4: Notification Service
// =====================================================

import { supabase } from '../lib/supabase';

export type NotificationType =
  | 'review_posted'           // Merchant: New review on their business
  | 'review_response'         // User: Business responded to their review
  | 'checkin'                 // Merchant: User checked in at their business
  | 'coupon_collected'        // Merchant: User collected their coupon
  | 'review_edited'           // Merchant: User edited their review
  | 'reminder'
  | 'share_received'
  | 'share_accepted'
  | 'item_updated'
  | 'review_moderation'       // User: Review approved/rejected
  | 'admin_review_pending';   // Admin: New review to moderate

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  expires_at?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification | null> {
  console.log('🔔 createNotification: Starting insert with:', {
    user_id: input.user_id,
    type: input.type,
    title: input.title,
  });
  try {
    const { data, error } = await supabase
      .from('notification_log')
      .insert([{
        user_id: input.user_id,
        notification_type: input.type,
        title: input.title,
        body: input.message,
        data: input.data || {},
        opened: false,
      }]);
    // .select() // Removed to allow inserts for other users (RLS blocks select)
    // .single();

    if (error) {
      console.error('❌ createNotification INSERT error:', error);
      throw error;
    }

    console.log('✅ createNotification: Insert successful (no data returned)');
    return {} as any; // Return empty object since we can't get the ID, but callers expect Non-Null
  } catch (error) {
    console.error('❌ createNotification CATCH error:', error);
    return null;
  }
}

/**
 * Notify merchant when a review is posted on their business
 */
export async function notifyMerchantNewReview(
  businessId: string,
  reviewId: string,
  reviewerId: string,
  reviewerName: string,
  recommendation: boolean
): Promise<void> {
  try {
    // Get business owner user_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id, business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('Error fetching business:', businessError);
      return;
    }

    const sentiment = recommendation ? '👍 recommends' : '👎 doesn\'t recommend';

    await createNotification({
      user_id: business.user_id,
      type: 'review_posted',
      title: 'New Review Received',
      message: `${business.business_name} got a new review. Check that out!!!`,
      data: {
        business_id: businessId,
        business_name: business.business_name,
        review_id: reviewId,
        reviewer_name: reviewerName,
        recommendation: recommendation,
        sender_id: reviewerId,
      },
    });

    console.log(`✅ In-app notification created for merchant (${business.user_id})`);

    // 2. Check Preferences for Push
    const { data: profile, error: prefError } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', business.user_id)
      .single();

    if (prefError) {
      console.error('❌ Error fetching merchant preferences:', prefError);
    }

    const prefs = profile?.notification_preferences as any;
    const pushEnabled = prefs?.push_enabled !== false;
    // You could also check a specific 'new_reviews' preference if you have one schema-defined

    if (pushEnabled) {
      const actionUrl = `/business/${businessId}/reviews#review-${reviewId}`;
      console.log('🚀 Invoking send-push-notification for merchant');

      const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: business.user_id,
          title: 'New Review Received',
          body: `${business.business_name} got a new review. Check that out!!!`,
          data: {
            type: 'review_posted',
            reviewId: reviewId,
            businessId: businessId,
            action_url: actionUrl
          }
        }
      });

      if (pushError) {
        console.error('❌ Failed to invoke push edge function for merchant:', pushError);
      } else {
        console.log(`✅ Push sent to merchant (${business.user_id})`);
      }
    } else {
      console.log(`🔕 Push skipped for merchant ${business.user_id} (Push Enabled: ${pushEnabled})`);
    }
  } catch (error) {
    console.error('Error notifying merchant of new review:', error);
  }
}

/**
 * Notify user when business owner responds to their review
 */

export async function notifyUserReviewResponse(
  reviewId: string,
  userId: string,
  businessName: string,
  businessId: string | undefined,
  senderId: string
): Promise<void> {
  console.log('🔔 notifyUserReviewResponse called', { reviewId, userId, businessName, businessId, senderId });
  try {
    // 1. Create In-App Notification - REMOVED
    // Handled by DB Trigger 'notify_review_response' to prevent duplicates and ensure consistency
    console.log('🔔 In-app notification creation handled by DB Trigger');

    // console.log('✅ In-app notification created result:', result);

    // 2. Check Preferences for Push
    console.log('🔔 Fetching user notification preferences...');
    const { data: profile, error: prefError } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    console.log('🔔 User preferences fetch result:', { profile, prefError });

    if (prefError) {
      console.error('❌ Error fetching notification preferences:', prefError);
      return;
    }

    const prefs = profile?.notification_preferences as any;
    console.log('🔔 User preferences:', prefs);

    // Default to true if no record/value (failsafe)
    // Note: notification_preferences is JSONB
    const pushEnabled = prefs?.push_enabled !== false;
    const responseEnabled = prefs?.review_responses !== false;

    console.log(`🔔 Notification checks: pushEnabled=${pushEnabled}, responseEnabled=${responseEnabled}`);

    if (!pushEnabled || !responseEnabled) {
      console.log(`🔕 Push skipped for user ${userId} (Global: ${pushEnabled}, Response: ${responseEnabled})`);
      return;
    }

    // 3. Send Push Notification - REMOVED from Client Side
    // Handled by Database Webhook -> 'send-response-notification' Edge Function
    // This allows SQL/Admin inserts to also trigger notifications and prevents duplicates.
    console.log('✅ Push notification delegation handled by Database Webhook');

  } catch (error) {
    console.error('❌ Error in notifyUserReviewResponse:', error);
  }
}

/**
 * Notify merchant when a user checks in at their business
 */
export async function notifyMerchantCheckin(
  businessId: string,
  checkinId: string,
  userName: string
): Promise<void> {
  try {
    // Get business owner user_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id, business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('Error fetching business:', businessError);
      return;
    }

    await createNotification({
      user_id: business.user_id,
      type: 'checkin',
      title: 'New Check-in',
      message: `${userName} checked in at your business`,
      data: {
        business_id: businessId,
        business_name: business.business_name,
        checkin_id: checkinId,
        user_name: userName,
      },
    });

    console.log(`✅ Notified merchant (${business.user_id}) about check-in`);
  } catch (error) {
    console.error('Error notifying merchant of check-in:', error);
  }
}

/**
 * Get notifications for current user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  try {
    let query = supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('opened', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data as Notification[];
  } catch (error) {
    console.error('getUserNotifications error:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_log')
      .update({ opened: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_log')
      .update({ opened: true })
      .eq('user_id', userId)
      .eq('opened', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_log')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('deleteNotification error:', error);
    return false;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('opened', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('getUnreadNotificationCount error:', error);
    return 0;
  }
}
