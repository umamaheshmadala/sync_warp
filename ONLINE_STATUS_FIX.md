## Fix for Online Status Not Showing on Mobile

### Problem
The `is_online` field in the database is not being updated when users log in/out, so the mobile app shows all users as offline even when they're online in the web app.

### Solution
I've created a hook `useUpdateOnlineStatus` that automatically updates the database when users connect/disconnect.

### Manual Steps to Apply the Fix

**1. Add the import to `src/App.tsx`**

Find this line (around line 16):
```typescript
import DevMenu from './components/DevMenu'
```

Add this line right after it:
```typescript
import { useUpdateOnlineStatus } from './hooks/useUpdateOnlineStatus'
```

**2. Call the hook in `src/App.tsx`**

Find this section (around line 41):
```typescript
// Automatically register push notifications when user logs in
const pushState = usePushNotifications(user?.id ?? null)
```

Add these lines right after it:
```typescript
// Track user's online status in database
useUpdateOnlineStatus()
```

**3. Rebuild and test**

```bash
npm run build
npx cap sync android
```

Then rebuild in Android Studio and install on your device.

### What This Does

The `useUpdateOnlineStatus` hook:
- Sets `is_online = true` when user logs in
- Sets `is_online = false` when user logs out or closes the app
- Updates `last_active` timestamp every 30 seconds
- Handles tab visibility changes (app going to background)

### Testing

1. Log in on the web app
2. Run this SQL to verify you're marked as online:
   ```sql
   SELECT full_name, is_online FROM profiles WHERE email = 'your@email.com';
   ```
3. Open the mobile app and check if the green breathing dot appears for that user

### Files Created

- `src/hooks/useUpdateOnlineStatus.ts` - The hook that updates online status
- `src/components/friends/OnlineStatusBadge.tsx` - Updated green dot size from 12px to 16px for better mobile visibility
