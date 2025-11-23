# Story 9.6.6: Email Notifications

**Epic:** [EPIC 9.6: Friend Activity Feed & Notifications](../epics/EPIC_9.6_Friend_Activity_Notifications.md)  
**Priority:** 🟢 Low  
**Estimated Time:** 0.5 day  
**MCP Usage:** 🛢 Supabase MCP (Medium)  
**Dependencies:** Story 9.6.3 (Push Notifications), Story 9.6.5 (Preferences)

---

## 📋 Story Description

Implement email notifications for friend events using Resend or SendGrid. Include email templates, unsubscribe functionality, rate limiting, and optional daily digest mode.

---

## ✅ Acceptance Criteria

### Email Infrastructure
- [ ] Email service configured (Resend or SendGrid)
- [ ] Email templates for friend events
- [ ] Unsubscribe link in all emails
- [ ] Rate limiting (max 1 email per hour per user)
- [ ] Email preferences in settings

### Email Types
- [ ] Friend request received
- [ ] Friend request accepted
- [ ] Deal shared with you
- [ ] Daily digest (optional)

### Functionality
- [ ] Respect user's email preferences
- [ ] Track email delivery status
- [ ] Handle bounces and unsubscribes
- [ ] Batch digest option (daily summary)

---

## 🚀 Supabase Edge Function

### File: `supabase/functions/send_email_notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface EmailRequest {
  user_id: string;
  notification_type: string;
  subject: string;
  html: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  try {
    const {
      user_id,
      notification_type,
      subject,
      html,
      data = {},
    }: EmailRequest = await req.json();

    // Get user's email and preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, notification_preferences')
      .eq('id', user_id)
      .single();

    if (profileError) throw profileError;

    // Check if user has email notifications enabled
    const prefs = profile.notification_preferences || {};
    if (!prefs.email_enabled) {
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled for user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting (max 1 email per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentEmails } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', user_id)
      .eq('platform', 'email')
      .gte('sent_at', oneHourAgo);

    if (recentEmails && recentEmails.length >= 1) {
      return new Response(
        JSON.stringify({ message: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'SynC <notifications@sync-app.com>',
        to: [profile.email],
        subject,
        html: html + getUnsubscribeFooter(user_id),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email');
    }

    // Log email send
    await supabase.from('notification_log').insert({
      user_id,
      notification_type,
      title: subject,
      body: html,
      data,
      platform: 'email',
      delivered: true,
    });

    return new Response(
      JSON.stringify({ success: true, email_id: result.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

function getUnsubscribeFooter(userId: string): string {
  const unsubscribeUrl = `${Deno.env.get('APP_URL')}/settings/notifications?unsubscribe=true`;
  
  return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p>
        Don't want to receive these emails? 
        <a href="${unsubscribeUrl}" style="color: #4f46e5; text-decoration: none;">
          Unsubscribe
        </a>
      </p>
      <p style="margin-top: 8px;">SynC - Your Social Coupon App</p>
    </div>
  `;
}
```

---

## 📧 Email Templates

### File: `supabase/functions/send_email_notification/templates.ts`

```typescript
export function getFriendRequestEmailTemplate(senderName: string, requestId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Friend Request</h1>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
            <strong>${senderName}</strong> sent you a friend request on SynC!
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
            Connect with ${senderName} to see their deals, share coupons, and stay updated on their activity.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${Deno.env.get('APP_URL')}/friends/requests" 
               style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              View Friend Request
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getFriendAcceptedEmailTemplate(accepterName: string, friendId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #10b981; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Friend Request Accepted!</h1>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
            Great news! <strong>${accepterName}</strong> accepted your friend request.
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
            You can now share deals, see each other's activity, and stay connected.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${Deno.env.get('APP_URL')}/friends" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              View Friends
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

---

## 🛢 Database Trigger

### Update `supabase/migrations/20250124_push_notifications.sql`:

```sql
-- Trigger: Send email notification on friend request
CREATE OR REPLACE FUNCTION notify_friend_request_email()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT full_name INTO sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
    
    -- Check if receiver has email notifications enabled
    IF should_send_notification(NEW.receiver_id, 'friend_requests') THEN
      PERFORM net.http_post(
        url := current_setting('app.settings.edge_function_url') || '/send_email_notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'user_id', NEW.receiver_id,
          'notification_type', 'friend_request',
          'subject', 'New Friend Request from ' || sender_name,
          'html', get_friend_request_email_template(sender_name, NEW.id::text),
          'data', jsonb_build_object('request_id', NEW.id)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_friend_request_email
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_email();
```

---

## 🔧 MCP Integration

### Deploy Edge Function

```typescript
// Use Supabase MCP to deploy email function
mcp4_deploy_edge_function({
  project_id: "ysxmgbblljoyebvugrfo",
  name: "send_email_notification",
  files: [
    {
      name: "index.ts",
      content: <edge_function_code>
    },
    {
      name: "templates.ts",
      content: <email_templates_code>
    }
  ],
  entrypoint_path: "index.ts"
});
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Configure Resend API key in Supabase
- [ ] Send test email via Edge Function
- [ ] Verify email arrives in inbox
- [ ] Check email formatting and styling
- [ ] Test unsubscribe link
- [ ] Verify rate limiting (send 2 emails within 1 hour)
- [ ] Test with email notifications disabled
- [ ] Check email delivery logs

### Test Email Send

```sql
-- Manually trigger a test email
SELECT net.http_post(
  url := '<your-edge-function-url>/send_email_notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer <service-role-key>'
  ),
  body := jsonb_build_object(
    'user_id', '<test-user-id>',
    'notification_type', 'test',
    'subject', 'Test Email from SynC',
    'html', '<h1>Test Email</h1><p>This is a test email notification.</p>'
  )
);
```

---

## ✅ Definition of Done

- [ ] Email service configured (Resend)
- [ ] Edge Function deployed
- [ ] Email templates created
- [ ] Unsubscribe functionality implemented
- [ ] Rate limiting working
- [ ] Database triggers sending emails
- [ ] Email delivery logs working
- [ ] Manual testing completed
- [ ] Email preferences respected

---

**Epic Complete!** All stories for Epic 9.6 have been created.
