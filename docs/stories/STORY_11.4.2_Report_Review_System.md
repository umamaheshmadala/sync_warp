# Story 11.4.2: Report Review System

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 2 days  
**Dependencies:** Story 11.4.1 (Pre-Moderation System)  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement a system that allows users to report reviews they believe violate platform guidelines. Reports require a logged-in account (no anonymous reports), include a reason category, and feed into the admin moderation queue with prioritization based on report count.

---

## Problem Statement

### Current State
- No way for users to report problematic reviews
- Fake, abusive, or irrelevant reviews can persist
- Admins have no visibility into community concerns
- Business owners cannot flag reviews for moderation

### Desired State
- "Report" button on every review (except own)
- 5 report reasons: Spam, Abusive, Fake, Offensive, Irrelevant
- Account required to report (no anonymous)
- One report per user per review (prevent abuse)
- Reports visible in admin moderation queue
- High-report reviews prioritized

---

## User Stories

### US-11.4.2.1: Report Button on Reviews
**As a** user viewing reviews  
**I want to** report a review that violates guidelines  
**So that** admins can take appropriate action

**Acceptance Criteria:**
- [ ] "Report" option in review dropdown menu (three-dot menu)
- [ ] Not visible on own reviews
- [ ] Clicking opens report modal
- [ ] Button hidden if already reported by this user
- [ ] Shows "Reported" indicator after reporting

---

### US-11.4.2.2: Report Submission Form
**As a** user reporting a review  
**I want to** select a reason and optionally add details  
**So that** admins understand my concern

**Acceptance Criteria:**
- [ ] Modal with 5 reason radio buttons:
  - Spam (promotional content, links)
  - Abusive (harassment, personal attacks)
  - Fake (reviewer didn't visit, false claims)
  - Offensive (hate speech, inappropriate content)
  - Irrelevant (not about business experience)
- [ ] Optional "Additional details" text field (200 chars max)
- [ ] "Submit Report" button
- [ ] Confirmation toast: "Thank you for your report"
- [ ] Cannot report same review twice

---

### US-11.4.2.3: Business Owner Reports
**As a** business owner  
**I want to** report reviews on my business  
**So that** I can flag potentially fake or unfair reviews

**Acceptance Criteria:**
- [ ] Business owner can report reviews on their business
- [ ] Business owner reports tracked separately
- [ ] Business owner gets same report reasons
- [ ] Cannot report own reviews (if owner writes review on own business)
- [ ] Business reports may have different priority weight

---

### US-11.4.2.4: Report Tracking & Prioritization
**As a** platform  
**I want to** track report counts per review  
**So that** highly reported reviews get priority attention

**Acceptance Criteria:**
- [ ] Store reports in `review_reports` table
- [ ] Each review shows report count in admin queue
- [ ] Reviews sorted by report count (most reported first)
- [ ] Track reporter history (identify serial reporters)
- [ ] Prevent report manipulation (one per user)

---

### US-11.4.2.5: Reporter Notification
**As a** user who reported a review  
**I want to** know when action was taken  
**So that** I feel my report was valued

**Acceptance Criteria:**
- [ ] Notification when report is reviewed: "Report reviewed"
- [ ] If review removed: "The review you reported was removed"
- [ ] If report dismissed: No notification (avoid abuse)
- [ ] Track report outcomes in reporter's history

---

## Technical Requirements

### Database Schema

**File:** `supabase/migrations/YYYYMMDD_add_review_reports.sql`

```sql
-- ============================================
-- MIGRATION: Review Report System
-- Story: 11.4.2
-- ============================================

-- Step 1: Create review_reports table
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abusive', 'fake', 'offensive', 'irrelevant')),
  details TEXT CHECK (char_length(details) <= 200),
  is_business_owner BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One report per user per review
  UNIQUE(review_id, reporter_id)
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_review_reports_review 
ON review_reports(review_id);

CREATE INDEX IF NOT EXISTS idx_review_reports_pending 
ON review_reports(status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_review_reports_reporter 
ON review_reports(reporter_id);

-- Step 3: Create view for report counts
CREATE OR REPLACE VIEW review_report_counts AS
SELECT 
  review_id,
  COUNT(*) as report_count,
  COUNT(*) FILTER (WHERE is_business_owner) as owner_report_count,
  array_agg(DISTINCT reason) as reasons,
  MIN(created_at) as first_reported_at
FROM review_reports
WHERE status = 'pending'
GROUP BY review_id;

-- Step 4: RLS policies
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON review_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Users can create reports (not on own reviews)
CREATE POLICY "Users can create reports" ON review_reports
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM business_reviews 
      WHERE id = review_id AND user_id = auth.uid()
    )
  );

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON review_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON review_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### Report Service

**File:** `src/services/reportService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export type ReportReason = 'spam' | 'abusive' | 'fake' | 'offensive' | 'irrelevant';

export interface ReportReview {
  reviewId: string;
  reason: ReportReason;
  details?: string;
}

export interface ReviewReport {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  is_business_owner: boolean;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}

export const REPORT_REASONS: Record<ReportReason, { label: string; description: string }> = {
  spam: {
    label: 'Spam',
    description: 'Promotional content, links, or advertising'
  },
  abusive: {
    label: 'Abusive',
    description: 'Harassment, personal attacks, or bullying'
  },
  fake: {
    label: 'Fake',
    description: 'Reviewer never visited or made false claims'
  },
  offensive: {
    label: 'Offensive',
    description: 'Hate speech, discrimination, or inappropriate content'
  },
  irrelevant: {
    label: 'Irrelevant',
    description: 'Not about the business or service experience'
  }
};

/**
 * Submit a report for a review
 */
export async function submitReport(data: ReportReview): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to report a review');
  }
  
  // Check if already reported
  const { data: existing } = await supabase
    .from('review_reports')
    .select('id')
    .eq('review_id', data.reviewId)
    .eq('reporter_id', user.id)
    .single();
  
  if (existing) {
    throw new Error('You have already reported this review');
  }
  
  // Check if reporting own review
  const { data: review } = await supabase
    .from('business_reviews')
    .select('user_id, business:businesses!business_id(owner_id)')
    .eq('id', data.reviewId)
    .single();
  
  if (!review) {
    throw new Error('Review not found');
  }
  
  if (review.user_id === user.id) {
    throw new Error('You cannot report your own review');
  }
  
  // Check if reporter is business owner
  const isBusinessOwner = review.business?.owner_id === user.id;
  
  // Validate details length
  if (data.details && data.details.length > 200) {
    throw new Error('Additional details must be 200 characters or less');
  }
  
  // Submit report
  const { error } = await supabase.from('review_reports').insert({
    review_id: data.reviewId,
    reporter_id: user.id,
    reason: data.reason,
    details: data.details?.trim() || null,
    is_business_owner: isBusinessOwner,
    status: 'pending'
  });
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('You have already reported this review');
    }
    console.error('[ReportService] Error:', error);
    throw new Error('Could not submit report');
  }
}

/**
 * Check if current user has reported a review
 */
export async function hasUserReported(reviewId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data } = await supabase
    .from('review_reports')
    .select('id')
    .eq('review_id', reviewId)
    .eq('reporter_id', user.id)
    .single();
  
  return !!data;
}

/**
 * Get reports for a review (admin only)
 */
export async function getReviewReports(reviewId: string): Promise<ReviewReport[]> {
  const { data, error } = await supabase
    .from('review_reports')
    .select(`
      *,
      reporter:profiles!reporter_id (id, full_name)
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[ReportService] Error fetching reports:', error);
    throw new Error('Could not load reports');
  }
  
  return data || [];
}

/**
 * Get all pending reports (admin only)
 */
export async function getPendingReports(): Promise<{
  reportCount: number;
  reviewsWithReports: Array<{
    reviewId: string;
    reportCount: number;
    reasons: ReportReason[];
    firstReportedAt: string;
  }>;
}> {
  const { data, error } = await supabase
    .from('review_report_counts')
    .select('*')
    .order('report_count', { ascending: false });
  
  if (error) {
    console.error('[ReportService] Error:', error);
    throw new Error('Could not load pending reports');
  }
  
  const totalReports = data?.reduce((sum, r) => sum + r.report_count, 0) || 0;
  
  return {
    reportCount: totalReports,
    reviewsWithReports: data?.map(r => ({
      reviewId: r.review_id,
      reportCount: r.report_count,
      reasons: r.reasons,
      firstReportedAt: r.first_reported_at
    })) || []
  };
}

/**
 * Dismiss or action a report (admin only)
 */
export async function resolveReports(
  reviewId: string, 
  action: 'dismissed' | 'actioned',
  actionDetails?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('review_reports')
    .update({
      status: action === 'actioned' ? 'actioned' : 'dismissed',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      action_taken: actionDetails
    })
    .eq('review_id', reviewId)
    .eq('status', 'pending');
  
  if (error) {
    console.error('[ReportService] Error resolving reports:', error);
    throw new Error('Could not resolve reports');
  }
  
  // Notify reporters if action was taken
  if (action === 'actioned') {
    await notifyReporters(reviewId);
  }
}

async function notifyReporters(reviewId: string): Promise<void> {
  // Get all reporters for this review
  const { data: reports } = await supabase
    .from('review_reports')
    .select('reporter_id')
    .eq('review_id', reviewId);
  
  if (!reports) return;
  
  // Create notifications
  const notifications = reports.map(report => ({
    user_id: report.reporter_id,
    type: 'report_actioned',
    title: 'Report Action Taken',
    message: 'Thank you for your report. We have taken action on the review you flagged.',
    data: { reviewId }
  }));
  
  await supabase.from('notifications').insert(notifications);
}
```

---

### Report Modal Component

**File:** `src/components/reviews/ReportReviewModal.tsx`

```tsx
import { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitReport, REPORT_REASONS, ReportReason } from '@/services/reportService';
import { toast } from 'sonner';

interface ReportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId: string;
  onReported: () => void;
}

export function ReportReviewModal({ 
  isOpen, 
  onClose, 
  reviewId,
  onReported 
}: ReportReviewModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await submitReport({
        reviewId,
        reason,
        details: details.trim() || undefined
      });
      
      toast.success('Thank you for your report. We will review it shortly.');
      onReported();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit report');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setReason(null);
    setDetails('');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Report Review
          </DialogTitle>
          <DialogDescription>
            Help us maintain quality by reporting reviews that violate our guidelines.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-base">Why are you reporting this review?</Label>
            
            <RadioGroup value={reason || ''} onValueChange={(v) => setReason(v as ReportReason)}>
              {Object.entries(REPORT_REASONS).map(([key, { label, description }]) => (
                <div key={key} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent">
                  <RadioGroupItem value={key} id={key} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={key} className="font-medium cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 200))}
              placeholder="Provide any additional context..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {details.length}/200 characters
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              False reports may result in account restrictions. Please only 
              report genuine violations.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Update ReviewCard with Report Option

**File:** `src/components/reviews/ReviewCard.tsx` (modifications)

```tsx
import { useState, useEffect } from 'react';
import { Flag, Check } from 'lucide-react';
import { ReportReviewModal } from './ReportReviewModal';
import { hasUserReported } from '@/services/reportService';

// In ReviewCard component:
const [showReportModal, setShowReportModal] = useState(false);
const [hasReported, setHasReported] = useState(false);

// Check if already reported
useEffect(() => {
  if (!isOwner) {
    hasUserReported(review.id).then(setHasReported);
  }
}, [review.id, isOwner]);

// In dropdown menu (add Report option):
{!isOwner && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem 
      onClick={() => setShowReportModal(true)}
      disabled={hasReported}
      className={hasReported ? 'text-muted-foreground' : 'text-destructive'}
    >
      {hasReported ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Reported
        </>
      ) : (
        <>
          <Flag className="w-4 h-4 mr-2" />
          Report Review
        </>
      )}
    </DropdownMenuItem>
  </>
)}

// After component:
<ReportReviewModal
  isOpen={showReportModal}
  onClose={() => setShowReportModal(false)}
  reviewId={review.id}
  onReported={() => setHasReported(true)}
/>
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Report Service', () => {
  describe('submitReport', () => {
    it('creates report with valid reason', async () => {
      await submitReport({
        reviewId: 'test-review',
        reason: 'spam',
        details: 'This is promotional content'
      });
      
      const { data } = await supabase
        .from('review_reports')
        .select('*')
        .eq('review_id', 'test-review')
        .single();
      
      expect(data.reason).toBe('spam');
      expect(data.status).toBe('pending');
    });
    
    it('prevents duplicate reports', async () => {
      await submitReport({ reviewId: 'test-review', reason: 'spam' });
      
      await expect(submitReport({ reviewId: 'test-review', reason: 'fake' }))
        .rejects.toThrow('already reported');
    });
    
    it('prevents self-reporting', async () => {
      await expect(submitReport({ reviewId: 'own-review', reason: 'spam' }))
        .rejects.toThrow('cannot report your own');
    });
    
    it('tracks business owner reports', async () => {
      await submitReport({ reviewId: 'review-on-own-business', reason: 'fake' });
      
      const { data } = await supabase
        .from('review_reports')
        .select('is_business_owner')
        .eq('review_id', 'review-on-own-business')
        .single();
      
      expect(data.is_business_owner).toBe(true);
    });
  });
  
  describe('hasUserReported', () => {
    it('returns true if user reported', async () => {
      await submitReport({ reviewId: 'test-review', reason: 'spam' });
      expect(await hasUserReported('test-review')).toBe(true);
    });
    
    it('returns false if user did not report', async () => {
      expect(await hasUserReported('unreported-review')).toBe(false);
    });
  });
});
```

### Manual Testing Checklist

- [ ] Report option visible in review dropdown
- [ ] Report option NOT visible on own reviews
- [ ] Click Report → Modal opens
- [ ] Must select a reason to submit
- [ ] Optional details limited to 200 chars
- [ ] Submit → Confirmation toast shown
- [ ] Try to report again → Shows "Reported" / disabled
- [ ] Business owner can report reviews on their business
- [ ] Admin sees reports in moderation queue
- [ ] Admin can dismiss or action reports

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_add_review_reports.sql` | CREATE | Reports table, indexes, RLS |
| `src/services/reportService.ts` | CREATE | Report submission and management |
| `src/components/reviews/ReportReviewModal.tsx` | CREATE | Report form modal |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Add report button |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check for existing report patterns (posts, comments, etc.)
- [ ] Review modal/dialog patterns in codebase
- [ ] Look for existing reason selection components
- [ ] Check dropdown menu patterns on cards
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

**Test Route 1: Report Submission**
1. Find a review on storefront
2. Click "..." menu → "Report Review"
3. Select reason + optional details
4. Submit → Success message shown
5. Button changes to "Reported"

**Test Route 2: Duplicate Prevention**
1. Try reporting same review again
2. Verify "Already Reported" state
3. Cannot submit duplicate report

**Test Route 3: Business Owner Reports**
1. Login as business owner
2. Report review on own business
3. Verify report marked as from owner
4. Verify appears with priority in admin queue

---

## Definition of Done

- [ ] Report button visible on all reviews (except own)
- [ ] 5 report reasons available
- [ ] Optional details field (200 chars)
- [ ] One report per user per review enforced
- [ ] Business owner can report reviews
- [ ] Reports visible in admin queue
- [ ] Report count shown per review
- [ ] Reporters notified when action taken
- [ ] All tests passing
- [ ] Manual testing complete
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
