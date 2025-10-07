// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Notification, NotificationType } from '../types/notification';
import { getNotificationRoute } from '../utils/notificationRouter';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  /**
   * Fetch notifications from the database
   */
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      if (data) {
        // Map the data to include sender information
        const mappedNotifications: Notification[] = data.map((notif: any) => ({
          ...notif,
          sender_id: notif.sender?.id,
          sender_name: notif.sender?.full_name,
          sender_avatar: notif.sender?.avatar_url,
        }));

        setNotifications(mappedNotifications);
        
        // Calculate unread count
        const unread = mappedNotifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      if (unreadNotifications.length === 0) return;

      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) throw updateError;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );

      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, [user?.id, notifications]);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) throw deleteError;

      // Update local state
      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  /**
   * Handle notification click - mark as read and navigate
   */
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    try {
      // Mark as read if not already
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      // Navigate to the appropriate route
      const route = getNotificationRoute(notification.type, notification.metadata);
      navigate(route);
    } catch (err: any) {
      console.error('Error handling notification click:', err);
    }
  }, [markAsRead, navigate]);

  /**
   * Filter notifications by type
   */
  const getNotificationsByType = useCallback((type: NotificationType): Notification[] => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  /**
   * Get unread notifications
   */
  const getUnreadNotifications = useCallback((): Notification[] => {
    return notifications.filter(n => !n.is_read);
  }, [notifications]);

  /**
   * Set up real-time subscription for new notifications
   */
  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('New notification received:', payload);
          
          // Fetch the complete notification with sender info
          const { data } = await supabase
            .from('notifications')
            .select(`
              *,
              sender:sender_id (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newNotification: Notification = {
              ...data,
              sender_id: data.sender?.id,
              sender_name: data.sender?.full_name,
              sender_avatar: data.sender?.avatar_url,
            };

            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification updated:', payload);
          setNotifications(prev =>
            prev.map(n => (n.id === payload.new.id ? { ...n, ...payload.new } : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification deleted:', payload);
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
    getNotificationsByType,
    getUnreadNotifications,
    refresh: fetchNotifications,
  };
}
