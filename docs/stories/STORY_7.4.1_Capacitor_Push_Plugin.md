# Story 7.4.1: Capacitor Push Notifications Plugin ⚪ PLANNED

**Epic**: EPIC 7.4 - Push Notifications Infrastructure  
**Story Points**: 5  
**Estimated Time**: 3-4 hours  
**Dependencies**: EPIC 7.2 complete (push_tokens table exists)

---

## 📋 Overview

**What**: Install and configure @capacitor/push-notifications plugin to add push notification capability to the mobile app with proper permission handling and event listeners.

**Why**: Push notifications are essential for user engagement. The Capacitor plugin provides a unified API for both iOS and Android push notifications, abstracting platform-specific complexity.

**User Value**: Users can receive timely notifications about reviews, offers, followers, and business updates - keeping them engaged even when the app is closed.

---

## 🎯 Acceptance Criteria

- [ ] @capacitor/push-notifications installed
- [ ] Plugin configured in capacitor.config.ts
- [ ] Push notifications service created
- [ ] Permission request implemented
- [ ] Notification event listeners registered
- [ ] Notification tap actions handled
- [ ] Token saved to Supabase push_tokens table
- [ ] Tested permission flow on mobile
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Install Capacitor Push Notifications Plugin

**Terminal Commands**:
```powershell
# Install @capacitor/push-notifications
npm install @capacitor/push-notifications

# Sync to native projects
npx cap sync
```

**Expected Output**:
```
added 1 package
✔ Copying web assets
✔ Updating Android plugins
✔ Updating iOS plugins
```

**Verify Installation**:
```powershell
npm list @capacitor/push-notifications
```

**Acceptance**: ✅ Plugin installed

---

### Step 2: Configure Plugin in Capacitor Config

**File to Edit**: `capacitor.config.ts`

**Add push notifications configuration**:
```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sync.app',
  appName: 'SynC',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
}

export default config
```

**Sync changes**:
```powershell
npx cap sync
```

**Acceptance**: ✅ Plugin configured

---

### Step 3: Create Push Notifications Service

**Create new file**: `src/services/pushNotifications.ts`

```typescript
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
```

**Save the file.**

**Acceptance**: ✅ Service created

---

### Step 4: Initialize Push Notifications in App

**File to Edit**: `src/App.tsx`

**Add initialization**:
```typescript
import { useEffect } from 'react'
import { pushNotificationService } from './services/pushNotifications'
import { useAuthStore } from './store/authStore'

function App() {
  const { user } = useAuthStore()

  useEffect(() => {
    // Initialize push notifications
    const initPush = async () => {
      await pushNotificationService.initialize()

      // Request permissions if user is logged in
      if (user) {
        const granted = await pushNotificationService.requestPermissions()
        
        if (granted) {
          console.log('[App] Push notifications enabled')
        } else {
          console.log('[App] Push notifications denied by user')
        }
      }
    }

    initPush()

    // Cleanup
    return () => {
      pushNotificationService.removeAllListeners()
    }
  }, [user])

  return (
    <div className="app">
      {/* Your app content */}
    </div>
  )
}

export default App
```

**Acceptance**: ✅ Initialization added

---

### Step 5: Create Permission Request UI Component

**Create new file**: `src/components/PushNotificationPrompt.tsx`

```typescript
import React, { useState } from 'react'
import { pushNotificationService } from '../services/pushNotifications'
import './PushNotificationPrompt.css'

export const PushNotificationPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [requesting, setRequesting] = useState(false)

  const handleEnable = async () => {
    setRequesting(true)
    
    const granted = await pushNotificationService.requestPermissions()
    
    if (granted) {
      console.log('Push notifications enabled')
      setIsVisible(false)
    } else {
      alert('Push notifications were denied. You can enable them in Settings.')
    }
    
    setRequesting(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    // Save dismissal to local storage to not show again
    localStorage.setItem('push_prompt_dismissed', 'true')
  }

  // Don't show if previously dismissed
  if (localStorage.getItem('push_prompt_dismissed')) {
    return null
  }

  if (!isVisible) return null

  return (
    <div className="push-prompt">
      <div className="push-prompt__content">
        <div className="push-prompt__icon">🔔</div>
        <div className="push-prompt__text">
          <h3>Stay Updated</h3>
          <p>Get notified about new reviews, offers, and followers</p>
        </div>
      </div>
      
      <div className="push-prompt__actions">
        <button 
          onClick={handleEnable}
          disabled={requesting}
          className="push-prompt__button push-prompt__button--primary"
        >
          {requesting ? 'Enabling...' : 'Enable Notifications'}
        </button>
        <button 
          onClick={handleDismiss}
          className="push-prompt__button push-prompt__button--secondary"
        >
          Not Now
        </button>
      </div>
    </div>
  )
}
```

**Create styles**: `src/components/PushNotificationPrompt.css`

```css
.push-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  max-width: 400px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 20px;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

.push-prompt__content {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.push-prompt__icon {
  font-size: 32px;
  flex-shrink: 0;
}

.push-prompt__text h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.push-prompt__text p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.push-prompt__actions {
  display: flex;
  gap: 8px;
}

.push-prompt__button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.push-prompt__button--primary {
  background: #007AFF;
  color: white;
}

.push-prompt__button--primary:hover:not(:disabled) {
  background: #0051D5;
}

.push-prompt__button--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.push-prompt__button--secondary {
  background: #F0F0F0;
  color: #333;
}

.push-prompt__button--secondary:hover {
  background: #E0E0E0;
}

@keyframes slideUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-color-scheme: dark) {
  .push-prompt {
    background: #2C2C2E;
  }
  
  .push-prompt__text h3 {
    color: #FFFFFF;
  }
  
  .push-prompt__text p {
    color: #ADADAF;
  }
  
  .push-prompt__button--secondary {
    background: #3A3A3C;
    color: #FFFFFF;
  }
}
```

**Acceptance**: ✅ UI component created

---

### Step 6: Test on Android

**Build and deploy**:
```powershell
npm run build
npx cap sync android
npm run mobile:android
```

**Test Steps**:
1. Open app on Android device/emulator
2. Log in as a user
3. ✅ Permission prompt should appear
4. Grant permission
5. ✅ Token should be logged in console
6. Check Supabase push_tokens table
7. ✅ Token should be saved with platform='android'

**Check logs in Android Studio**:
- Logcat filter: `PushNotifications`
- Should see: `[PushNotifications] Registration success`

**Acceptance**: ✅ Works on Android

---

### Step 7: Test on iOS (Mac only)

**Build and deploy**:
```bash
npm run build
npx cap sync ios
npm run mobile:ios
```

**Test Steps** (requires real device):
1. Open app on iOS device (NOT simulator)
2. Log in as a user
3. ✅ Permission prompt should appear
4. Grant permission
5. ✅ Token should be logged in console
6. Check Supabase push_tokens table
7. ✅ Token should be saved with platform='ios'

**Note**: iOS push notifications only work on real devices, not simulators.

**Acceptance**: ✅ Works on iOS

---

### Step 8: Create Documentation

**Create new file**: `docs/PUSH_NOTIFICATIONS_SETUP.md`

```markdown
# Push Notifications Setup 🔔

## Overview

Push notifications using @capacitor/push-notifications plugin for iOS and Android.

---

## Service: pushNotificationService

```typescript
import { pushNotificationService } from './services/pushNotifications'

// Initialize
await pushNotificationService.initialize()

// Request permissions
const granted = await pushNotificationService.requestPermissions()

// Get current token
const token = await pushNotificationService.getToken()

// Listen for notifications
pushNotificationService.onNotificationReceived((notification) => {
  console.log('Received:', notification)
})

// Listen for notification taps
pushNotificationService.onNotificationTapped((action) => {
  console.log('Tapped:', action)
})
```

---

## Platform Support

- ✅ **Android**: Uses Firebase Cloud Messaging (FCM)
- ✅ **iOS**: Uses Apple Push Notification Service (APNs)
- ❌ **Web**: Not supported (requires native platform)

---

## Permissions

### Android
- Permissions handled automatically by plugin
- No special permissions needed in AndroidManifest.xml

### iOS
- Requires Push Notifications capability in Xcode
- User must grant permission at runtime

---

## Token Management

Tokens are automatically saved to `push_tokens` table:

```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  token text NOT NULL,
  platform text NOT NULL, -- 'ios' or 'android'
  device_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

---

## Notification Payload

```json
{
  "title": "New Review",
  "body": "John gave you a 5-star review!",
  "data": {
    "type": "review",
    "businessId": "123",
    "reviewId": "456"
  }
}
```

---

## Testing

### Test Token Registration
1. Build app for mobile
2. Log in
3. Grant push notification permission
4. Check console for token
5. Verify token in push_tokens table

### Send Test Notification (Manual)
Use Firebase Console or APNs testing tool to send test notification.

---

## Troubleshooting

### Token not registering
- Check plugin installed: `npm list @capacitor/push-notifications`
- Verify `npx cap sync` was run
- Check console for registration errors
- iOS: Must test on real device, not simulator

### Permission denied
- Android: Check app settings → notifications
- iOS: Check Settings → [App] → Notifications
- Reset: Uninstall app and reinstall

### Token not saving to database
- Check user is logged in
- Verify push_tokens table exists
- Check Supabase logs for errors
- Verify RLS policies allow insert

---

## Related

- **Story 7.4.2**: Firebase Cloud Messaging (Android)
- **Story 7.4.3**: Apple Push Notifications (iOS)
- **Story 7.4.4**: Supabase Edge Function for sending
```

**Save as**: `docs/PUSH_NOTIFICATIONS_SETUP.md`

**Acceptance**: ✅ Documentation created

---

### Step 9: Commit Push Notifications Plugin

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Add Capacitor push notifications plugin - Story 7.4.1

- Installed @capacitor/push-notifications
- Configured plugin in capacitor.config.ts
- Created pushNotifications service with event handling
- Implemented permission request flow
- Added notification received/tapped listeners
- Created PushNotificationPrompt UI component
- Token automatically saved to push_tokens table
- Tested on Android and iOS
- Created comprehensive documentation

Changes:
- src/services/pushNotifications.ts: Push notification service
- src/components/PushNotificationPrompt.tsx: Permission prompt UI
- src/components/PushNotificationPrompt.css: Prompt styles
- src/App.tsx: Initialize push notifications
- capacitor.config.ts: Plugin configuration
- docs/PUSH_NOTIFICATIONS_SETUP.md: Documentation
- package.json: Added @capacitor/push-notifications

Epic: 7.4 - Push Notifications Infrastructure
Story: 7.4.1 - Capacitor Push Notifications Plugin

Features:
- Push notification capability
- Permission handling
- Token management
- Event listeners
- Cross-platform support"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] @capacitor/push-notifications installed
- [ ] Plugin configured in capacitor.config.ts
- [ ] Push notifications service created
- [ ] Permission request implemented
- [ ] Notification received listener working
- [ ] Notification tapped listener working
- [ ] Token saved to push_tokens table
- [ ] PushNotificationPrompt component created
- [ ] Tested on Android device/emulator
- [ ] Tested on iOS device (real device)
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.4.1 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Plugin not found
**Solution**:
- Run `npm install @capacitor/push-notifications`
- Run `npx cap sync`
- Rebuild native app

### Issue: Permission always denied
**Solution**:
- Android: Check app has notification permission in settings
- iOS: Must test on real device
- Reset: Uninstall and reinstall app

### Issue: Token not saving
**Solution**:
- Verify user is logged in
- Check push_tokens table exists
- Check Supabase RLS policies
- Review console for errors

### Issue: iOS not working
**Solution**:
- **MUST use real device** (simulator doesn't support push)
- Verify Apple Developer account active
- Check Push Notifications capability enabled
- Verify provisioning profile includes push

---

## 📚 Additional Notes

### What We Built
- ✅ Push notification plugin integration
- ✅ Permission request system
- ✅ Token management
- ✅ Event handling (received/tapped)
- ✅ UI prompt component

### Platform Requirements
- **Android**: Firebase Cloud Messaging (Story 7.4.2)
- **iOS**: Apple Push Notification Service (Story 7.4.3)
- Both platforms configured in next stories

### What's Next
- **Story 7.4.2**: Firebase Cloud Messaging (Android setup)
- **Story 7.4.3**: Apple Push Notifications (iOS setup)

---

## 🔗 Related Documentation

- [@capacitor/push-notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Push Tokens Table Schema](../epics/EPIC_7.2_Supabase_Security.md)
- [EPIC 7.4 Overview](../epics/EPIC_7.4_Push_Notifications.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: EPIC 7.3 Complete  
**Next Story**: [STORY_7.4.2_Firebase_Cloud_Messaging.md](./STORY_7.4.2_Firebase_Cloud_Messaging.md)  
**Epic Progress**: Story 1/6 complete (0% → 17%)
