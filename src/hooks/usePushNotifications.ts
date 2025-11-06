import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import SecureStorage from '../lib/secureStorage';

export interface PushNotificationState {
  isRegistered: boolean;
  token: string | null;
  permissionGranted: boolean;
  error: string | null;
}

export const usePushNotifications = (userId: string | null) => {
  const [state, setState] = useState<PushNotificationState>({
    isRegistered: false,
    token: null,
    permissionGranted: false,
    error: null
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
        console.log('[usePushNotifications] About to request permissions...');
        
        // Request permission
        const permissionStatus = await PushNotifications.requestPermissions();
        console.log('[usePushNotifications] Permission status received:', permissionStatus);
        console.log('[usePushNotifications] Permission receive:', permissionStatus.receive);
        
        if (permissionStatus.receive === 'granted') {
          setState(prev => ({ ...prev, permissionGranted: true }));
          
          // Register with OS (FCM for Android, APNs for iOS)
          await PushNotifications.register();
          
          // Set up listeners
          setupListeners();
          
          console.log('[usePushNotifications] Initialized successfully');
        } else {
          setState(prev => ({
            ...prev,
            permissionGranted: false,
            error: 'Push notification permission denied'
          }));
          console.warn('[usePushNotifications] Permission denied');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize push notifications'
        }));
        console.error('[usePushNotifications] Initialization failed:', error);
      }
    };

    const setupListeners = () => {
      // Token registered successfully
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[usePushNotifications] Token registered:', token.value);
        
        // Store token in secure storage
        await SecureStorage.setPushToken(token.value);
        
        setState(prev => ({
          ...prev,
          isRegistered: true,
          token: token.value,
          error: null
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

  return state;
};
