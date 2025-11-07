# Story 7.4.4: Supabase Edge Function for Push Sending ⚪ PLANNED

**Epic**: EPIC 7.4 - Push Notifications Infrastructure  
**Story Points**: 6  
**Estimated Time**: 4-5 hours  
**Dependencies**: Stories 7.4.2 (FCM) and 7.4.3 (APNs) complete

---

## 📋 Overview

**What**: Create a Supabase Edge Function that sends push notifications to both iOS (APNs) and Android (FCM) devices by fetching user tokens and integrating with push services.

**Why**: Backend needs a secure, serverless way to send notifications. Edge Functions run close to users, provide automatic scaling, and can access Supabase secrets securely.

**User Value**: Users receive notifications triggered by backend events (new reviews, offers, followers) without manual intervention.

---

## 🎯 Acceptance Criteria

- [ ] send-push-notification Edge Function created
- [ ] FCM API integration working
- [ ] APNs API integration working
- [ ] Fetches user tokens from push_tokens table
- [ ] Sends to all user devices (multi-device support)
- [ ] Error handling and retries implemented
- [ ] Tested with both iOS and Android
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Install Supabase CLI (if not installed)

**Terminal Commands**:
```powershell
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version

# Initialize Supabase in project (if not already)
supabase init
```

**Acceptance**: ✅ Supabase CLI ready

---

### Step 2: Create Edge Function

**Terminal Commands**:
```powershell
# Create new Edge Function
supabase functions new send-push-notification
```

**This creates**: `supabase/functions/send-push-notification/index.ts`

**Acceptance**: ✅ Function scaffold created

---

### Step 3: Implement Push Notification Edge Function

**File to Edit**: `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, any>
}

interface PushToken {
  token: string
  platform: 'ios' | 'android'
}

// Send notification to FCM (Android)
async function sendToFCM(token: string, title: string, body: string, data: Record<string, any>) {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')
  
  if (!FCM_SERVER_KEY) {
    throw new Error('FCM_SERVER_KEY not configured')
  }

  const fcmPayload = {
    to: token,
    notification: {
      title,
      body,
      sound: 'default',
    },
    data,
    priority: 'high',
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('FCM Error:', error)
    throw new Error(`FCM failed: ${response.status}`)
  }

  return await response.json()
}

// Send notification to APNs (iOS)
async function sendToAPNs(token: string, title: string, body: string, data: Record<string, any>) {
  const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID')
  const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID')
  const APNS_KEY_CONTENT = Deno.env.get('APNS_KEY_CONTENT')
  
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_KEY_CONTENT) {
    throw new Error('APNs credentials not configured')
  }

  // Generate JWT token for APNs
  const jwtToken = await generateAPNsJWT(APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_CONTENT)

  const apnsPayload = {
    aps: {
      alert: {
        title,
        body,
      },
      sound: 'default',
      badge: 1,
    },
    ...data,
  }

  // Use production APNs server (change to sandbox for development)
  const apnsUrl = `https://api.push.apple.com/3/device/${token}`

  const response = await fetch(apnsUrl, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwtToken}`,
      'apns-topic': 'com.sync.app', // Your bundle ID
      'apns-priority': '10',
    },
    body: JSON.stringify(apnsPayload),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('APNs Error:', error)
    throw new Error(`APNs failed: ${response.status}`)
  }

  return { success: true }
}

// Generate JWT for APNs authentication
async function generateAPNsJWT(keyId: string, teamId: string, privateKey: string): Promise<string> {
  // Import JWT library
  const { create, getNumericDate } = await import('https://deno.land/x/djwt@v2.8/mod.ts')
  
  // Parse private key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  )

  const payload = {
    iss: teamId,
    iat: getNumericDate(new Date()),
  }

  const header = {
    alg: 'ES256',
    kid: keyId,
  }

  return await create(header, payload, key)
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  
  const binaryString = atob(pemContents)
  const bytes = new Uint8Array(binaryString.length)
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  return bytes.buffer
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { userId, title, body, data = {} }: NotificationPayload = await req.json()

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all push tokens for user
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (tokenError) {
      console.error('Error fetching tokens:', tokenError)
      throw tokenError
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send notifications to all devices
    const results = await Promise.allSettled(
      tokens.map(async ({ token, platform }: PushToken) => {
        if (platform === 'android') {
          return await sendToFCM(token, title, body, data)
        } else if (platform === 'ios') {
          return await sendToAPNs(token, title, body, data)
        }
        throw new Error(`Unknown platform: ${platform}`)
      })
    )

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Sent ${successful}/${tokens.length} notifications (${failed} failed)`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: tokens.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Acceptance**: ✅ Edge Function implemented

---

### Step 4: Add Secrets to Supabase

**In Supabase Dashboard**:

1. Go to **Project Settings** → **Vault**
2. Add the following secrets:

```
FCM_SERVER_KEY=<your-fcm-server-key>
APNS_KEY_ID=<your-apns-key-id>
APNS_TEAM_ID=<your-apns-team-id>
APNS_KEY_CONTENT=<contents-of-p8-file>
```

**Get values from**:
- FCM_SERVER_KEY: Firebase Console → Cloud Messaging
- APNS_KEY_ID: From Step 2 of Story 7.4.3
- APNS_TEAM_ID: Apple Developer Portal (top right)
- APNS_KEY_CONTENT: Contents of .p8 file (entire file as string)

**Acceptance**: ✅ Secrets configured

---

### Step 5: Deploy Edge Function

**Terminal Commands**:
```powershell
# Login to Supabase (if not already)
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the function
supabase functions deploy send-push-notification

# Set secrets (alternative to dashboard)
supabase secrets set FCM_SERVER_KEY=<value>
supabase secrets set APNS_KEY_ID=<value>
supabase secrets set APNS_TEAM_ID=<value>
supabase secrets set APNS_KEY_CONTENT=<value>
```

**Expected Output**:
```
Deploying function send-push-notification...
✓ Function deployed successfully
Function URL: https://<project-ref>.supabase.co/functions/v1/send-push-notification
```

**Acceptance**: ✅ Function deployed

---

### Step 6: Test Edge Function

**Create test script**: `test-push.http` (or use curl)

```http
POST https://<your-project-ref>.supabase.co/functions/v1/send-push-notification
Content-Type: application/json
Authorization: Bearer <your-anon-key>

{
  "userId": "<test-user-uuid>",
  "title": "Test Notification",
  "body": "This is a test from Supabase Edge Function!",
  "data": {
    "type": "test",
    "timestamp": "2025-01-07T04:30:00Z"
  }
}
```

**Or use curl**:
```powershell
curl -X POST `
  "https://<your-project-ref>.supabase.co/functions/v1/send-push-notification" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <your-anon-key>" `
  -d '{
    "userId": "<test-user-uuid>",
    "title": "Test Notification",
    "body": "This is a test!",
    "data": {"type": "test"}
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "total": 2
}
```

**Verify**:
- ✅ Notification received on Android device
- ✅ Notification received on iOS device

**Acceptance**: ✅ Function tested successfully

---

### Step 7: Create Database Trigger for Automatic Notifications

**Example: Send notification when new review is created**

**Create SQL function**:
```sql
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function to send notification
  PERFORM net.http_post(
    url := '<your-supabase-url>/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <service-role-key>'
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

**Acceptance**: ✅ Trigger created (optional)

---

### Step 8: Create Documentation

**Create new file**: `docs/PUSH_EDGE_FUNCTION.md`

```markdown
# Push Notification Edge Function 🚀

## Overview

Supabase Edge Function for sending push notifications to iOS and Android devices.

---

## Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/send-push-notification
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

### Example
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

## Response

```typescript
{
  success: boolean
  sent: number      // Number of successful sends
  failed: number    // Number of failed sends
  total: number     // Total devices attempted
}
```

---

## Multi-Device Support

Function automatically sends to **all registered devices** for a user:
- Fetches tokens from `push_tokens` table
- Sends to both iOS and Android devices
- Returns aggregate results

---

## Error Handling

### Missing User Tokens
```json
{
  "message": "No push tokens found for user"
}
```

### Partial Failures
```json
{
  "success": true,
  "sent": 1,
  "failed": 1,
  "total": 2
}
```
Some devices succeeded, some failed (e.g., invalid token)

### Complete Failure
```json
{
  "error": "FCM_SERVER_KEY not configured"
}
```

---

## Required Secrets

Set in Supabase Dashboard → Vault:

| Secret | Source |
|--------|--------|
| `FCM_SERVER_KEY` | Firebase Console |
| `APNS_KEY_ID` | Apple Developer Portal |
| `APNS_TEAM_ID` | Apple Developer Portal |
| `APNS_KEY_CONTENT` | Contents of .p8 file |

---

## Usage Examples

### From Backend Trigger
```sql
-- Call from SQL trigger
PERFORM net.http_post(
  url := 'https://<project>.supabase.co/functions/v1/send-push-notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer <service-role-key>'
  ),
  body := jsonb_build_object(
    'userId', user_id_variable,
    'title', 'Notification Title',
    'body', 'Notification Body'
  )
);
```

### From Client (TypeScript)
```typescript
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: currentUserId,
    title: 'Hello!',
    body: 'You have a new message',
    data: { type: 'message', messageId: '123' }
  }
})
```

---

## Platform-Specific Notes

### Android (FCM)
- Uses Firebase Cloud Messaging API
- Requires FCM_SERVER_KEY
- Works on emulators and real devices

### iOS (APNs)
- Uses Apple Push Notification Service
- Requires APNs key (.p8) credentials
- **Only works on real devices**
- Uses production APNs server

---

## Deployment

```bash
# Deploy function
supabase functions deploy send-push-notification

# Set secrets
supabase secrets set FCM_SERVER_KEY=<value>
supabase secrets set APNS_KEY_ID=<value>
supabase secrets set APNS_TEAM_ID=<value>
supabase secrets set APNS_KEY_CONTENT=<value>
```

---

## Troubleshooting

### Function not found
- Verify deployment: `supabase functions list`
- Check project linked: `supabase status`

### FCM/APNs errors
- Verify secrets are set
- Check token format is correct
- Ensure device tokens are fresh

### No notifications received
- Check device tokens in push_tokens table
- Verify userId is correct
- Check function logs in Supabase Dashboard

---

## Related

- **Story 7.4.1**: Capacitor Push Plugin
- **Story 7.4.2**: Firebase Cloud Messaging
- **Story 7.4.3**: Apple Push Notifications
```

**Save as**: `docs/PUSH_EDGE_FUNCTION.md`

**Acceptance**: ✅ Documentation created

---

### Step 9: Commit Edge Function

**Terminal Commands**:
```powershell
git add supabase/functions/send-push-notification/
git add docs/PUSH_EDGE_FUNCTION.md

git commit -m "feat: Create Supabase Edge Function for push notifications - Story 7.4.4

- Created send-push-notification Edge Function
- Integrated FCM API for Android notifications
- Integrated APNs API for iOS notifications
- Fetches user tokens from push_tokens table
- Multi-device support (sends to all user devices)
- Error handling and retry logic
- Tested with both iOS and Android
- Created comprehensive documentation

Changes:
- supabase/functions/send-push-notification/index.ts: Edge Function
- docs/PUSH_EDGE_FUNCTION.md: API documentation

Epic: 7.4 - Push Notifications Infrastructure
Story: 7.4.4 - Supabase Edge Function for Push Sending

Features:
- Server-side notification sending
- FCM and APNs integration
- Multi-device support
- Secure secret management
- Automatic scaling"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] Edge Function created
- [ ] FCM integration working
- [ ] APNs integration working
- [ ] Fetches tokens from database
- [ ] Multi-device support tested
- [ ] Error handling implemented
- [ ] Secrets configured in Supabase
- [ ] Function deployed successfully
- [ ] Tested with Android device
- [ ] Tested with iOS device
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.4.4 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Function deployment fails
**Solution**:
- Run `supabase login` first
- Check project is linked: `supabase status`
- Verify Supabase CLI is latest version

### Issue: FCM authentication error
**Solution**:
- Verify FCM_SERVER_KEY in Supabase Vault
- Check key has no extra spaces
- Ensure using Legacy Server Key (not V1 API)

### Issue: APNs JWT generation fails
**Solution**:
- Verify APNS_KEY_CONTENT includes entire .p8 file
- Check key format (PEM format)
- Ensure Key ID and Team ID are correct

### Issue: No notifications sent
**Solution**:
- Check push_tokens table has tokens for user
- Verify userId is correct UUID format
- Check function logs in Supabase Dashboard
- Ensure devices have internet connection

---

## 📚 Additional Notes

### What We Built
- ✅ Serverless push notification sender
- ✅ FCM integration (Android)
- ✅ APNs integration (iOS)
- ✅ Multi-device support
- ✅ Error handling

### Edge Function Benefits
- **Serverless**: No server management
- **Auto-scaling**: Handles any load
- **Global**: Runs close to users
- **Secure**: Secrets managed by Supabase

### What's Next
- **Story 7.4.5**: Notification handling and routing
- **Story 7.4.6**: End-to-end testing

---

## 🔗 Related Documentation

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [FCM HTTP API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [APNs Provider API](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
- [EPIC 7.4 Overview](../epics/EPIC_7.4_Push_Notifications.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.4.3_Apple_Push_Notifications.md](./STORY_7.4.3_Apple_Push_Notifications.md)  
**Next Story**: [STORY_7.4.5_Notification_Handling.md](./STORY_7.4.5_Notification_Handling.md)  
**Epic Progress**: Story 4/6 complete (50% → 67%)
