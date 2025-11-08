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

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Only register if user is logged in
    if (!userId) {
      return;
    }

    const registerPushNotifications = async () => {
      try {
        console.log('[usePushNotifications] Starting registration for user:', userId);
        console.log('[usePushNotifications] Platform:', Capacitor.getPlatform());
        
        // Set up listeners FIRST before registering
        setupListeners();
        
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
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,platform'
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
          // Can be extended to show in-app notification UI
        }
      );

      // User tapped on notification
      PushNotifications.addListener('pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('[usePushNotifications] Notification tapped:', action);
          // Can be extended to handle navigation
        }
      );
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
    removeTokenFromDatabase
  };
};
