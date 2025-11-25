import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import SecureStorage from '../lib/secureStorage';
import { supabase } from '../lib/supabase';

export interface PushNotificationState {
  isRegistered: boolean;
  token: string | null;
  permissionGranted: boolean;
  error: string | null;
  syncedToBackend: boolean;
}

export const usePushNotifications = (userId: string | null) => {
  const [state, setState] = useState<PushNotificationState>({
    isRegistered: false,
    token: null,
    permissionGranted: false,
    error: null,
    syncedToBackend: false
  });

  // Function to sync token with Supabase
  const syncTokenWithSupabase = async (token: string, userId: string): Promise<boolean> => {
    try {
      const platform = Capacitor.getPlatform();

      console.log('[usePushNotifications] Syncing token to Supabase...');

      // Upsert token to database
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: platform,
          device_info: {
            platform,
            timestamp: new Date().toISOString()
          },
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('[usePushNotifications] Sync failed:', error);
        return false;
      }

      console.log('[usePushNotifications] Token synced successfully');
      return true;
    } catch (error) {
      console.error('[usePushNotifications] Sync error:', error);
      return false;
    }
  };

  useEffect(() => {
    console.log('[usePushNotifications] Hook effect triggered. UserId:', userId, 'Platform:', Capacitor.getPlatform(), 'IsNative:', Capacitor.isNativePlatform());

    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[usePushNotifications] Skipping - not a native platform');
      return;
    }

    // Only register if user is logged in
    if (!userId) {
      console.log('[usePushNotifications] Skipping - no userId provided');
      return;
    }

    const setupListeners = () => {
      // Token registered successfully
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[usePushNotifications] Token registered:', token.value);

        // Store token in secure storage
        await SecureStorage.setPushToken(token.value);

        // Sync token with Supabase
        const syncSuccess = await syncTokenWithSupabase(token.value, userId!);

        setState(prev => ({
          ...prev,
          isRegistered: true,
          token: token.value,
          syncedToBackend: syncSuccess,
          error: syncSuccess ? null : 'Token saved locally but sync failed'
        }));
      });

      // Token registration failed
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[usePushNotifications] Registration error:', error);
        setState(prev => ({
          ...prev,
          isRegistered: false,
          error: error.error || 'Token registration failed'
        }));
      });

      // Notification received while app is in foreground
      PushNotifications.addListener('pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('[usePushNotifications] Notification received:', notification);

          // Show toast for foreground notification
          const title = notification.title || 'New Notification';
          const body = notification.body || '';

          // Use a custom event or a global toast handler if available
          // For now, we'll dispatch a custom event that the app can listen to
          // or use the browser's Notification API if permission granted

          // Dispatch event for UI components to pick up
          window.dispatchEvent(new CustomEvent('foreground-notification', {
            detail: notification
          }));

          // Also try to show a system notification if possible (for web/PWA)
          if (Notification.permission === 'granted') {
            new Notification(title, { body });
          }
        }
      );

      // User tapped on notification
      PushNotifications.addListener('pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('[usePushNotifications] Notification tapped:', action);
          const data = action.notification.data;

          // Navigate based on notification type
          if (data.action_url) {
            window.location.href = data.action_url;
          }
        }
      );
    };

    const registerPushNotifications = async () => {
      try {
        console.log('[usePushNotifications] Starting registration for user:', userId);
        console.log('[usePushNotifications] Platform:', Capacitor.getPlatform());

        // Set up listeners FIRST before registering
        setupListeners();

        // Create notification channel (required for Android O+)
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'friend_notifications',
            name: 'Friend Notifications',
            description: 'Notifications for friend requests and updates',
            importance: 5,
            visibility: 1,
            vibration: true,
          });
          console.log('[usePushNotifications] Notification channel created');
        }

        // Check current permission status
        const currentPermission = await PushNotifications.checkPermissions();
        console.log('[usePushNotifications] Current permission status:', currentPermission);

        let finalPermissionStatus = currentPermission;

        // If permission is prompt, request it
        if (currentPermission.receive === 'prompt') {
          console.log('[usePushNotifications] Requesting permissions...');
          finalPermissionStatus = await PushNotifications.requestPermissions();
          console.log('[usePushNotifications] Permission request result:', finalPermissionStatus);
        }

        if (finalPermissionStatus.receive === 'granted') {
          setState(prev => ({ ...prev, permissionGranted: true }));

          console.log('[usePushNotifications] Permission granted, registering with FCM/APNs...');
          // Register with OS (FCM for Android, APNs for iOS)
          await PushNotifications.register();

          console.log('[usePushNotifications] Registration called successfully');
        } else if (finalPermissionStatus.receive === 'denied') {
          setState(prev => ({
            ...prev,
            permissionGranted: false,
            error: 'Push notification permission denied'
          }));
          console.warn('[usePushNotifications] Permission denied by user');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize push notifications'
        }));
        console.error('[usePushNotifications] Initialization failed:', error);
      }
    };

    registerPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);

  // Function to manually remove token from database
  const removeTokenFromDatabase = async () => {
    if (!state.token) return;

    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('token', state.token);

      if (error) {
        console.error('[usePushNotifications] Failed to remove token from database:', error);
      } else {
        console.log('[usePushNotifications] Token removed from database');
      }
    } catch (error) {
      console.error('[usePushNotifications] Error removing token:', error);
    }
  };

  return {
    ...state,
    removeTokenFromDatabase
  };
};
