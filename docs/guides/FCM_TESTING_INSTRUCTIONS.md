# FCM Push Notification Testing Instructions

## Prerequisites
✅ App is already installed on your device (RZ8NA1SLHSE)  
✅ Firebase configured with google-services.json  
✅ Push notification code implemented  

---

## 🧪 Testing Steps

### Step 1: Login to the App

**CRITICAL:** Push notifications only register after you log in!

1. Open the Sync App on your device
2. **Log in with your test account** or create a new account if needed
3. The app will automatically request notification permissions
4. **Grant permission** when prompted

> **Why?** The `usePushNotifications` hook in `App.tsx` only runs when `userId` is present.

---

### Step 2: Monitor FCM Registration

**In PowerShell Terminal:**

```powershell
# Clear old logs
adb logcat -c

# Start monitoring (run this in a separate terminal window)
adb logcat -v time | Select-String -Pattern "usePushNotifications|registration|token|Capacitor"
```

**What to look for:**
- ✅ `[usePushNotifications] Starting registration for user: <user_id>`
- ✅ `[usePushNotifications] Permission status received`
- ✅ `[usePushNotifications] Token registered: <FCM_TOKEN>`
- ✅ `[usePushNotifications] Token synced successfully`

**If you don't see logs:**
1. Make sure you're logged in
2. Check if the app is in foreground
3. Try restarting the app

---

### Step 3: Verify Token in Database

#### Option A: Use Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
2. Open **Table Editor** → **push_tokens**
3. Look for a row with:
   - `platform = 'android'`
   - Your `user_id`
   - A valid `token` (long string)
   - Recent `created_at` timestamp

#### Option B: Use SQL Editor
```sql
SELECT 
  id,
  user_id,
  token,
  platform,
  device_name,
  created_at
FROM push_tokens 
WHERE platform = 'android' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

### Step 4: Test the Debug Panel Button

Since the app has an `AuthDebugPanel` component:

1. Look for the **Debug Panel** in the bottom-right corner of the app
2. Click **"📱 Test Push Notifications"** button
3. Watch for the test result output

---

### Step 5: Send Test Notification

#### Method 1: Firebase Console (Easiest)

1. Go to: https://console.firebase.google.com/project/sync-warp/notification
2. Click **"Send your first message"** (or "New notification")
3. Fill in:
   - **Notification title:** "Test Notification"
   - **Notification text:** "This is a test from Firebase Console"
4. Click **"Send test message"**
5. **Paste your FCM token** from the database
6. Click **Test**

#### Method 2: Using PowerShell Script

```powershell
# Copy your token from Supabase, then run:
.\send-test-notification.ps1 -FcmToken "YOUR_FCM_TOKEN_HERE"
```

This will copy the token to clipboard and guide you to Firebase Console.

---

### Step 6: Verify Notification Reception

Test in **both modes**:

#### Foreground Mode:
1. Keep the app **open and active**
2. Send a test notification
3. Check console logs for: `[usePushNotifications] Notification received`
4. You should see an in-app notification or console log

#### Background Mode:
1. Press the **Home button** (don't force-close the app)
2. Send a test notification
3. You should see a notification in the **notification tray**
4. **Tap the notification** → app should open
5. Check console logs for: `[usePushNotifications] Notification tapped`

---

## 📊 Expected Results

| Test Case | Expected Behavior | Status |
|-----------|-------------------|--------|
| Permission Request | Dialog appears on login | ⏳ |
| Token Generation | FCM token logged in console | ⏳ |
| Token Sync | Token appears in `push_tokens` table | ⏳ |
| Foreground Notification | Console log + optional UI | ⏳ |
| Background Notification | System notification appears | ⏳ |
| Notification Tap | App opens and logs action | ⏳ |

---

## 🐛 Troubleshooting

### No Permission Dialog Appears
- Make sure you're logged in
- Check if permissions were previously denied (go to Android Settings → Apps → Sync App → Notifications)
- Clear app data and try again

### No Token Registered
- Check google-services.json is in `android/app/`
- Verify Firebase project matches package name `com.syncapp.mobile`
- Check device has internet connection
- Look for error logs: `registrationError`

### Token Not Syncing to Database
- Check Supabase connection (try other API calls)
- Verify `push_tokens` table exists and has proper schema
- Check RLS policies allow inserts for authenticated users

### Notifications Not Received
- Verify FCM server key is stored in Supabase Vault
- Test with Firebase Console first (uses legacy API by default)
- Check if notifications are blocked in device settings
- Try sending to background app first (easier to test)

---

## 📝 Next Steps After Testing

1. **Document Results** in `Story-7.4.1-FCM-Test-Results.md`
2. **Create Edge Function** for sending notifications via FCM V1 API
3. **Implement Real-Time Triggers** for events (new connection, message, etc.)
4. **Add Notification History** UI in the app

---

## 🛠️ Useful Commands

```powershell
# Check if device is connected
adb devices

# Launch app
adb shell monkey -p com.syncapp.mobile -c android.intent.category.LAUNCHER 1

# Clear app data (reset)
adb shell pm clear com.syncapp.mobile

# View app info
adb shell dumpsys package com.syncapp.mobile | Select-String -Pattern "versionName|versionCode"

# Check notification permissions
adb shell dumpsys notification --noredact com.syncapp.mobile
```

---

## 📚 Reference Files

- Push Notification Hook: `src/hooks/usePushNotifications.ts`
- Push Service: `src/services/pushNotifications.ts`
- App Entry: `src/App.tsx` (line 36)
- Debug Panel: `src/router/ProtectedRoute.tsx` (AuthDebugPanel component)
- Monitoring Script: `android/monitor-fcm-logs.ps1`
- Test Script: `send-test-notification.ps1`

---

**Ready to test!** Start with Step 1: Log in to the app, then proceed through each step.
