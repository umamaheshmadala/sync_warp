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

## Next Steps

After implementing this hook:
1. **Story 7.2.4**: Create push_tokens database table
2. **Story 7.2.5**: Sync tokens with Supabase (integrated auth flow)

---

## Related

- **Story 7.2.1**: Secure Storage (where tokens are stored)
- **Story 7.2.2**: Enhanced Supabase Client
