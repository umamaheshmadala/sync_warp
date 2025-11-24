import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'

export interface PushNotificationService {
  initialize: () => Promise<void>
  requestPermissions: () => Promise<boolean>
  getToken: () => Promise<string | null>
  savePushToken: (token: string) => Promise<void>
  onNotificationReceived: (callback: (notification: PushNotificationSchema) => void) => void
  onNotificationTapped: (callback: (action: ActionPerformed) => void) => void
  removeAllListeners: () => Promise<void>
}

class PushNotificationServiceImpl implements PushNotificationService {
  private notificationReceivedCallbacks: Array<(notification: PushNotificationSchema) => void> = []
  private notificationTappedCallbacks: Array<(action: ActionPerformed) => void> = []
  private currentToken: string | null = null

  async initialize(): Promise<void> {
    // Only works on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[PushNotifications] Not a native platform - skipping initialization')
      return
    }

    console.log('[PushNotifications] Initializing...')

    // Listen for registration success
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('[PushNotifications] Registration success:', token.value)
      this.currentToken = token.value
      this.savePushToken(token.value)
    })

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[PushNotifications] Registration error:', error)
    })

    // Listen for notifications received (foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[PushNotifications] Notification received:', notification)
      this.notificationReceivedCallbacks.forEach(callback => callback(notification))
    })

    // Listen for notification tap actions (background/killed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[PushNotifications] Notification action performed:', action)
      this.notificationTappedCallbacks.forEach(callback => callback(action))
    })

    console.log('[PushNotifications] Listeners registered')
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false
    }

    try {
      const result = await PushNotifications.requestPermissions()

      if (result.receive === 'granted') {
        console.log('[PushNotifications] Permission granted')

        // Register with APNs/FCM
        await PushNotifications.register()

        return true
      } else {
        console.log('[PushNotifications] Permission denied')
        return false
      }
    } catch (error) {
      console.error('[PushNotifications] Permission request error:', error)
      return false
    }
  }

  async getToken(): Promise<string | null> {
    return this.currentToken
  }

  async savePushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.warn('[PushNotifications] No user logged in - cannot save token')
        return
      }

      const platform = Capacitor.getPlatform() // 'ios' or 'android'

      // Insert or update token in push_tokens table
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          platform: platform,
          device_name: `${platform} device`,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,token'
        })

      if (error) {
        console.error('[PushNotifications] Error saving token:', error)
      } else {
        console.log('[PushNotifications] Token saved to database')
      }
    } catch (error) {
      console.error('[PushNotifications] Error saving token:', error)
    }
  }

  onNotificationReceived(callback: (notification: PushNotificationSchema) => void): void {
    this.notificationReceivedCallbacks.push(callback)
  }

  onNotificationTapped(callback: (action: ActionPerformed) => void): void {
    this.notificationTappedCallbacks.push(callback)
  }

  async removeAllListeners(): Promise<void> {
    await PushNotifications.removeAllListeners()
    this.notificationReceivedCallbacks = []
    this.notificationTappedCallbacks = []
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationServiceImpl()
