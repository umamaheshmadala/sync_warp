# usePushNotifications Hook 📱

## Overview

React hook that automatically handles push notification registration when users log in.

---

## Usage

```typescript
import { usePushNotifications } from './hooks/usePushNotifications';

function MyComponent() {
  const user = useUser(); // Your auth hook
  
  // Automatically registers when user logs in
  const pushState = usePushNotifications(user?.id ?? null);

  return (
    <div>
      {pushState.isRegistered && <p>✅ Push notifications enabled</p>}
      {pushState.error && <p>❌ {pushState.error}</p>}
    </div>
  );
}
```

---

## API

### Parameters
- `userId: string | null` - Current user ID (null if not logged in)

### Returns
```typescript
{
  isRegistered: boolean;     // Whether token is registered
  token: string | null;      // Push token (if registered)
  permissionGranted: boolean; // Whether permission was granted
  error: string | null;      // Error message (if any)
  syncedToBackend: boolean;  // Whether token is synced to Supabase
  removeTokenFromDatabase: () => Promise<void>; // Manual cleanup function
}
```

---

## How It Works

1. **Check Platform**: Only runs on iOS/Android (skips web)
2. **Check User**: Only registers if user is logged in
3. **Request Permission**: Shows native permission dialog
4. **Register Token**: Gets FCM (Android) or APNs (iOS) token
5. **Store Token**: Saves to secure storage for later sync
6. **Listen for Updates**: Handles token changes automatically

---

## Platform Support

- ✅ **iOS**: APNs tokens (requires real device)
- ✅ **Android**: FCM tokens
- ⏭️ **Web**: Gracefully skipped

---

## Requirements

### Android
- Firebase project set up
- `google-services.json` in `android/app/`
- Google Services plugin applied

### iOS
- Push Notifications capability enabled in Xcode
- Apple Developer account
- Real device (simulator doesn't support push)

---

## Error Handling

The hook handles errors gracefully:
- Permission denial → Returns error, app continues
- Registration failure → Logs error, can retry
- Platform not supported → Silently skips

---

## Integration with Supabase (Story 7.2.5)

The push notification hook automatically syncs tokens to Supabase when registered.

### How It Works

1. User logs in → Hook activates
2. Request permission → User accepts
3. Register with OS → Get FCM/APNs token
4. Store locally → Secure storage (encrypted)
5. **Sync to Supabase** → Save to push_tokens table
6. Backend can send notifications

### Database Schema

Tokens are stored in the `push_tokens` table:
```typescript
{
  user_id: UUID,      // User who owns the device
  token: string,      // FCM or APNs token
  platform: string,   // 'ios', 'android', or 'web'
  updated_at: Date    // Last update time
}
```

### Multiple Devices

Users can have multiple devices:
- Phone (iOS) → One token
- Tablet (Android) → Another token
- Each platform gets its own row

Constraint: `UNIQUE(user_id, platform)` ensures one token per platform.

### Token Lifecycle

```
Login → Register → Sync → Stored in DB
       ↓
Update → Sync → Updated in DB
       ↓
Logout → Remove → Deleted from DB
```

### Sign Out Behavior

When user signs out:
1. Token removed from push_tokens table
2. Token removed from secure storage
3. No more notifications sent to that device

### Sending Notifications

Backend can now query tokens and send notifications:

```typescript
// Get all devices for user
const { data: tokens } = await supabase
  .from('push_tokens')
  .select('token, platform')
  .eq('user_id', userId);

// Send to all devices
for (const t of tokens) {
  if (t.platform === 'android') {
    await sendFCM(t.token, message);
  } else if (t.platform === 'ios') {
    await sendAPNs(t.token, message);
  }
}
```

---

## Status Indicator

The `syncedToBackend` property indicates sync status:
- `true`: Token is in database, backend can send notifications ✅
- `false`: Token only local, sync failed (check network) ⚠️

```typescript
const pushState = usePushNotifications(user?.id);

if (pushState.syncedToBackend) {
  console.log('Backend can send notifications');
} else if (pushState.isRegistered) {
  console.log('Token local only, retry sync');
}
```

---

## Related

- **Story 7.2.1**: Secure Storage (where tokens are stored)
- **Story 7.2.2**: Enhanced Supabase Client
- **Story 7.2.4**: Push Tokens Database Table
- **Story 7.2.5**: Integrated Auth Flow (Supabase sync)
