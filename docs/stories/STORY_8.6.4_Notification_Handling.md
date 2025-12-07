# 📬 STORY 8.6.4: Notification Handling & Navigation

**Parent Epic:** [EPIC 8.6 - Push Notifications & Real-time Updates](../epics/EPIC_8.6_Push_Notifications.md)  
**Story Owner:** Mobile Engineering  
**Estimated Effort:** 1 day  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 8.6.3 (Backend Notification Sender)

---

## 🎯 **Story Goal**

Handle push notifications in the app:

- Display in-app notification banner when app is in foreground
- Navigate to correct conversation when notification is tapped
- Handle notification data payload parsing
- Integrate with existing navigation system

---

## 📋 **Acceptance Criteria**

- [ ] In-app banner shown when notification received in foreground
- [ ] Tapping notification navigates to correct conversation
- [ ] Deep linking works from cold start (app not running)
- [ ] Notification badge cleared when conversation opened
- [ ] Works on both iOS and Android

---

## 🧩 **Implementation Details**

### Task 1: Create Notification Handler Service

#### 1.1 Create notificationHandler.ts

```typescript
// src/services/notificationHandler.ts
import { PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { NavigateFunction } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { hapticService } from './hapticService';

export interface NotificationData {
  conversationId?: string;
  messageId?: string;
  type?: 'new_message' | 'friend_request' | 'reaction';
  senderId?: string;
}

class NotificationHandler {
  private navigate: NavigateFunction | null = null;

  /**
   * Set navigator for navigation
   */
  setNavigator(navigate: NavigateFunction): void {
    this.navigate = navigate;
  }

  /**
   * Handle notification received while app is in foreground
   */
  async handleForegroundNotification(notification: PushNotificationSchema): Promise<void> {
    console.log('📬 [NotificationHandler] Foreground notification:', notification);

    const { title, body, data } = notification;
    const notificationData = data as NotificationData;

    // Trigger haptic feedback
    await hapticService.trigger('notification');

    // Show in-app toast banner
    toast.custom(
      (t) => (
        <div
          className={`${t.visible ? 'animate-enter' : 'animate-leave'}
            max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          onClick={() => {
            toast.dismiss(t.id);
            this.navigateToConversation(notificationData);
          }}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="mt-1 text-sm text-gray-500">{body}</p>
              </div>
            </div>
          </div>
        </div>
      ),
      { duration: 4000, position: 'top-center' }
    );
  }

  /**
   * Handle notification tap (from background or killed state)
   */
  async handleNotificationTap(action: ActionPerformed): Promise<void> {
    console.log('👆 [NotificationHandler] Notification tapped:', action);

    const data = action.notification.data as NotificationData;
    await this.navigateToConversation(data);
  }

  /**
   * Navigate to the relevant conversation
   */
  private async navigateToConversation(data: NotificationData): Promise<void> {
    if (!this.navigate) {
      console.warn('[NotificationHandler] Navigator not set');
      return;
    }

    if (data?.conversationId) {
      console.log(`🚀 [NotificationHandler] Navigating to: /messages/${data.conversationId}`);
      this.navigate(`/messages/${data.conversationId}`);
    } else if (data?.type === 'friend_request') {
      this.navigate('/friends');
    } else {
      // Fallback: go to messages
      this.navigate('/messages');
    }
  }

  /**
   * Parse notification data from different sources
   */
  parseNotificationData(raw: any): NotificationData {
    // Handle both string and object data
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw || {};
  }
}

export const notificationHandler = new NotificationHandler();
```

---

### Task 2: Create In-App Notification Banner Component

#### 2.1 Create NotificationBanner.tsx

```tsx
// src/components/notifications/NotificationBanner.tsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";

interface NotificationBannerProps {
  visible: boolean;
  title: string;
  body: string;
  onTap: () => void;
  onDismiss: () => void;
}

export function NotificationBanner({
  visible,
  title,
  body,
  onTap,
  onDismiss,
}: NotificationBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-50"
        >
          <div
            onClick={onTap}
            className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{title}</p>
              <p className="text-sm text-gray-500 truncate">{body}</p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### Task 3: Update usePushNotifications Hook

#### 3.1 Full hook implementation

```typescript
// src/hooks/usePushNotifications.ts
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import { useAuth } from "./useAuth";
import { pushTokenService } from "../services/pushTokenService";
import { notificationHandler } from "../services/notificationHandler";

export function usePushNotifications() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const isInitialized = useRef(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();

    console.log(
      `[usePushNotifications] Hook effect triggered. UserId: ${user?.id} Platform: ${platform} IsNative: ${isNative}`
    );

    if (!isNative) {
      console.log("[usePushNotifications] Skipping - not a native platform");
      return;
    }

    if (!isLoggedIn || !user) {
      console.log("[usePushNotifications] Skipping - user not logged in");
      return;
    }

    if (isInitialized.current) {
      return;
    }

    // Set navigator for deep linking
    notificationHandler.setNavigator(navigate);

    async function initialize() {
      try {
        // Check and request permissions
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === "prompt") {
          const result = await PushNotifications.requestPermissions();
          if (result.receive !== "granted") {
            console.log("[usePushNotifications] Permission denied");
            return;
          }
        } else if (permStatus.receive !== "granted") {
          console.log("[usePushNotifications] Permission not granted");
          return;
        }

        // Register for push
        await PushNotifications.register();

        // Listen for registration
        await PushNotifications.addListener("registration", async (token) => {
          console.log("✅ [usePushNotifications] Token received");
          await pushTokenService.saveToken(token.value);
        });

        // Listen for registration errors
        await PushNotifications.addListener("registrationError", (error) => {
          console.error("❌ [usePushNotifications] Registration error:", error);
        });

        // Listen for notifications received in foreground
        await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            notificationHandler.handleForegroundNotification(notification);
          }
        );

        // Listen for notification taps
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            notificationHandler.handleNotificationTap(action);
          }
        );

        isInitialized.current = true;
        console.log("✅ [usePushNotifications] Initialized successfully");
      } catch (error) {
        console.error("❌ [usePushNotifications] Initialization error:", error);
      }
    }

    // Handle cold start (app opened via notification)
    async function handleColdStart() {
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl?.url) {
        console.log(
          "[usePushNotifications] Cold start with URL:",
          launchUrl.url
        );
        // Parse deep link and navigate
      }
    }

    initialize();
    handleColdStart();

    return () => {
      PushNotifications.removeAllListeners();
      isInitialized.current = false;
    };
  }, [isLoggedIn, user, navigate]);
}
```

---

### Task 4: Integrate in App.tsx

```tsx
// In App.tsx or main layout
import { usePushNotifications } from './hooks/usePushNotifications';

function App() {
  // Initialize push notifications
  usePushNotifications();

  return (
    // ... rest of app
  );
}
```

---

## 🔗 **MCP Integration**

### Chrome DevTools MCP - Debug Navigation

```bash
warp mcp run devtools "inspect notification tap navigation flow"
```

### Supabase MCP - Check Logs

```bash
warp mcp run supabase "get_logs service=edge-function limit=20"
```

---

## 🧪 **Testing**

### Manual Testing Checklist

- [ ] **Foreground**: App open, receive notification → In-app banner shown
- [ ] **Background**: App minimized, tap notification → Opens correct conversation
- [ ] **Cold Start**: App killed, tap notification → Opens app and navigates
- [ ] **Navigation**: Verify route is `/messages/{conversationId}`

---

## ✅ **Definition of Done**

- [ ] In-app notification banner works
- [ ] Tap navigation works from background
- [ ] Cold start deep linking works
- [ ] Haptic feedback on notification
- [ ] Works on iOS and Android
- [ ] No console errors

---

**Next Story:** [STORY_8.6.5_Notification_Preferences.md](./STORY_8.6.5_Notification_Preferences.md)
