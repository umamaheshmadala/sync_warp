# Story 11.3.8: Push Notifications for Responses

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 1 day  
**Dependencies:** Existing push notification infrastructure (EPIC 7.4)  
**Status:** 🔄 In Progress (75% Complete)


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
- [x] Push notification sent when response is created
- [x] Title: "[Business Name] responded to your review"
- [x] Body: First 50 chars of response text
- [x] Tap opens review with response visible
- [x] Only if user has notifications enabled

---

### US-11.3.8.2: In-App Notification
**As a** user without push enabled  
**I want to** see notifications in-app  
**So that** I still learn about responses

**Acceptance Criteria:**
- [x] Notification created in notifications table
- [x] Shows in notification center
- [x] Includes business name and response preview
- [x] Tap navigates to review

---

### US-11.3.8.3: Notification Preferences
**As a** user  
**I want to** control response notifications  
**So that** I'm not overwhelmed

**Acceptance Criteria:**
- [x] Toggle: "Business responses to my reviews"
- [x] Default: ON
- [x] Location: Settings > Notifications
- [x] Independent from other notification types

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

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Review existing push notification infrastructure
- [ ] Check FCM/OneSignal integration patterns
- [ ] Review notification settings/preferences UI
- [ ] Look for existing notification types
- [ ] Document findings in the implementation plan

### 2. Database Migration Execution
- [ ] Use **Supabase MCP tools** to execute SQL migrations when possible
- [ ] Use `mcp_supabase-mcp-server_execute_sql` for running scripts
- [ ] Only request manual SQL execution if MCP lacks required privileges
- [ ] Verify migration success with follow-up queries

### 3. Acceptance Criteria Verification
After implementation is complete:
- [ ] Go through EACH acceptance criterion one by one
- [ ] Mark each criterion as verified with evidence (screenshot, test result, or code reference)
- [ ] Document any deviations or edge cases discovered
- [ ] Get sign-off before proceeding to user testing

### 4. User Testing Plan
Once acceptance criteria are verified, execute this testing flow:

**Test Route 1: Push Notification Receipt**
1. Submit review on a business
2. Login as business owner (different device)
3. Respond to the review
4. Verify reviewer receives push notification

**Test Route 2: Deep Link**
1. Tap push notification
2. Verify app opens to correct review
3. Response is visible and highlighted
4. Test when app is closed vs backgrounded

**Test Route 3: Settings**
1. Navigate to notification settings
2. Disable review notifications
3. Get a response → No notification
4. Re-enable → Notifications work again

### 5. Browser Testing & Evidence Collection

> **IMPORTANT**: All features must be browser-tested with evidence collected before confirming completion.

**Test Environment:**
- Local dev server: `http://localhost:5173`
- Do NOT start the dev server (it's already running)
- Only restart if necessary

**Test Credentials:**
| User | Email | Password |
|------|-------|----------|
| Test User 1 | testuser1@gmail.com | Testuser@1 |
| Test User 3 | testuser3@gmail.com | Testuser@1 |
| Test User 4 | testuser4@gmail.com | Testuser@1 |
| Test User 5 | testuser5@gmail.com | Testuser@1 |

**Evidence Collection Requirements:**
- [ ] **Screenshot each test step** using browser automation
- [ ] **Record browser session** for key user flows
- [ ] **Save screenshots** to artifacts folder with descriptive names
- [ ] **Document actual vs expected** behavior for each test

**Completion Criteria:**
- [ ] All browser tests pass with visual evidence
- [ ] Screenshots/recordings saved as artifacts
- [ ] Only confirm implementation complete when ALL evidence collected
- [ ] Any failing tests must be fixed before marking complete

---

## Known Issues & Current Status (Updated: 2026-02-02)

### ⚠️ Investigation Findings

During debugging on 2026-02-02, the following issues were identified:

#### 1. Business Owner Not Receiving "New Review" Notifications
**Root Cause:** Reviews go through moderation before being visible. The `notifyMerchantNewReview()` function is only called **after admin approval** in `moderationService.ts:approveReview()` (line 204), not on initial review submission.

**Current Flow:**
1. User submits review → `reviewService.ts:createReview()`
2. Review created with `moderation_status: 'pending'`
3. **No notification to business owner at this point**
4. Admin approves review → `moderationService.ts:approveReview()`
5. **Now** `notifyMerchantNewReview()` is called → creates in-app notification + triggers push

**Exception:** Reviews with NO text AND NO photos are auto-approved and should trigger immediate notification.

#### 2. Review Response Notifications (User → Business Response)
**Status:** Partially working
- DB Trigger `notify_review_response` exists and inserts into `notification_log`
- Push notification delegated to `send-response-notification` Edge Function
- In-app notification creation in `notifyUserReviewResponse()` is **commented out** (delegated to DB trigger)

#### 3. Missing `sender_id` in Some Notifications
Some notifications may not display the sender avatar correctly if `sender_id` is not populated in the notification data.

### 📊 Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| DB Trigger `notify_review_response` | ✅ Deployed | Migration `20260124_notify_review_response.sql` |
| Edge Function `send-push-notification` | ✅ Deployed | FCM V1 API, Android only |
| Edge Function `send-response-notification` | ✅ Deployed | Webhook-triggered |
| `notifyMerchantNewReview()` | ⚠️ Works | Only after admin approval |
| `notifyUserReviewResponse()` | ⚠️ Partial | In-app via DB trigger, push via webhook |
| iOS Push Notifications | ❌ Not Implemented | Deferred per EPIC 7.4 |
| Manual Testing | ❌ Incomplete | Needs end-to-end verification |

### 🔧 Recommended Fixes

1. **Clarify Expected Behavior:** Confirm with product whether business owners should receive notification:
   - On review submission (before moderation), OR
   - Only after review is approved (current behavior)

2. **End-to-End Testing Required:**
   - Submit review as testuser4 → Approve as admin → Verify testuser1 receives notification
   - As testuser1 respond to review → Verify testuser4 receives notification

3. **Verify Database Webhook Configuration:**
   - Ensure webhook is configured in Supabase Dashboard for `business_review_responses` INSERT events

---

## Definition of Done

- [x] Push notification sent on response (via DB webhook → Edge Function)
- [x] Notification shows business name and preview
- [x] Tap opens specific review (NotificationRouter handles `review_response` type)
- [x] In-app notification as fallback (via DB trigger)
- [x] Preference toggle working (`review_responses` in preferences)
- [ ] Works on both platforms (Android only, iOS deferred)
- [ ] All tests passing (manual testing incomplete)
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
