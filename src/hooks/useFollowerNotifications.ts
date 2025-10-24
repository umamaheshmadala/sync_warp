// src/hooks/useFollowerNotifications.ts
// Hook for managing in-app notifications from followed businesses

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface FollowerNotification {
  id: string;
  user_id: string;
  business_id: string;
  update_id?: string;
  notification_type: string;
  title: string;
  body: string;
  is_read: boolean;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  business?: {
    id: string;
    business_name: string;
    logo_url?: string;
  };
}

interface UseFollowerNotificationsReturn {
  notifications: FollowerNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useFollowerNotifications(): UseFollowerNotificationsReturn {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<FollowerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[FollowerNotifications] Loading notifications for user:', user.id);

      const { data, error: fetchError } = await supabase
        .from('follower_notifications')
        .select(`
          *,
          business:businesses (
            id,
            business_name,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Get last 50 notifications

      if (fetchError) {
        console.error('[FollowerNotifications] Error loading:', fetchError);
        throw fetchError;
      }

      console.log('[FollowerNotifications] Loaded', data?.length || 0, 'notifications');
      setNotifications(data as FollowerNotification[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
      console.error('[FollowerNotifications] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error: updateError } = await supabase
          .from('follower_notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Update local state optimistically
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );

        return true;
      } catch (err) {
        console.error('[FollowerNotifications] Error marking as read:', err);
        return false;
      }
    },
    [user]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('follower_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) throw updateError;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      return true;
    } catch (err) {
      console.error('[FollowerNotifications] Error marking all as read:', err);
      return false;
    }
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    console.log('[FollowerNotifications] Setting up realtime subscription');

    const channel = supabase
      .channel(`follower_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follower_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[FollowerNotifications] New notification received:', payload);
          loadNotifications(); // Reload to get business data
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'follower_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[FollowerNotifications] Notification updated:', payload);
          // Update local state
          setNotifications(prev =>
            prev.map(n =>
              n.id === payload.new.id ? { ...n, ...payload.new } as FollowerNotification : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      console.log('[FollowerNotifications] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, loadNotifications]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}

export default useFollowerNotifications;
