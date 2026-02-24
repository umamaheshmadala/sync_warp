
import { supabase } from '../lib/supabase';

export interface InAppNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data: any;
  sent_at: string;
  opened: boolean;
  sender_name?: string;
  sender_avatar?: string;
  sender_id?: string;
}

export const notificationService = {
  /**
   * Fetch paginated notifications for the current user.
   * Uses the 'in_app_notifications' view which filters out muted conversations.
   */
  getNotifications: async (page: number = 0, pageSize: number = 20) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Use the view to get refined data
    const { data, error, count } = await supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .neq('notification_type', 'message')     // Exclude messages
      .neq('notification_type', 'new_message') // Exclude new_message
      .order('sent_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data as InAppNotification[], count };
  },

  /**
   * Mark a single notification as opened (read).
   */
  markAsRead: async (notificationId: string) => {
    const { error } = await supabase
      .from('notification_log')
      .update({ opened: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Mark all notifications as opened for the current user.
   */
  markAllAsRead: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Efficient bulk update
    const { error } = await supabase
      .from('notification_log')
      .update({ opened: true })
      .eq('user_id', user.id)
      .eq('opened', false);

    if (error) throw error;
  },

  /**
   * Get the count of unread notifications.
   * Uses the 'unread_notifications' view.
   */
  getUnreadCount: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('in_app_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('opened', false)
      .neq('notification_type', 'message')     // Exclude messages
      .neq('notification_type', 'new_message'); // Exclude new_message

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Send a push notification when a business responds to a review.
   * Invokes the 'send-response-notification' Edge Function.
   */
  sendReviewResponseNotification: async (reviewId: string, responseText: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-response-notification', {
        body: {
          record: {
            review_id: reviewId,
            response_text: responseText
          }
        }
      });

      if (error) throw error;
      console.log('[NotificationService] Push notification sent:', data);
    } catch (err) {
      console.error('[NotificationService] Failed to send push notification:', err);
      // Non-blocking error - we don't want to stop the UI flow if push fails
    }
  }
};
