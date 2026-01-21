# Story 11.3.2: Review Request After Check-in + 4hr Reminder

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 2 days  
**Dependencies:** Story 11.1.1 (Write Review Button), Story 11.1.2 (GPS Check-in)  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement a review request system that prompts users to leave a review after completing a GPS check-in at a business. If user doesn't review immediately, send a 4-hour reminder notification. No other follow-up (no email, SMS, or QR-based requests). No incentivized reviews.

---

## Problem Statement

### Current State
- Users check in but often forget to leave reviews
- No prompt or reminder to review
- Low review volume despite active check-ins
- Missed opportunity for fresh, authentic feedback

### Desired State
- Prompt to review immediately after check-in
- 4-hour reminder notification if not reviewed
- One-time reminder only (no spam)
- Easy dismiss/snooze options
- Track request → review conversion

---

## User Stories

### US-11.3.2.1: Post Check-in Review Prompt
**As a** user who just checked in  
**I want to** be prompted to write a review  
**So that** I remember to share my experience

**Acceptance Criteria:**
- [ ] Modal/bottom sheet appears after successful check-in
- [ ] Shows: "How was your experience at [Business Name]?"
- [ ] Options: "Write Review Now" or "Remind Me Later"
- [ ] "Maybe Later" dismisses for 4 hours
- [ ] "Not Interested" dismisses permanently for this visit
- [ ] If user has existing review, show "Update Your Review" instead

---

### US-11.3.2.2: 4-Hour Reminder Notification
**As a** user who didn't review immediately  
**I want to** receive a reminder  
**So that** I can review while experience is fresh

**Acceptance Criteria:**
- [ ] Push notification sent 4 hours after check-in
- [ ] Title: "How was [Business Name]?"
- [ ] Body: "Share your experience to help others"
- [ ] Tap opens review form directly
- [ ] Only send if user didn't review yet
- [ ] Only one reminder per check-in
- [ ] Respect notification preferences

---

### US-11.3.2.3: Track Review Request Conversion
**As a** platform  
**I want to** track request → review conversion  
**So that** we can measure effectiveness

**Acceptance Criteria:**
- [ ] Log when review request is shown
- [ ] Log user response (now/later/never)
- [ ] Log when reminder sent
- [ ] Track if user reviewed within 24 hours
- [ ] Dashboard metric: "Review Request Conversion Rate"

---

### US-11.3.2.4: No Incentivized Reviews
**As a** platform  
**I want to** ensure no incentives offered  
**So that** reviews remain authentic

**Acceptance Criteria:**
- [ ] No discount, points, or rewards mentioned
- [ ] No "Review for X" wording anywhere
- [ ] Comply with platform guidelines
- [ ] Document no-incentive policy

---

### US-11.3.2.5: GPS Check-in Bypass (Testing Mode)
**As a** developer/tester
**I want to** be able to simulate check-ins without physical presence
**So that** I can test the flow remotely

**Acceptance Criteria:**
- [ ] Linked to `require_gps_checkin_for_reviews` system setting
- [ ] If toggle OFF: Check-in succeeds without GPS validation
- [ ] If toggle ON: Enforce GPS distance check
- [ ] Toggle managed via Admin Settings
- [ ] Bypass logs a warning in console for visibility

---

## Technical Requirements

### Database Schema

**File:** `supabase/migrations/YYYYMMDD_review_requests.sql`

```sql
-- ============================================
-- MIGRATION: Review Request Tracking
-- Story: 11.3.2
-- ============================================

-- Step 1: Create review requests table
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES business_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Request state
  prompt_shown_at TIMESTAMPTZ, -- When modal was displayed
  prompt_response TEXT CHECK (prompt_response IN ('now', 'later', 'never')),
  reminder_sent_at TIMESTAMPTZ, -- When push notification was sent
  reminder_clicked_at TIMESTAMPTZ, -- If user tapped notification
  
  -- Outcome tracking
  review_id UUID REFERENCES business_reviews(id) ON DELETE SET NULL,
  converted BOOLEAN DEFAULT FALSE,
  conversion_source TEXT CHECK (conversion_source IN ('prompt', 'reminder', 'organic')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(checkin_id)
);

-- Step 2: Indexes
CREATE INDEX idx_review_requests_user ON review_requests(user_id);
CREATE INDEX idx_review_requests_pending_reminder ON review_requests(reminder_sent_at)
  WHERE prompt_response = 'later' AND reminder_sent_at IS NULL;

-- Step 3: Enable RLS
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
ON review_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert requests"
ON review_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests"
ON review_requests FOR UPDATE
USING (auth.uid() = user_id);

-- Step 4: Function to check for pending reminders
CREATE OR REPLACE FUNCTION get_pending_review_reminders()
RETURNS TABLE (
  request_id UUID,
  user_id UUID,
  business_id UUID,
  business_name TEXT,
  checkin_time TIMESTAMPTZ,
  push_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id AS request_id,
    rr.user_id,
    rr.business_id,
    b.name AS business_name,
    bc.created_at AS checkin_time,
    pt.token AS push_token
  FROM review_requests rr
  JOIN businesses b ON b.id = rr.business_id
  JOIN business_checkins bc ON bc.id = rr.checkin_id
  JOIN push_tokens pt ON pt.user_id = rr.user_id AND pt.active = true
  WHERE rr.prompt_response = 'later'
    AND rr.reminder_sent_at IS NULL
    AND rr.converted = FALSE
    AND rr.created_at <= NOW() - INTERVAL '4 hours'
    AND NOT EXISTS (
      SELECT 1 FROM business_reviews br 
      WHERE br.user_id = rr.user_id 
        AND br.business_id = rr.business_id
        AND br.created_at > rr.created_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update review_requests when review is submitted
CREATE OR REPLACE FUNCTION link_review_to_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Find pending request and mark as converted
  UPDATE review_requests
  SET 
    review_id = NEW.id,
    converted = TRUE,
    conversion_source = CASE 
      WHEN reminder_sent_at IS NOT NULL THEN 'reminder'
      WHEN prompt_shown_at IS NOT NULL THEN 'prompt'
      ELSE 'organic'
    END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND business_id = NEW.business_id
    AND converted = FALSE
    AND created_at > NOW() - INTERVAL '24 hours';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_created
AFTER INSERT ON business_reviews
FOR EACH ROW EXECUTE FUNCTION link_review_to_request();
```

---

### Review Request Modal Component

**File:** `src/components/reviews/ReviewRequestModal.tsx`

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { recordRequestResponse } from '@/services/reviewRequestService';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  checkinId: string;
  hasExistingReview: boolean;
  onWriteReview: () => void;
}

export function ReviewRequestModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  checkinId,
  hasExistingReview,
  onWriteReview
}: ReviewRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleResponse = async (response: 'now' | 'later' | 'never') => {
    setIsLoading(true);
    
    try {
      await recordRequestResponse(checkinId, response);
      
      if (response === 'now') {
        onWriteReview();
      }
      
      onClose();
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {hasExistingReview 
              ? 'Update Your Review?'
              : `How was ${businessName}?`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-center py-4">
          <div className="text-5xl">⭐</div>
          
          <p className="text-muted-foreground">
            {hasExistingReview
              ? 'Would you like to update your previous review?'
              : 'Share your experience to help others discover great places!'}
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={() => handleResponse('now')}
              disabled={isLoading}
              className="w-full"
            >
              <Star className="w-4 h-4 mr-2" />
              {hasExistingReview ? 'Update Review' : 'Write Review Now'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => handleResponse('later')}
              disabled={isLoading}
              className="w-full"
            >
              <Clock className="w-4 h-4 mr-2" />
              Remind Me Later
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => handleResponse('never')}
              disabled={isLoading}
              className="w-full text-muted-foreground"
            >
              Not Interested
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Review Request Service

**File:** `src/services/reviewRequestService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface ReviewRequest {
  id: string;
  checkin_id: string;
  user_id: string;
  business_id: string;
  prompt_response: 'now' | 'later' | 'never' | null;
  reminder_sent_at: string | null;
  converted: boolean;
  created_at: string;
}

/**
 * Create a review request record after check-in
 */
export async function createReviewRequest(
  checkinId: string,
  businessId: string
): Promise<ReviewRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('review_requests')
    .insert({
      checkin_id: checkinId,
      user_id: user.id,
      business_id: businessId,
      prompt_shown_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    // Duplicate - request already exists for this check-in
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('review_requests')
        .select('*')
        .eq('checkin_id', checkinId)
        .single();
      return existing;
    }
    throw error;
  }
  
  return data;
}

/**
 * Record user's response to review prompt
 */
export async function recordRequestResponse(
  checkinId: string,
  response: 'now' | 'later' | 'never'
): Promise<void> {
  const { error } = await supabase
    .from('review_requests')
    .update({
      prompt_response: response,
      updated_at: new Date().toISOString()
    })
    .eq('checkin_id', checkinId);
  
  if (error) throw error;
}

/**
 * Check if user has a pending review request for this business
 */
export async function hasPendingRequest(businessId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data } = await supabase
    .from('review_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .eq('converted', false)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .single();
  
  return !!data;
}

/**
 * Mark reminder as clicked (for analytics)
 */
export async function markReminderClicked(requestId: string): Promise<void> {
  await supabase
    .from('review_requests')
    .update({
      reminder_clicked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);
}
```

---

### Edge Function for Reminder Notifications

**File:** `supabase/functions/send-review-reminders/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Get pending reminders (4+ hours since check-in)
    const { data: pendingReminders, error } = await supabase
      .rpc('get_pending_review_reminders');
    
    if (error) throw error;
    
    console.log(`Found ${pendingReminders?.length || 0} pending reminders`);
    
    let sentCount = 0;
    
    for (const reminder of pendingReminders || []) {
      try {
        // Send push notification
        await sendPushNotification({
          token: reminder.push_token,
          title: `How was ${reminder.business_name}?`,
          body: 'Share your experience to help others',
          data: {
            type: 'review_reminder',
            request_id: reminder.request_id,
            business_id: reminder.business_id,
            action: 'open_review_form'
          }
        });
        
        // Mark reminder as sent
        await supabase
          .from('review_requests')
          .update({ 
            reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', reminder.request_id);
        
        sentCount++;
      } catch (err) {
        console.error(`Failed to send reminder ${reminder.request_id}:`, err);
      }
    }
    
    return new Response(
      JSON.stringify({ sent: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendPushNotification(params: {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}) {
  // Use Firebase Cloud Messaging or APN
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
  
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${FCM_SERVER_KEY}`
    },
    body: JSON.stringify({
      to: params.token,
      notification: {
        title: params.title,
        body: params.body
      },
      data: params.data
    })
  });
  
  if (!response.ok) {
    throw new Error(`FCM error: ${response.status}`);
  }
}
```

---

### Integrate with Check-in Flow

#### Update Check-in success handler
```typescript
// In your check-in completion handler:
const handleCheckinSuccess = async (checkinId: string, businessId: string) => {
  // Check if user has an existing review
  const { data: existingReview } = await supabase
    .from('business_reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .single();
  
  // Create review request record
  await createReviewRequest(checkinId, businessId);
  
  // Show review prompt modal
  setShowReviewRequestModal(true);
  setHasExistingReview(!!existingReview);
};
```

---

### Cron Job Configuration

Schedule the edge function to run hourly:

```sql
-- In pg_cron (if available) or external cron:
-- Run every hour to send pending reminders
SELECT cron.schedule(
  'send-review-reminders',
  '0 * * * *',
  $$
    SELECT net.http_post(
      'https://your-project.supabase.co/functions/v1/send-review-reminders',
      '{}',
      'application/json'
    );
  $$
);
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Review Request Flow', () => {
  it('shows prompt after check-in', async () => {
    await checkIn(businessId);
    expect(screen.getByText('How was Business Name?')).toBeInTheDocument();
  });

  it('records "now" response and opens form', async () => {
    await userEvent.click(screen.getByText('Write Review Now'));
    expect(recordRequestResponse).toHaveBeenCalledWith(checkinId, 'now');
    expect(screen.getByText('Write a Review')).toBeInTheDocument();
  });

  it('records "later" response and dismisses', async () => {
    await userEvent.click(screen.getByText('Remind Me Later'));
    expect(recordRequestResponse).toHaveBeenCalledWith(checkinId, 'later');
    expect(screen.queryByText('How was')).not.toBeInTheDocument();
  });

  it('shows "Update Review" for existing reviewers', () => {
    render(<ReviewRequestModal hasExistingReview={true} ... />);
    expect(screen.getByText('Update Your Review?')).toBeInTheDocument();
  });
});

describe('Reminder Edge Function', () => {
  it('sends reminders 4+ hours after check-in', async () => {
    // Test edge function logic
  });

  it('does not send if already reviewed', async () => {
    // Test exclusion logic
  });

  it('only sends one reminder per check-in', async () => {
    // Test duplicate prevention
  });
});
```

### Manual Testing Checklist
- [ ] Check in at business - prompt appears
- [ ] Click "Write Review Now" - opens form
- [ ] Click "Remind Me Later" - dismisses
- [ ] Wait 4+ hours - receive push notification
- [ ] Tap notification - opens review form
- [ ] Already reviewed - shows "Update" instead
- [ ] "Not Interested" - no reminder sent
- [ ] Analytics: track conversion rate

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_review_requests.sql` | CREATE | Table and functions |
| `src/components/reviews/ReviewRequestModal.tsx` | CREATE | Prompt UI |
| `src/services/reviewRequestService.ts` | CREATE | Request CRUD |
| `supabase/functions/send-review-reminders/` | CREATE | Edge function |
| Check-in handler | MODIFY | Trigger prompt after success |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing check-in flow and components
- [ ] Review push notification infrastructure
- [ ] Find existing modal/prompt patterns
- [ ] Check scheduled job/cron patterns in codebase
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

**Test Route 1: Post Check-in Prompt**
1. Check in to a business
2. Verify prompt appears: "How was your visit?"
3. Click "Write Review" → Opens review form
4. Click "Maybe Later" → Prompt dismisses

**Test Route 2: 4-Hour Reminder**
1. Check in to business, dismiss prompt
2. Wait 4 hours (or simulate)
3. Verify push notification received
4. Tap notification → Opens review form

**Test Route 3: Edge Cases**
1. Check in and submit review immediately → No reminder
2. Multiple check-ins same business → Only one reminder
3. Opt out of notifications → No reminder

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

## Definition of Done

- [ ] Prompt appears after successful check-in
- [ ] Three response options working
- [ ] 4-hour reminder sent correctly
- [ ] Only one reminder per check-in
- [ ] Conversion tracking working
- [ ] Existing reviewers see "Update" option
- [ ] Push notification opens review form
- [ ] No incentive language anywhere
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
