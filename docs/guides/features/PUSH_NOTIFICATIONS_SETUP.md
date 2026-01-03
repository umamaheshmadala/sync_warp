# Push Notifications Setup 🔔

## Overview

Push notifications using @capacitor/push-notifications plugin for iOS and Android. The system automatically requests permissions and syncs tokens with the backend when users log in.

---

## Architecture

### Components

1. **usePushNotifications Hook** (`src/hooks/usePushNotifications.ts`)
   - Automatically registers push notifications for logged-in users
   - Handles permission requests
   - Syncs tokens to Supabase `push_tokens` table
   - Provides notification state management

2. **pushNotificationService** (`src/services/pushNotifications.ts`)
   - Singleton service for push notification operations
   - Event handling (received/tapped)
   - Token management
   - Permission control

3. **PushNotificationPrompt** (`src/components/PushNotificationPrompt.tsx`)
   - UI component for manual permission requests
   - Dismissible with localStorage persistence
   - Mobile-optimized design

---

## Usage

### Automatic Registration (Recommended)

Push notifications are automatically registered in `App.tsx` when a user logs in:

```typescript
import { usePushNotifications } from './hooks/usePushNotifications'

function App() {
  const user = useAuthStore(state => state.user)
  
  // Automatically register push notifications
  const pushState = usePushNotifications(user?.id ?? null)
  
  // Monitor status
  useEffect(() => {
    if (pushState.isRegistered && pushState.syncedToBackend) {
      console.log('✅ Push notifications fully enabled')
    }
  }, [pushState])
}
```

### Manual Control with Service

```typescript
import { pushNotificationService } from './services/pushNotifications'

// Initialize
await pushNotificationService.initialize()

// Request permissions
const granted = await pushNotificationService.requestPermissions()

// Get current token
const token = await pushNotificationService.getToken()

// Listen for notifications (foreground)
pushNotificationService.onNotificationReceived((notification) => {
  console.log('Received:', notification.title, notification.body)
})

// Listen for notification taps (background/killed)
pushNotificationService.onNotificationTapped((action) => {
  console.log('User tapped notification')
  // Navigate to relevant screen based on action.notification.data
})

// Cleanup
await pushNotificationService.removeAllListeners()
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
- Users can grant/deny on first launch

### iOS
- Requires Push Notifications capability in Xcode
- User must grant permission at runtime
- **MUST test on real device** (simulator doesn't support push)

---

## Token Management

### Database Schema

Tokens are automatically saved to `push_tokens` table:

```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
)
```

### Token Lifecycle

1. **User logs in** → usePushNotifications hook activates
2. **Permission requested** → User grants/denies
3. **Token generated** → OS provides device token
4. **Token saved locally** → Secure storage (SecureStorage)
5. **Token synced** → Upserted to Supabase `push_tokens` table
6. **User logs out** → Token remains (for multi-device support)

---

## Notification Payload

### Standard Format

```json
{
  "notification": {
    "title": "New Review",
    "body": "John gave you a 5-star review!"
  },
  "data": {
    "type": "review",
    "businessId": "123",
    "reviewId": "456",
    "url": "/business/123/reviews/456"
  }
}
```

### Handling Data Payloads

```typescript
pushNotificationService.onNotificationTapped((action) => {
  const data = action.notification.data
  
  switch(data.type) {
    case 'review':
      navigate(`/business/${data.businessId}/reviews/${data.reviewId}`)
      break
    case 'offer':
      navigate(`/offers/${data.offerId}`)
      break
    case 'follower':
      navigate(`/profile/${data.followerId}`)
      break
  }
})
```

---

## Testing

### Test Token Registration

1. **Build app for mobile**:
   ```bash
   npm run build
   npx cap sync android  # or ios
   ```

2. **Run on device**:
   ```bash
   npx cap run android  # or ios
   ```

3. **Expected Flow**:
   - User logs in
   - Permission prompt appears
   - User grants permission
   - Console shows: `[usePushNotifications] Token registered: <token>`
   - Console shows: `✅ Push notifications fully enabled`

4. **Verify in Database**:
   ```sql
   SELECT * FROM push_tokens WHERE user_id = '<user_id>';
   ```

### Send Test Notification

#### Android (FCM)
Use Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Select "Send test message"
3. Enter FCM token from database
4. Send

#### iOS (APNs)
Use APNs testing tool or send via backend.

---

## Troubleshooting

### Token not registering

**Symptoms**: Console shows no token, or "Registration error"

**Solutions**:
1. Check plugin installed: `npm list @capacitor/push-notifications`
2. Verify `npx cap sync` was run
3. Check console for specific errors
4. **iOS**: MUST test on real device (simulator doesn't support push)
5. Rebuild native project: `npx cap sync` → rebuild in Xcode/Android Studio

### Permission denied

**Symptoms**: Permission request returns "denied"

**Solutions**:
1. **Android**: Go to Settings → Apps → SynC → Notifications → Enable
2. **iOS**: Go to Settings → SynC → Notifications → Allow Notifications
3. **Reset**: Uninstall app completely and reinstall
4. Clear app data before reinstalling

### Token not saving to database

**Symptoms**: Token logged in console but not in `push_tokens` table

**Solutions**:
1. **Check user is logged in**: `supabase.auth.getUser()` must return user
2. **Verify table exists**: Query `push_tokens` table in Supabase dashboard
3. **Check RLS policies**: Ensure policies allow INSERT for authenticated users
4. **Review Supabase logs**: Check for permission errors
5. **Verify onConflict**: `onConflict: 'user_id,platform'` matches unique constraint

### iOS: Not working at all

**Symptoms**: Nothing happens on iOS

**Critical Requirements**:
1. **MUST use real device** (simulator doesn't support push notifications)
2. **Apple Developer account** must be active
3. **Push Notifications capability** must be enabled in Xcode
4. **Provisioning profile** must include push notifications
5. **APNs certificate** must be configured in Firebase (for FCM) or your backend

### Notifications not appearing

**Symptoms**: Token registered but no notifications show

**Solutions**:
1. **Android**:
   - Check notification channel settings
   - Verify app is not in battery optimization
   - Test with Firebase Console first

2. **iOS**:
   - Check notification settings in iOS Settings app
   - Verify APNs configuration
   - Test with APNs sandbox environment

### Multiple tokens for same user

**Symptoms**: User has multiple entries in `push_tokens` table

**Expected Behavior**: This is normal for multi-device support
- One entry per platform (iOS + Android = 2 entries)
- Old tokens are updated with `upsert` using `onConflict: 'user_id,platform'`

**If truly duplicate**:
- Check unique constraint is properly configured
- Verify upsert logic in `usePushNotifications.ts`

---

## State Management

### usePushNotifications Return Values

```typescript
{
  isRegistered: boolean        // Token successfully registered
  token: string | null          // FCM/APNs token
  permissionGranted: boolean    // User granted permission
  error: string | null          // Error message if failed
  syncedToBackend: boolean      // Token saved to Supabase
  removeTokenFromDatabase: () => Promise<void>  // Manual cleanup
}
```

### Status Examples

```typescript
// ✅ Success
{ isRegistered: true, syncedToBackend: true, error: null }

// ⚠️ Local only (backend sync failed)
{ isRegistered: true, syncedToBackend: false, error: "Sync failed" }

// ❌ Permission denied
{ isRegistered: false, permissionGranted: false, error: "Permission denied" }

// ⏳ In progress
{ isRegistered: false, permissionGranted: true, error: null }
```

---

## Security Considerations

### Token Storage

- **Local**: Stored in `SecureStorage` (Capacitor Preferences with encryption)
- **Backend**: Stored in `push_tokens` table with RLS policies
- **Never** expose tokens in client-side logs in production

### RLS Policies

Recommended policies for `push_tokens`:

```sql
-- Users can insert their own tokens
CREATE POLICY "Users can insert own tokens"
ON push_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own tokens"
ON push_tokens FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own tokens"
ON push_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Users can read their own tokens
CREATE POLICY "Users can read own tokens"
ON push_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

---

## Integration with Other Systems

### With Auth Flow

```typescript
// Auto-register on login
useEffect(() => {
  if (user) {
    // usePushNotifications hook handles this automatically
  }
}, [user])

// Clean up on logout
const handleLogout = async () => {
  // Optionally remove token from database
  if (pushState.token) {
    await pushState.removeTokenFromDatabase()
  }
  await signOut()
}
```

### With Notification Handlers

```typescript
// In App.tsx or notification handler
pushNotificationService.onNotificationReceived((notification) => {
  // Show in-app toast
  toast.success(notification.title, {
    description: notification.body
  })
})

pushNotificationService.onNotificationTapped((action) => {
  // Handle navigation
  const data = action.notification.data
  if (data.url) {
    navigate(data.url)
  }
})
```

---

## Performance & Best Practices

### Do's ✅

- ✅ Initialize once in App.tsx
- ✅ Request permissions after user logs in
- ✅ Store tokens securely
- ✅ Sync tokens to backend immediately
- ✅ Handle notification data payloads
- ✅ Test on real devices
- ✅ Clean up listeners on unmount

### Don'ts ❌

- ❌ Don't request permissions on app launch (wait for login)
- ❌ Don't log full tokens in production
- ❌ Don't test iOS push on simulator
- ❌ Don't forget to call `removeAllListeners()` on cleanup
- ❌ Don't assume token never changes (it can!)

---

## Related Stories

- **Story 7.4.1**: Capacitor Push Plugin (this document)
- **Story 7.4.2**: Firebase Cloud Messaging (Android configuration)
- **Story 7.4.3**: Apple Push Notifications (iOS configuration)
- **Story 7.4.4**: Supabase Edge Function (backend sending)

---

## Additional Resources

- [@capacitor/push-notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

**Last Updated**: 2025-01-08  
**Version**: 1.0  
**Status**: ✅ Complete
