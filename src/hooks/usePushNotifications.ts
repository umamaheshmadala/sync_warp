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
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: platform,
          device_name: platform, // Storing platform as device name for now
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id, token'
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

  const registerPushNotifications = async () => {
    try {
      console.log('[usePushNotifications] Starting registration for user:', userId);
      console.log('[usePushNotifications] Platform:', Capacitor.getPlatform());

      // Set up listeners FIRST before registering
      await PushNotifications.removeAllListeners();
      
      // Token registered successfully
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[usePushNotifications] Token registered:', token.value);
        await SecureStorage.setPushToken(token.value);
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

      // Notification received
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[usePushNotifications] Notification received:', notification);
        window.dispatchEvent(new CustomEvent('foreground-notification', { detail: notification }));
      });

      // Notification tapped
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[usePushNotifications] Notification tapped:', action);
        const data = action.notification.data;
        if (data.action_url) window.location.href = data.action_url;
      });

      // Create channel (Android)
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'friend_notifications',
          name: 'Friend Notifications',
          description: 'Notifications for friend requests and updates',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      }

      // Permissions
      const currentPermission = await PushNotifications.checkPermissions();
      let finalPermissionStatus = currentPermission;
      if (currentPermission.receive === 'prompt') {
        finalPermissionStatus = await PushNotifications.requestPermissions();
      }

      if (finalPermissionStatus.receive === 'granted') {
        setState(prev => ({ ...prev, permissionGranted: true }));
        await PushNotifications.register();
      } else {
         setState(prev => ({ ...prev, permissionGranted: false, error: 'Permission denied' }));
      }
    } catch (error) {
      console.error('[usePushNotifications] Init failed:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Init failed' }));
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

    registerPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);

  // Function to manually remove token from database
  const removeTokenFromDatabase = async () => {
    if (!state.token) return;

    try {
      const { error } = await supabase
        .from('push_tokens')
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
    syncNow: registerPushNotifications,
    removeTokenFromDatabase
  };
};
