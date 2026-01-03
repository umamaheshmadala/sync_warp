# Notification Routing & Handling 🚦

## Overview

Deep linking and routing system for push notifications in the Sync mobile app. This system handles both foreground (in-app toast) and background/killed (system notification) states.

---

## Architecture

### Components

1. **NotificationRouter** (`src/services/notificationRouter.ts`)
   - Core routing logic
   - Maps notification types to app screens
   - Validates notification data

2. **NotificationToast** (`src/components/NotificationToast.tsx`)
   - In-app toast UI for foreground notifications
   - Auto-dismisses after 5 seconds
   - Tappable to navigate

3. **useNotificationHandler** (`src/hooks/useNotificationHandler.ts`)
   - React hook for notification handling
   - Sets up Capacitor Push listeners
   - Manages foreground notification state

---

## Notification Types

| Type | Description | Route Pattern | Example |
|------|-------------|---------------|---------|
| `review` | New review received | `/business/:id/reviews/:reviewId` | Business review page |
| `offer` | New offer available | `/business/:id/offers/:offerId` | Offer details |
| `business` | Business update | `/business/:id` | Business profile |
| `follower` | New follower | `/profile/:userId` | User profile |
| `message` | New message | `/messages/:messageId` | Message thread |
| `test` | Test notification | `/` | Home page |

---

## Notification Data Structure

```typescript
interface NotificationData {
  type: NotificationType
  businessId?: string
  reviewId?: string
  offerId?: string
  userId?: string
  messageId?: string
  [key: string]: any  // Extensible
}
```

### Example Payloads

**Review Notification:**
```json
{
  "userId": "user-uuid",
  "title": "New Review!",
  "body": "John gave you a 5-star review",
  "data": {
    "type": "review",
    "businessId": "business-123",
    "reviewId": "review-456"
  }
}
```

**Offer Notification:**
```json
{
  "userId": "user-uuid",
  "title": "Special Offer 🎁",
  "body": "20% off your next visit!",
  "data": {
    "type": "offer",
    "businessId": "business-123",
    "offerId": "offer-789"
  }
}
```

**Follower Notification:**
```json
{
  "userId": "user-uuid",
  "title": "New Follower",
  "body": "Sarah started following you",
  "data": {
    "type": "follower",
    "userId": "sarah-uuid"
  }
}
```

---

## App States

### 1. Foreground (App Open)

**Behavior:**
- In-app toast appears at top of screen
- Notification sound plays (iOS/Android default)
- Toast auto-dismisses after 5 seconds
- User can tap toast to navigate
- User can dismiss toast manually with × button

**User Experience:**
```
┌─────────────────────────────┐
│ 📝 REVIEW               × │
│ New Review!                 │
│ John gave you a 5-star...   │
│ Tap to view                 │
└─────────────────────────────┘
```

### 2. Background (App Minimized)

**Behavior:**
- System notification appears in notification tray
- Notification sound/vibration
- Tapping notification:
  - Brings app to foreground
  - Navigates to appropriate screen
  - No toast shown (direct navigation)

### 3. Killed (App Closed)

**Behavior:**
- System notification appears in notification tray
- Notification sound/vibration
- Tapping notification:
  - Launches app
  - Waits for app initialization
  - Navigates to appropriate screen

---

## Implementation

### Using the Notification Handler

The `useNotificationHandler` hook is already integrated in `App.tsx`:

```typescript
import { useNotificationHandler } from './hooks/useNotificationHandler'
import { NotificationToast } from './components/NotificationToast'

function App() {
  const { foregroundNotification, handleToastTap, handleToastDismiss } = useNotificationHandler()

  return (
    <div>
      {/* App content */}
      
      {/* Foreground notification toast */}
      {foregroundNotification && (
        <NotificationToast
          title={foregroundNotification.title}
          body={foregroundNotification.body}
          data={foregroundNotification.data}
          onTap={handleToastTap}
          onDismiss={handleToastDismiss}
        />
      )}
    </div>
  )
}
```

### Manual Routing

You can manually route using the NotificationRouter:

```typescript
import { NotificationRouter } from './services/notificationRouter'
import { useNavigate } from 'react-router-dom'

function MyComponent() {
  const navigate = useNavigate()
  
  const handleNavigate = () => {
    NotificationRouter.route({
      type: 'review',
      businessId: 'business-123',
      reviewId: 'review-456'
    }, navigate)
  }
}
```

---

## Testing

### Testing Notification Routing

Send a test notification using the Edge Function:

```powershell
Invoke-RestMethod -Uri "https://ysxmgbblljoyebvugrfo.supabase.co/functions/v1/send-push-notification" `
  -Method Post `
  -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer <anon-key>"} `
  -Body '{
    "userId": "<user-id>",
    "title": "Test Notification",
    "body": "Testing routing!",
    "data": {
      "type": "test",
      "source": "manual-test"
    }
  }'
```

### Test Checklist

For each notification type, test all three states:

- [ ] **Foreground Test**
  1. Open app
  2. Send notification
  3. ✅ Toast appears
  4. ✅ Tap toast → navigates correctly

- [ ] **Background Test**
  1. Minimize app
  2. Send notification
  3. ✅ System notification appears
  4. ✅ Tap notification → app opens and navigates

- [ ] **Killed Test**
  1. Close app completely
  2. Send notification
  3. ✅ System notification appears
  4. ✅ Tap notification → app launches and navigates

### Test Notifications

```json
// Review
{
  "data": {
    "type": "review",
    "businessId": "test-business",
    "reviewId": "test-review"
  }
}

// Offer
{
  "data": {
    "type": "offer",
    "businessId": "test-business",
    "offerId": "test-offer"
  }
}

// Business
{
  "data": {
    "type": "business",
    "businessId": "test-business"
  }
}

// Follower
{
  "data": {
    "type": "follower",
    "userId": "test-user"
  }
}

// Message
{
  "data": {
    "type": "message",
    "messageId": "test-message"
  }
}
```

---

## Customization

### Adding New Notification Types

1. **Update Type Definition**
```typescript
// src/services/notificationRouter.ts
export type NotificationType = 'review' | 'offer' | 'follower' | 'business' | 'message' | 'custom'
```

2. **Add Routing Logic**
```typescript
case 'custom':
  if (data.customId) {
    navigate(`/custom/${data.customId}`)
  }
  break
```

3. **Add Type Label & Color**
```typescript
static getTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    // ... existing labels
    custom: '✨ Custom'
  }
  return labels[type] || '🔔 Notification'
}

static getTypeColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    // ... existing colors
    custom: '#FF6B6B'
  }
  return colors[type] || '#007AFF'
}
```

### Customizing Toast Appearance

Edit `src/components/NotificationToast.css`:

```css
.notification-toast {
  /* Adjust position, size, colors */
  top: 80px;  /* Change distance from top */
  max-width: 400px;  /* Change width */
  border-radius: 20px;  /* More rounded */
}
```

### Custom Toast Duration

Edit `src/components/NotificationToast.tsx`:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    handleDismiss()
  }, 7000)  // Change from 5000 to 7000 (7 seconds)

  return () => clearTimeout(timer)
}, [])
```

---

## Platform-Specific Notes

### Android

- Uses Firebase Cloud Messaging (FCM)
- Notifications work on emulators and real devices
- System notifications use default Android style
- Notification channels: "default"

### iOS

- Uses Apple Push Notification Service (APNs)
- **Only works on real devices** (not simulators)
- System notifications use iOS design
- Requires APNs configuration (Story 7.4.3 - deferred)

### Web

- Push notifications are disabled on web
- `useNotificationHandler` automatically skips setup
- No toast or routing on web platform

---

## Troubleshooting

### Toast Not Appearing

**Symptoms:** Notification received but no toast shows

**Solutions:**
1. Check console for `[useNotificationHandler]` logs
2. Verify `foregroundNotification` state is set
3. Ensure `NotificationToast` is rendered in App.tsx
4. Check notification data includes valid `type`

### Routing Not Working

**Symptoms:** Toast or notification tap doesn't navigate

**Solutions:**
1. Verify routes exist in React Router configuration
2. Check notification data structure
3. Review console for `[NotificationRouter]` errors
4. Ensure `navigate` function is available

### Background Tap Not Routing

**Symptoms:** Tapping notification in background doesn't navigate

**Solutions:**
1. Check `pushNotificationActionPerformed` listener is set up
2. Verify app has finished initializing before routing
3. Ensure notification data includes `type` field
4. Check device logs (Logcat/Xcode) for errors

### Invalid Notification Data

**Symptoms:** Console shows "Invalid notification data"

**Solutions:**
1. Validate notification payload includes `type` field
2. Check `type` is one of the valid notification types
3. Ensure data is properly formatted JSON
4. Review Edge Function logs for send errors

---

## Performance

- **Toast Animation:** 300ms slide-in, 300ms slide-out
- **Auto-dismiss:** 5 seconds
- **Memory:** Minimal (single notification state)
- **Listeners:** Cleaned up on component unmount
- **Re-renders:** Optimized with `useCallback` hooks

---

## Accessibility

- Toast has `role="alert"` for screen readers
- Toast has `aria-live="polite"` for announcements
- Close button has `aria-label="Dismiss notification"`
- Keyboard navigation supported (Tab, Enter, Escape)
- Reduced motion support via CSS media query

---

## Security

- Notification data is validated before routing
- Only predefined notification types are allowed
- Navigation uses React Router (no direct URL manipulation)
- User authentication required for push token registration
- RLS policies protect push_tokens table

---

## Related Documentation

- [Push Notifications Setup](./PUSH_NOTIFICATIONS_SETUP.md)
- [Push Edge Function](./PUSH_EDGE_FUNCTION.md)
- [Story 7.4.1: Capacitor Push Plugin](./stories/STORY_7.4.1_Capacitor_Push_Plugin.md)
- [Story 7.4.4: Supabase Edge Function](./stories/STORY_7.4.4_Supabase_Edge_Function.md)
- [Story 7.4.5: Notification Handling](./stories/STORY_7.4.5_Notification_Handling.md)

---

## Future Enhancements

- [ ] Notification history/inbox
- [ ] Notification preferences/settings
- [ ] Custom sounds per notification type
- [ ] Rich media notifications (images)
- [ ] Notification grouping
- [ ] Silent notifications
- [ ] Scheduled notifications
- [ ] Notification analytics
- [ ] Deep link parsing from URLs
- [ ] Notification templates

---

**Version:** 1.0  
**Last Updated:** 2025-11-09  
**Status:** ✅ Production Ready
