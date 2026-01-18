# Story 11.3.8: Push Notifications for Responses

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 1 day  
**Dependencies:** Existing push notification infrastructure (EPIC 7.4)  
**Status:** 📋 Ready for Implementation

---

## Overview

Send push notifications to users when a business owner responds to their review. This encourages continued engagement and lets users know their feedback was acknowledged.

---

## Problem Statement

### Current State
- Business can respond to reviews
- User has no notification of the response
- User must manually check back
- Missed engagement opportunity

### Desired State
- Push notification when business responds
- In-app notification as fallback
- Notification opens specific review
- Respects user preferences

---

## User Stories

### US-11.3.8.1: Push Notification on Response
**As a** user who left a review  
**I want to** be notified when the business responds  
**So that** I can see their reply

**Acceptance Criteria:**
- [ ] Push notification sent when response is created
- [ ] Title: "[Business Name] responded to your review"
- [ ] Body: First 50 chars of response text
- [ ] Tap opens review with response visible
- [ ] Only if user has notifications enabled

---

### US-11.3.8.2: In-App Notification
**As a** user without push enabled  
**I want to** see notifications in-app  
**So that** I still learn about responses

**Acceptance Criteria:**
- [ ] Notification created in notifications table
- [ ] Shows in notification center
- [ ] Includes business name and response preview
- [ ] Tap navigates to review

---

### US-11.3.8.3: Notification Preferences
**As a** user  
**I want to** control response notifications  
**So that** I'm not overwhelmed

**Acceptance Criteria:**
- [ ] Toggle: "Business responses to my reviews"
- [ ] Default: ON
- [ ] Location: Settings > Notifications
- [ ] Independent from other notification types

---

## Technical Requirements

### Database Trigger for Notification

```sql
-- Trigger on business_review_responses insert
CREATE OR REPLACE FUNCTION notify_review_response()
RETURNS TRIGGER AS $$
DECLARE
  review_data RECORD;
  business_name TEXT;
BEGIN
  -- Get review and business info
  SELECT br.user_id, br.business_id, b.name
  INTO review_data, business_name
  FROM business_reviews br
  JOIN businesses b ON b.id = br.business_id
  WHERE br.id = NEW.review_id;
  
  -- Create notification record
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    data,
    created_at
  ) VALUES (
    review_data.user_id,
    'review_response',
    business_name || ' responded to your review',
    LEFT(NEW.text, 100),
    jsonb_build_object(
      'review_id', NEW.review_id,
      'business_id', review_data.business_id,
      'response_id', NEW.id
    ),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_response_created
AFTER INSERT ON business_review_responses
FOR EACH ROW EXECUTE FUNCTION notify_review_response();
```

---

### Push Notification Service

**File:** Update `src/services/notificationService.ts`

```typescript
/**
 * Send push notification for review response
 */
export async function sendReviewResponseNotification(
  userId: string,
  data: {
    businessName: string;
    responseText: string;
    reviewId: string;
    businessId: string;
  }
): Promise<void> {
  // Check user's notification preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('review_responses')
    .eq('user_id', userId)
    .single();
  
  if (prefs?.review_responses === false) {
    console.log('[Notifications] User disabled review response notifications');
    return;
  }
  
  // Get user's push tokens
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId)
    .eq('active', true);
  
  if (!tokens || tokens.length === 0) {
    console.log('[Notifications] No active push tokens for user');
    return;
  }
  
  // Send to each token
  for (const { token, platform } of tokens) {
    await sendPush({
      token,
      platform,
      notification: {
        title: `${data.businessName} responded to your review`,
        body: data.responseText.slice(0, 50) + (data.responseText.length > 50 ? '...' : '')
      },
      data: {
        type: 'review_response',
        review_id: data.reviewId,
        business_id: data.businessId,
        action: 'open_review'
      }
    });
  }
}
```

---

### Edge Function for Push Delivery

**File:** `supabase/functions/send-response-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { record } = await req.json();
  
  // record is the new business_review_response
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Get review and business details
  const { data: review } = await supabase
    .from('business_reviews')
    .select('user_id, business_id, businesses(name)')
    .eq('id', record.review_id)
    .single();
  
  if (!review) return new Response('Review not found', { status: 404 });
  
  // Check notification preference
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('review_responses')
    .eq('user_id', review.user_id)
    .single();
  
  if (prefs?.review_responses === false) {
    return new Response('Notifications disabled', { status: 200 });
  }
  
  // Get push tokens
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', review.user_id)
    .eq('active', true);
  
  if (!tokens?.length) {
    return new Response('No tokens', { status: 200 });
  }
  
  // Send push notifications
  const FCM_KEY = Deno.env.get('FCM_SERVER_KEY');
  
  for (const { token } of tokens) {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_KEY}`
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: `${review.businesses.name} responded to your review`,
          body: record.text.slice(0, 50)
        },
        data: {
          type: 'review_response',
          review_id: record.review_id,
          business_id: review.business_id
        }
      })
    });
  }
  
  return new Response('Sent', { status: 200 });
});
```

---

### Database Webhook Configuration

```sql
-- Set up webhook to trigger edge function on response insert
-- In Supabase Dashboard: Database Webhooks
-- Table: business_review_responses
-- Event: INSERT
-- URL: https://your-project.supabase.co/functions/v1/send-response-notification
```

---

### Handle Notification Click

**Update notification handler in app:**

```typescript
// In your push notification handler (e.g., App.tsx or notification service)
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';

PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
  const data = notification.notification.data;
  
  if (data.type === 'review_response') {
    // Navigate to the review
    navigate(`/business/${data.business_id}/reviews#review-${data.review_id}`);
  }
});
```

---

### Add Notification Preference

**Update notification preferences schema:**

```sql
-- Add column if not exists
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS review_responses BOOLEAN DEFAULT TRUE;
```

**Update preferences UI:**

```tsx
// In NotificationPreferences.tsx
<div className="flex items-center justify-between">
  <div>
    <p className="font-medium">Business Responses</p>
    <p className="text-sm text-muted-foreground">
      When a business responds to your review
    </p>
  </div>
  <Switch
    checked={prefs.review_responses}
    onCheckedChange={(checked) => updatePref('review_responses', checked)}
  />
</div>
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Review Response Notification', () => {
  it('sends push notification when response created', async () => {
    const response = await createReviewResponse(reviewId, 'Thank you!');
    
    // Verify notification was created
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('data->>review_id', reviewId);
    
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('review_response');
  });

  it('respects notification preferences', async () => {
    // Disable notifications
    await updatePreferences(userId, { review_responses: false });
    
    await createReviewResponse(reviewId, 'Thank you!');
    
    // Should not send push (but may still create in-app notification)
    // Test logic...
  });
});
```

### Manual Testing Checklist
- [ ] Create response - user gets push notification
- [ ] Notification shows business name and preview
- [ ] Tap notification opens review
- [ ] Disable preference - no notification sent
- [ ] In-app notification appears in notification center
- [ ] Works on iOS
- [ ] Works on Android

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_response_notifications.sql` | CREATE | Trigger and prefs |
| `supabase/functions/send-response-notification/` | CREATE | Edge function |
| `src/services/notificationService.ts` | MODIFY | Add response notification |
| Notification preferences UI | MODIFY | Add toggle |
| Push notification handler | MODIFY | Handle click |

---

## Definition of Done

- [ ] Push notification sent on response
- [ ] Notification shows business name and preview
- [ ] Tap opens specific review
- [ ] In-app notification as fallback
- [ ] Preference toggle working
- [ ] Works on both platforms
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
