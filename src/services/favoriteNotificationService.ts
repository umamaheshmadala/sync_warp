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
  | 'item_updated';

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
  try {
    const { data, error } = await supabase
      .from('favorite_notifications')
      .insert([{
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data || {},
        expires_at: input.expires_at || null,
        is_read: false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    return data as Notification;
  } catch (error) {
    console.error('createNotification error:', error);
    return null;
  }
}

/**
 * Notify merchant when a review is posted on their business
 */
export async function notifyMerchantNewReview(
  businessId: string,
  reviewId: string,
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
      message: `${reviewerName} ${sentiment} your business`,
      data: {
        business_id: businessId,
        business_name: business.business_name,
        review_id: reviewId,
        reviewer_name: reviewerName,
        recommendation: recommendation,
      },
    });

    console.log(`✅ Notified merchant (${business.user_id}) about new review`);
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
  businessName: string
): Promise<void> {
  try {
    await createNotification({
      user_id: userId,
      type: 'review_response',
      title: 'Business Responded to Your Review',
      message: `${businessName} has responded to your review`,
      data: {
        review_id: reviewId,
        business_name: businessName,
      },
    });

    console.log(`✅ Notified user (${userId}) about business response`);
  } catch (error) {
    console.error('Error notifying user of review response:', error);
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
      .from('favorite_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
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
      .from('favorite_notifications')
      .update({ is_read: true })
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
      .from('favorite_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

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
      .from('favorite_notifications')
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
      .from('favorite_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

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
