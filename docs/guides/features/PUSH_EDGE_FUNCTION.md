# Push Notification Edge Function 🚀

## Overview

Supabase Edge Function for sending push notifications to iOS and Android devices. This serverless function integrates with Firebase Cloud Messaging (FCM) for Android and is prepared for Apple Push Notification Service (APNs) for iOS.

---

## Endpoint

```
POST https://ysxmgbblljoyebvugrfo.supabase.co/functions/v1/send-push-notification
```

### Authentication

```
Authorization: Bearer <supabase-anon-key>
```

---

## Request Body

```typescript
{
  userId: string       // UUID of user to notify
  title: string        // Notification title
  body: string         // Notification body
  data?: object        // Optional custom data
}
```

### Example Request

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "New Review",
  "body": "John gave you a 5-star review!",
  "data": {
    "type": "review",
    "businessId": "abc123",
    "reviewId": "xyz789"
  }
}
```

---

## Response Format

### Success Response

```typescript
{
  success: boolean     // Always true for successful requests
  sent: number         // Number of successful sends
  failed: number       // Number of failed sends
  total: number        // Total devices attempted
}
```

### Example Success Response

```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "total": 2
}
```

---

## Multi-Device Support

The function automatically sends to **all registered devices** for a user:

- Fetches tokens from `push_tokens` table
- Sends to both iOS and Android devices
- Returns aggregate results
- Uses `Promise.allSettled` to ensure all sends are attempted even if some fail

---

## Error Handling

### Missing User Tokens

```json
{
  "message": "No push tokens found for user"
}
```
**Status**: 200 (not an error, just no tokens available)

### Partial Failures

```json
{
  "success": true,
  "sent": 1,
  "failed": 1,
  "total": 2
}
```
Some devices succeeded, some failed (e.g., invalid token, network error)

### Complete Failure

```json
{
  "error": "FCM_SERVER_KEY not configured in Supabase Vault"
}
```
**Status**: 500

### Invalid Request

```json
{
  "error": "Missing required fields: userId, title, body"
}
```
**Status**: 400

---

## Required Secrets

Set in Supabase Dashboard → Project Settings → Vault → New Secret:

| Secret | Source | Status |
|--------|--------|--------|
| `FCM_SERVICE_ACCOUNT` | Firebase Console → Service Accounts | ✅ Required for Android |
| `APNS_KEY_ID` | Apple Developer Portal | ⏸️ Deferred (Story 7.4.3) |
| `APNS_TEAM_ID` | Apple Developer Portal | ⏸️ Deferred (Story 7.4.3) |
| `APNS_KEY_CONTENT` | Contents of .p8 file | ⏸️ Deferred (Story 7.4.3) |

### Setting Secrets

**Getting FCM V1 Service Account Credentials:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., `sync-warp-f552f`)
3. Click **Settings** ⚙️ → **Service accounts**
4. Click **Firebase Admin SDK** tab
5. Click **Generate new private key**
6. Download the JSON file (contains service account credentials)

**Adding to Supabase Vault:**

**Option 1: Supabase Dashboard (Recommended)**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Project Settings** → **Vault**
3. Click **New Secret**
4. Name: `FCM_SERVICE_ACCOUNT`
5. Value: (paste the **entire contents** of the downloaded service account JSON file)
6. Click **Save**

**Option 2: Supabase CLI**
```powershell
# Store the service account JSON as a secret
# Note: Escape quotes properly or use a file
supabase secrets set FCM_SERVICE_ACCOUNT='<paste-entire-json-here>'
```

---

## Usage Examples

### From Client (TypeScript/JavaScript)

```typescript
import { supabase } from './lib/supabase'

async function sendNotificationToUser(userId: string) {
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      userId: userId,
      title: 'Hello!',
      body: 'You have a new message',
      data: { 
        type: 'message', 
        messageId: '123' 
      }
    }
  })
  
  if (error) {
    console.error('Failed to send notification:', error)
    return
  }
  
  console.log(`Notification sent to ${data.sent} devices`)
}
```

### From Backend Trigger (SQL)

```sql
-- Call from SQL trigger when new review is created
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function to send notification
  PERFORM net.http_post(
    url := 'https://ysxmgbblljoyebvugrfo.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'userId', NEW.business_owner_id,
      'title', 'New Review!',
      'body', format('You received a new %s-star review', NEW.rating),
      'data', jsonb_build_object(
        'type', 'review',
        'reviewId', NEW.id,
        'businessId', NEW.business_id
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_new_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_review();
```

### Using curl

```bash
curl -X POST \
  "https://ysxmgbblljoyebvugrfo.supabase.co/functions/v1/send-push-notification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{
    "userId": "<test-user-uuid>",
    "title": "Test Notification",
    "body": "This is a test!",
    "data": {"type": "test"}
  }'
```

---

## Platform-Specific Notes

### Android (FCM)

- ✅ **Implemented and tested**
- Uses Firebase Cloud Messaging V1 API (modern, recommended)
- Requires `FCM_SERVICE_ACCOUNT` secret (service account JSON)
- Uses OAuth2 authentication with Google APIs
- Works on emulators and real devices
- Notifications appear in system tray
- Supports custom data payload

### iOS (APNs)

- ⏸️ **Deferred to Story 7.4.3**
- Requires Apple Developer account
- Requires APNs key (.p8 file) credentials
- **Only works on real devices** (not simulators)
- Uses production APNs server
- Function structure is ready, implementation pending

---

## Deployment

### Deploy Function

```powershell
# Deploy to Supabase
supabase functions deploy send-push-notification

# Verify deployment
supabase functions list
```

### Set Secrets

```powershell
# Get FCM Service Account from Firebase Console
# Firebase Console → Settings → Service accounts → Generate new private key
# Download the JSON file

# Set the secret (paste entire JSON content)
supabase secrets set FCM_SERVICE_ACCOUNT='<paste-service-account-json>'

# Alternative: Use Supabase Dashboard (recommended for JSON)
# Dashboard → Project Settings → Vault → New Secret
# Name: FCM_SERVICE_ACCOUNT
# Value: <paste entire JSON>

# List secrets (values are hidden)
supabase secrets list
```

---

## Troubleshooting

### Function not found (404)

**Cause**: Function not deployed or wrong project reference

**Solution**:
```powershell
# Check project link
supabase projects list

# Ensure sync_warp project is linked (● symbol)
# Deploy again
supabase functions deploy send-push-notification
```

### FCM authentication error

**Cause**: Missing or incorrect FCM_SERVICE_ACCOUNT

**Solution**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project `sync-warp-f552f`
3. Settings → Service accounts → Firebase Admin SDK
4. Click **Generate new private key**
5. Download the JSON file
6. In Supabase Dashboard → Project Settings → Vault
7. Create secret `FCM_SERVICE_ACCOUNT` with the entire JSON content

### No notifications received

**Causes**:
- No tokens in `push_tokens` table for user
- Device token expired or invalid
- Device not connected to internet
- Notification permissions not granted

**Solution**:
1. Check tokens exist:
   ```sql
   SELECT * FROM push_tokens WHERE user_id = '<uuid>';
   ```
2. Verify device has granted notification permissions
3. Check function logs in Supabase Dashboard → Edge Functions → Logs
4. Test with fresh device token

### "No push tokens found for user"

**Cause**: User hasn't registered for push notifications

**Solution**:
- Ensure app has registered push token (Story 7.4.1)
- Check device logged in with correct user
- Verify `usePushNotifications` hook is initialized

### Partial failures (some devices succeed, some fail)

**Cause**: Individual device issues (invalid/expired tokens)

**Solution**:
- Normal behavior for multi-device users
- Expired tokens should be cleaned up
- Consider implementing token refresh logic

---

## Database Schema

The function relies on the `push_tokens` table:

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Monitoring

### View Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **send-push-notification**
3. Click **Logs** tab
4. View real-time execution logs

### Key Metrics to Monitor

- **Invocation count**: How often function is called
- **Success rate**: Percentage of successful sends
- **Error rate**: Failed sends
- **Execution time**: Performance
- **Token validity**: How many tokens are invalid/expired

---

## Security Considerations

1. **Authentication Required**: All requests must include valid Supabase auth token
2. **JWT Verification**: Function verifies JWT by default (`verify_jwt = true`)
3. **Secrets Management**: FCM keys stored securely in Supabase Vault
4. **RLS Policies**: Users can only manage their own tokens
5. **Service Role**: Function uses service role key to query database

---

## Performance

- **Cold Start**: ~500-1000ms (first invocation after inactivity)
- **Warm Start**: ~100-300ms (subsequent invocations)
- **Multi-device**: Parallel sends using `Promise.allSettled`
- **Timeout**: 60 seconds default (configurable)
- **Auto-scaling**: Handled by Supabase Edge Runtime

---

## Cost Considerations

- **Supabase Edge Functions**: Free tier includes 500K requests/month
- **Firebase Cloud Messaging**: Free (unlimited)
- **Database Queries**: Included in Supabase plan
- **Outbound Bandwidth**: Minimal (notification payloads are small)

---

## Future Enhancements

- [ ] APNs implementation (Story 7.4.3)
- [ ] Token refresh and cleanup
- [ ] Batch notification sending
- [ ] Notification templates
- [ ] Scheduling support
- [ ] Analytics and tracking
- [ ] Delivery receipts
- [ ] Silent notifications
- [ ] Image attachments

---

## Related Documentation

- **Story 7.4.1**: [Capacitor Push Plugin Setup](./stories/STORY_7.4.1_Capacitor_Push_Plugin.md)
- **Story 7.4.2**: [Firebase Cloud Messaging Setup](./stories/STORY_7.4.2_Firebase_Cloud_Messaging.md)
- **Story 7.4.3**: [Apple Push Notifications (Deferred)](./stories/STORY_7.4.3_Apple_Push_Notifications.md)
- **Epic 7.4**: [Push Notifications Infrastructure](./epics/EPIC_7.4_Push_Notifications.md)

---

## Testing

### Manual Test

1. Get your user ID from Supabase:
   ```sql
   SELECT id FROM auth.users WHERE email = 'your@email.com';
   ```

2. Send test notification:
   ```bash
   curl -X POST \
     "https://ysxmgbblljoyebvugrfo.supabase.co/functions/v1/send-push-notification" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <anon-key>" \
     -d '{
       "userId": "<your-user-id>",
       "title": "Test Notification",
       "body": "Hello from Edge Function!",
       "data": {"type": "test"}
     }'
   ```

3. Check your Android device for notification

### Automated Test

See Story 7.4.6 for E2E testing setup.

---

**Documentation Version**: 1.0  
**Last Updated**: 2025-11-08  
**Status**: ✅ Android Implemented, ⏸️ iOS Deferred
