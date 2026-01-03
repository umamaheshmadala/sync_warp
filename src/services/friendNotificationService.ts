/**
 * Friend Notification Service
 * Story 9.1.8: Notifications Integration
 * 
 * Handles friend-related notifications (requests, acceptances)
 * Uses the 'notifications' table created in Story 9.1.8 database migration
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type FriendNotificationType = 'friend_request' | 'friend_accepted' | 'friend_removed';

export interface FriendNotification {
  id: string;
  user_id: string;
  notification_type: FriendNotificationType;
  title: string;
  message: string;
  entity_id: string | null; // friend_id or request_id
  route_to: string | null;
  sender_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Get friend notifications for current user
 */
export async function getFriendNotifications(
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<FriendNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ No authenticated user');
      return [];
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .in('notification_type', ['friend_request', 'friend_accepted', 'friend_removed'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching friend notifications:', error);
      throw error;
    }

    return data as FriendNotification[];
  } catch (error) {
    console.error('❌ getFriendNotifications error:', error);
    return [];
  }
}

/**
 * Get unread friend notification count
 */
export async function getUnreadFriendNotificationCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('notification_type', ['friend_request', 'friend_accepted', 'friend_removed'])
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('❌ getUnreadFriendNotificationCount error:', error);
    return 0;
  }
}

/**
 * Mark friend notification as read
 */
export async function markFriendNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }

    console.log('✅ Notification marked as read:', notificationId);
  } catch (error) {
    console.error('❌ markFriendNotificationAsRead error:', error);
  }
}

/**
 * Mark all friend notifications as read
 */
export async function markAllFriendNotificationsAsRead(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('notification_type', ['friend_request', 'friend_accepted', 'friend_removed'])
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }

    console.log('✅ All friend notifications marked as read');
  } catch (error) {
    console.error('❌ markAllFriendNotificationsAsRead error:', error);
  }
}

/**
 * Handle friend notification click - returns navigation route
 */
export function handleFriendNotificationClick(notification: FriendNotification): string {
  switch (notification.notification_type) {
    case 'friend_request':
      return '/friends/requests';
    case 'friend_accepted':
      return notification.entity_id ? `/profile/${notification.entity_id}` : '/friends';
    case 'friend_removed':
      return '/friends';
    default:
      return '/notifications';
  }
}

/**
 * Subscribe to friend notifications realtime
 * Returns unsubscribe function
 */
export function subscribeFriendNotifications(
  onNotification: (notification: FriendNotification) => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel('friend-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'notification_type=in.(friend_request,friend_accepted,friend_removed)',
      },
      (payload) => {
        const notification = payload.new as FriendNotification;
        console.log('🔔 New friend notification:', notification);
        onNotification(notification);
      }
    )
    .subscribe((status) => {
      console.log('📡 Friend notifications subscription status:', status);
    });

  // Return unsubscribe function
  return () => {
    console.log('🔌 Unsubscribing from friend notifications');
    supabase.removeChannel(channel);
  };
}
