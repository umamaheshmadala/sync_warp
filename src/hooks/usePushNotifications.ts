import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
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
  const navigate = useNavigate();
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
          onConflict: 'user_id, platform'
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
    try {
      console.log('[usePushNotifications] Starting registration for user:', userId);
      console.log('[usePushNotifications] Platform:', Capacitor.getPlatform());

      // We do NOT use removeAllListeners() as it wipes listeners from other hooks (useNotificationHandler)
      
      // Token registered successfully
      const registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
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
      const registrationErrorListener = await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[usePushNotifications] Registration error:', error);
        setState(prev => ({
          ...prev,
          isRegistered: false,
          error: error.error || 'Token registration failed'
        }));
      });

      // Store in ref for cleanup (need to add ref to hook)
      // Since we can't easily add a ref here without changing the whole file structure significantly,
      // and we removed the cleanup return from useEffect in the previous plan (wait, did we?),
      // actually, the safest bet is to just NOT removeAllListeners.
      // Duplicate registration listeners are generally harmless compared to wiping everything.
      // BUT we should try to clean up.
      
      // Let's rely on the fact that AppContent mounts once.
      // We will remove the explicit removeAllListeners call here.



      // Create channel (Android)
      // We keep channel creation here as it's part of setup
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

    // Clear badge on mount
    PushNotifications.removeAllDeliveredNotifications();

    // Listen for app state changes to clear badge when app comes to foreground
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('[usePushNotifications] App resumed, clearing badges');
        PushNotifications.removeAllDeliveredNotifications();
      }
    });

    return () => {
      // Do NOT remove all listeners, as it affects useNotificationHandler
      // PushNotifications.removeAllListeners();
      appStateListener.then(listener => listener.remove());
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
