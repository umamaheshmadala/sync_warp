# Story 7.4.3: Apple Push Notification Service Setup (iOS) ⏸️ DEFERRED

**Epic**: EPIC 7.4 - Push Notifications Infrastructure  
**Story Points**: 5  
**Estimated Time**: 3-4 hours  
**Dependencies**: Story 7.4.1 complete (Capacitor Push Plugin)  
**Requires**: Apple Developer Account ($99/year)

---

## 📋 Overview

**What**: Configure Apple Push Notification Service (APNs) for iOS to enable push notification delivery to iOS devices.

**Why**: iOS push notifications require Apple Push Notification Service setup with proper certificates and provisioning. APNs is Apple's secure delivery system for push notifications.

**User Value**: iOS users can receive real-time push notifications about reviews, offers, and business updates.

---

## 🎯 Acceptance Criteria

- [ ] App ID created in Apple Developer portal
- [ ] Push Notifications capability enabled
- [ ] APNs Authentication Key (.p8) created and downloaded
- [ ] Xcode project configured with Push capability
- [ ] Test notification sent to iOS device
- [ ] Token registration verified
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Create App ID in Apple Developer Portal

**Navigate to**: https://developer.apple.com/account

**Steps**:
1. Go to **Certificates, Identifiers & Profiles**
2. Click **Identifiers** → **+** button
3. Select **App IDs** → Continue
4. **Description**: `SynC App`
5. **Bundle ID**: `com.sync.app` (Explicit - must match capacitor.config.ts)
6. **Capabilities**: ✅ Check **Push Notifications**
7. Click **Continue** → **Register**

**Acceptance**: ✅ App ID created with Push Notifications enabled

---

### Step 2: Create APNs Authentication Key

**In Apple Developer Portal**:

1. Go to **Keys** section
2. Click **+** button
3. **Key Name**: `SynC Push Notifications Key`
4. **Services**: ✅ Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. **Download** the .p8 file (you can only download once!)
7. Note your **Key ID** (e.g., `AB12CD34EF`)
8. Note your **Team ID** (in top right of portal)

**Save securely**:
```powershell
# Store in secure location (NOT in git)
# Example: ~/Documents/apple-keys/AuthKey_AB12CD34EF.p8
```

**Save Key ID and Team ID**:
- Store in Supabase Vault as secrets
- Will be needed for sending notifications

**Acceptance**: ✅ APNs key created and downloaded

---

### Step 3: Configure Xcode Project

**Open Xcode**:
```bash
npm run build
npx cap sync ios
npx cap open ios
```

**In Xcode**:

1. Select project in Navigator
2. Select **App** target
3. Go to **Signing & Capabilities** tab
4. Ensure **Automatically manage signing** is checked
5. Select your **Team** from dropdown
6. Click **+ Capability**
7. Add **Push Notifications**
8. ✅ Push Notifications should appear in capabilities list

**Verify Bundle ID**:
- Should match: `com.sync.app`
- If not, update in General tab

**Acceptance**: ✅ Xcode configured with Push capability

---

### Step 4: Update Provisioning Profile

**In Xcode**:

1. **Product** → **Clean Build Folder** (Shift+Cmd+K)
2. **Product** → **Build** (Cmd+B)
3. Xcode will automatically update provisioning profile

**Verify in Apple Developer Portal**:
1. Go to **Profiles**
2. Find your app's profile
3. Should include **Push Notifications** in enabled services

**Acceptance**: ✅ Provisioning profile updated

---

### Step 5: Test Token Registration on iOS

**Build and run on real device** (push doesn't work on simulator):

```bash
# Build and deploy to device
npm run build
npx cap sync ios
# Open in Xcode and run on connected device
```

**Test Steps**:
1. Connect iPhone/iPad via USB
2. Run app from Xcode (Cmd+R)
3. Grant push notification permission
4. Check Xcode console for: `[PushNotifications] Registration success: <APNS_TOKEN>`
5. Verify token in Supabase push_tokens table
6. ✅ Token should be hexadecimal format (e.g., `1a2b3c4d...`)

**Important**: APNs tokens only work on **real devices**, not simulators.

**Acceptance**: ✅ Token registration working on iOS

---

### Step 6: Send Test Notification

**Use APNs Testing Tool** or **Pusher** (free online tool):

**Option 1: Using Pusher (https://github.com/noodlewerk/NWPusher)**

1. Download NWPusher
2. Open application
3. Select your .p8 key file
4. Enter Key ID and Team ID
5. Select device (enter APNs token)
6. Compose notification:
   ```json
   {
     "aps": {
       "alert": {
         "title": "Test Notification",
         "body": "This is a test from APNs!"
       },
       "sound": "default",
       "badge": 1
     }
   }
   ```
7. Click **Push**

**Option 2: Using curl (terminal)**:

```bash
# Requires JWT token generation - more complex
# See Apple documentation
```

**Expected Result**:
- ✅ Notification appears on iOS device
- ✅ Sound plays
- ✅ Badge appears on app icon

**Acceptance**: ✅ Test notification received

---

### Step 7: Create APNs Configuration Documentation

**Create new file**: `docs/APNS_SETUP.md`

```markdown
# Apple Push Notification Service Setup 🍎

## Overview

APNs (Apple Push Notification Service) configuration for iOS push notifications.

---

## Apple Developer Requirements

- **Apple Developer Account**: $99/year
- **App ID**: com.sync.app
- **Capabilities**: Push Notifications enabled

---

## APNs Authentication Key

### Key Details
- **File**: AuthKey_AB12CD34EF.p8
- **Key ID**: AB12CD34EF (example)
- **Team ID**: XYZ1234567 (example)
- **Created**: [Date]

### Storage
- **Local**: Secure location (NOT in git)
- **Production**: Supabase Vault secrets

### Secrets to Store
```
APNS_KEY_ID=AB12CD34EF
APNS_TEAM_ID=XYZ1234567
APNS_KEY_CONTENT=<contents of .p8 file>
```

---

## Xcode Configuration

### Capabilities
- ✅ Push Notifications
- ✅ Background Modes → Remote notifications

### Bundle Identifier
```
com.sync.app
```

### Provisioning Profile
Must include Push Notifications capability.

---

## Token Format

APNs tokens are hex strings:
```
1a2b3c4d5e6f7890...
```

Stored in `push_tokens` table:
```sql
{
  user_id: 'uuid',
  token: '1a2b3c4d5e6f...',
  platform: 'ios',
  device_name: 'ios device'
}
```

---

## Testing

### Test Token Registration
1. Build app in Xcode
2. Run on **real iOS device** (not simulator)
3. Grant notification permission
4. Check console for APNs token
5. Verify token in push_tokens table

### Send Test Notification
Use NWPusher or similar tool:
1. Load .p8 key file
2. Enter Key ID and Team ID
3. Enter device token
4. Send test payload
5. Verify notification received

---

## Notification Payload

```json
{
  "aps": {
    "alert": {
      "title": "New Review",
      "body": "John gave you a 5-star review!"
    },
    "sound": "default",
    "badge": 1,
    "category": "review"
  },
  "data": {
    "type": "review",
    "businessId": "123",
    "reviewId": "456"
  }
}
```

---

## Troubleshooting

### Token not registering
- **MUST use real device** (simulator doesn't support push)
- Check Push Notifications capability in Xcode
- Verify provisioning profile includes push
- Check Apple Developer account is active

### Invalid provisioning profile
- Clean build folder in Xcode
- Delete and regenerate in Apple Developer portal
- Ensure Push Notifications capability included
- Re-download and install

### Test notification not received
- Verify .p8 key is correct
- Check Key ID and Team ID match
- Ensure device token is correct
- Check device has internet connection
- Verify app has notification permission

---

## Production vs Development

### Environments
- **Development**: Use with Debug builds (sandbox APNs)
- **Production**: Use with Release builds (production APNs)

### APNs Servers
- Dev: `api.sandbox.push.apple.com`
- Prod: `api.push.apple.com`

---

## Security Notes

- ✅ .p8 key file must NEVER be committed to git
- ✅ Store in Supabase Vault for production
- ✅ Rotate keys annually for security
- ❌ Never share .p8 file publicly

---

## Related

- **Story 7.4.1**: Capacitor Push Plugin
- **Story 7.4.2**: Firebase Cloud Messaging (Android)
- **Story 7.4.4**: Supabase Edge Function for sending
```

**Save as**: `docs/APNS_SETUP.md`

**Acceptance**: ✅ Documentation created

---

### Step 8: Commit iOS Configuration

**Terminal Commands**:
```powershell
git add ios/App/App.xcodeproj/project.pbxproj
git add docs/APNS_SETUP.md

git commit -m "feat: Configure Apple Push Notifications for iOS - Story 7.4.3

- Created App ID in Apple Developer portal
- Enabled Push Notifications capability
- Created APNs Authentication Key (.p8)
- Configured Xcode project with Push capability
- Updated provisioning profile
- Tested token registration on iOS device
- Verified test notification delivery
- Created APNs setup documentation

Changes:
- ios/App/App.xcodeproj/project.pbxproj: Push capability
- docs/APNS_SETUP.md: Setup documentation

Epic: 7.4 - Push Notifications Infrastructure
Story: 7.4.3 - Apple Push Notification Service Setup

Features:
- APNs token registration
- iOS push notification delivery
- Real device testing capability
- Production-ready configuration

Note: .p8 key file stored securely (not committed)"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] App ID created with Push Notifications
- [ ] APNs key (.p8) created and downloaded
- [ ] Key ID and Team ID noted
- [ ] Xcode Push capability added
- [ ] Provisioning profile updated
- [ ] Token registration tested on real device
- [ ] Test notification sent and received
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.4.3 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Can't create App ID
**Solution**:
- Verify Apple Developer account is active
- Check account has admin permissions
- Ensure bundle ID is unique

### Issue: Push capability not available
**Solution**:
- Verify App ID has Push Notifications enabled
- Regenerate provisioning profile
- Clean build folder and rebuild

### Issue: Token not registering
**Solution**:
- **MUST use real device** (critical!)
- Check Xcode console for errors
- Verify provisioning profile is valid
- Ensure app has notification permission

### Issue: Test notification fails
**Solution**:
- Verify .p8 key is correct file
- Check Key ID and Team ID are accurate
- Ensure device token is current
- Use sandbox APNs for debug builds

---

## 📚 Additional Notes

### What We Built
- ✅ Apple Developer configuration
- ✅ APNs authentication setup
- ✅ Xcode Push capability
- ✅ Token registration system

### Important Reminders
- **Real device required** for push testing
- **$99/year** Apple Developer Account needed
- **.p8 key** can only be downloaded once
- **Sandbox vs Production** APNs servers

### What's Next
- **Story 7.4.4**: Supabase Edge Function to send push notifications
- **Story 7.4.5**: Notification routing and handling

---

## 🔗 Related Documentation

- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
- [APNs Provider API](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
- [EPIC 7.4 Overview](../epics/EPIC_7.4_Push_Notifications.md)

---

**Story Status**: ⏸️ DEFERRED (Awaiting Mac/Xcode/Apple Developer Account)
**Deferred Date**: November 8, 2025
**Reason**: Requires Mac with Xcode and Apple Developer Account ($99/year). Will be implemented when hardware/account is available.
**Previous Story**: [STORY_7.4.2_Firebase_Cloud_Messaging.md](./STORY_7.4.2_Firebase_Cloud_Messaging.md)  
**Next Story**: [STORY_7.4.4_Supabase_Edge_Function.md](./STORY_7.4.4_Supabase_Edge_Function.md)  
**Epic Progress**: 2/6 stories complete (33%) - iOS deferred, proceeding with cross-platform backend
