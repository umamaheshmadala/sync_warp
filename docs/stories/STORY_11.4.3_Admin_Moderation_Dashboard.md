# Story 11.4.3: Admin Moderation Dashboard

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 4 days  
**Dependencies:** Story 11.4.1 (Pre-Moderation), Story 11.4.2 (Report System)  
**Status:** ✅ Completed

---

## Overview

Build a comprehensive admin dashboard for review moderation. This dashboard integrates the pre-moderation queue, reported reviews, bulk actions, and complete audit trail. It provides admins with all tools needed to efficiently manage review quality.

---

## Problem Statement

### Current State
- No centralized moderation interface
- Pending reviews not visible to admins
- No way to handle reported reviews
- No audit trail of moderation actions

### Desired State
- Unified moderation dashboard in admin area
- Queue showing pending + reported reviews
- Bulk approve/reject actions
- Complete audit trail
- Filters and search capability

---

## User Stories

### US-11.4.3.1: Moderation Queue View
**As an** admin  
**I want to** see all reviews requiring moderation in one place  
**So that** I can efficiently process them

**Acceptance Criteria:**
- [x] Tab or or page in admin dashboard: "Review Moderation"
- [x] Shows pending reviews (newest pending at bottom - FIFO)
- [x] Shows reported reviews (sorted by report count)
- [x] Toggle between: All, Pending, Reported
- [x] Count badges for each category
- [x] Real-time updates when new reviews arrive

---

### US-11.4.3.2: Review Details Panel
**As an** admin reviewing a submission  
**I want to** see complete review details  
**So that** I can make informed moderation decisions

**Acceptance Criteria:**
- [x] Full review text and photos
- [x] All tags selected
- [x] Reviewer profile info (name, join date, review count)
- [x] Business info (name, category)
- [x] GPS check-in status (verified/not verified)
- [x] Report reasons (if any) with reporter info
- [x] Reviewer's review history summary (Review count)
- [x] Fraud signals (GPS/Location match)

---

### US-11.4.3.3: Individual Moderation Actions
**As an** admin  
**I want to** approve or reject individual reviews  
**So that** I can handle edge cases appropriately

**Acceptance Criteria:**
- [x] "Approve" button → Publishes review immediately
- [x] "Reject" button → Opens rejection reason modal
- [x] Rejection reasons preset + custom option:
  - Spam or promotional content
  - Inappropriate language
  - Fake or misleading review
  - Not about actual experience
  - Other (custom text required)
- [x] Confirm before action
- [x] Review removed from queue after action

---

### US-11.4.3.4: Bulk Moderation Actions
**As an** admin  
**I want to** approve or reject multiple reviews at once  
**So that** I can efficiently clear large queues

**Acceptance Criteria:**
- [x] Checkbox to select individual reviews
- [x] "Select All" checkbox for current page
- [x] "Approve Selected" button
- [x] "Reject Selected" button (requires single reason for all)
- [x] Confirmation: "Approve 5 reviews?"
- [x] Progress indicator during bulk action
- [x] Summary after: "5 approved, 0 rejected"

---

### US-11.4.3.5: Audit Trail View
**As an** admin  
**I want to** see history of moderation actions  
**So that** I can review decisions and ensure consistency

**Acceptance Criteria:**
- [x] Separate "Audit Log" tab
- [x] Shows: Date, Action, Review ID, Admin, Reason
- [x] Filter by: Admin, Action type, Date range
- [x] Search by review ID or reviewer name
- [x] Export to CSV (optional)
- [x] Retention: Keep indefinitely

---

### US-11.4.3.6: Queue Filtering & Search
**As an** admin  
**I want to** filter and search the moderation queue  
**So that** I can find specific reviews quickly

**Acceptance Criteria:**
- [x] Search by: Business name, Reviewer name
- [x] Filter by: Date range, Report reason, Business category
- [x] Sort by: Date, Report count, Business
- [x] Filter by: Date range, Report reason, Business category (Business Name implemented)
- [x] Sort by: Date, Report count, Business (Newest/Oldest/Reports)
- [x] Clear filters button
- [x] Persist filter preferences

---

### US-11.4.3.7: Dashboard Summary Stats
**As an** admin  
**I want to** see moderation statistics at a glance  
**So that** I understand queue health

**Acceptance Criteria:**
- [x] Pending reviews count (badge in nav)
- [x] Today's processed count (Approved/Rejected Today)
- [x] Average processing time
- [x] Approval vs rejection ratio
- [x] Most reported businesses (top 5)
- [x] Trend chart (daily reviews over time)

---

### US-11.4.3.8: Real-Time Queue Updates
**As an** admin  
**I want to** see the Pending and Reported tabs update in real-time (within 1 second)  
**So that** I don't miss new reviews requiring attention

**Acceptance Criteria:**
- [x] When a new review is submitted by a user, the Pending tab updates **immediately** (< 1 second) without manual refresh
- [x] When a review is reported by a user, the Reported tab updates **immediately** (< 1 second) without manual refresh
- [x] The count badges (Pending count, Reported count) in the tab headers update in real-time
- [x] The stats tiles (Pending Reviews, Reported Reviews) update in real-time
- [x] Both `business_reviews` and `review_reports` tables must be in Supabase Realtime publication
- [x] Frontend must subscribe to Postgres changes on both tables and refetch queries instantly

**Technical Notes:**
- Current delay is 5+ minutes, caused by missing/broken Realtime subscriptions
- React Query invalidation must happen on Realtime event, not polling
- Ensure `refetchInterval` polling is disabled or set to fallback only

---

### US-11.4.3.9: Admin Notification for Reported Reviews
**As an** admin  
**I want to** receive an in-app notification every time a user reports a review  
**So that** I am immediately aware of potential issues

**Acceptance Criteria:**
- [x] When ANY user reports a review, ALL admin users receive an in-app notification
- [x] The notification appears in the Bell icon dropdown (NotificationCenter)
- [x] The Bell icon badge count increases immediately
- [x] The Admin Shield icon badge (header) shows reported review count (optional, for parity with pending count)
- [x] Each report creates a separate notification (even if multiple users report the same review)
- [x] Notification title: "New Review Reported"
- [x] Notification body: "A review for {Business Name} was reported by {Reporter Name}"
- [x] Notification action_url: `/admin/moderation?tab=reported`

**Technical Notes:**
- Database trigger `notify_admins_reported_review` must fire on `review_reports` INSERT
- Trigger must insert into `notification_log` for each admin user
- `is_admin` column in `profiles` table must be populated for all admins

---

### US-11.4.3.10: Moderation Action Clears Queue and Logs
**As an** admin  
**I want to** see reviews disappear from their queue tab immediately after I moderate them  
**So that** I have a clear view of remaining work

**Acceptance Criteria:**
- [x] When a review is APPROVED from the Pending tab, it immediately disappears from the Pending tab
- [x] When a review is REJECTED from the Pending tab, it immediately disappears from the Pending tab
- [x] When a review is APPROVED from the Reported tab, it immediately disappears from the Reported tab
- [x] When a review is REJECTED from the Reported tab, it immediately disappears from the Reported tab
- [x] In ALL cases, a log entry is immediately created in `review_moderation_log`
- [x] The Moderation Log tab updates immediately to show the new action
- [x] When a reported review is moderated, the associated `review_reports` status changes from `pending` to `actioned` or `dismissed`
- [x] The Reported tab count and list correctly reflect only **unresolved** reports (status = 'pending')

**Technical Notes:**
- Current bug: Reported tab does not refresh even after multiple page reloads
- `resolveReports()` must be called when moderating a reported review
- React Query must invalidate `['pending-reports']`, `['reported-reviews-details']`, `['moderation-audit-log']` after action

---

### US-11.4.3.11: Re-Submitted Review Flow
**As an** admin  
**I want to** clearly identify reviews that were previously rejected and re-edited by the user  
**So that** I can give them appropriate scrutiny

**Acceptance Criteria:**
- [x] When a user EDITS a previously **rejected** review, the review's `moderation_status` changes back to `pending`
- [x] The re-submitted review appears in the Pending tab with a prominent **"Re-submission"** badge/tag
- [x] The Admin receives a notification: "Re-submitted review requires moderation"
- [x] The notification body includes: "A previously rejected review for {Business Name} has been edited and re-submitted by {Reviewer Name}"
- [x] The notification action_url: `/admin/moderation?tab=pending`
- [x] The review's edit history is preserved (edit_count, previous rejection reason if available)
- [x] When a user edits an **approved** review, behavior TBD (recommend: stays approved or goes to pending based on business rule)

**Technical Notes:**
- Requires database trigger or service logic on `business_reviews` UPDATE
- `is_edited` flag already exists; need new column `is_resubmission` boolean or derive from (`is_edited = true` AND `previous_status = 'rejected'`)
- Notification trigger must detect this specific scenario

---

## Technical Requirements

### Dashboard Page Component

**File:** `src/pages/admin/ReviewModerationPage.tsx`

```tsx
import { useState } from 'react';
import { useQuery and useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModerationQueue } from '@/components/admin/ModerationQueue';
import { ModerationAuditLog } from '@/components/admin/ModerationAuditLog';
import { ModerationStats } from '@/components/admin/ModerationStats';
import { 
  getPendingReviews, 
  getPendingReviewCount,
  approveReview,
  rejectReview 
} from '@/services/moderationService';
import { getPendingReports } from '@/services/reportService';

export function ReviewModerationPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: pendingReviews, refetch: refetchPending } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: getPendingReviews
  });
  
  const { data: reportData, refetch: refetchReports } = useQuery({
    queryKey: ['pending-reports'],
    queryFn: getPendingReports
  });
  
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-count'],
    queryFn: getPendingReviewCount,
    refetchInterval: 30000 // Refresh every 30s
  });
  
  const handleBulkApprove = async () => {
    for (const reviewId of selectedReviews) {
      await approveReview(reviewId);
    }
    setSelectedReviews([]);
    refetchPending();
  };
  
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Review Moderation</h1>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
      </div>
      
      <ModerationStats />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reported" className="gap-2">
            Reported
            {reportData?.reportCount > 0 && (
              <Badge variant="outline">{reportData.reportCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit Log
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {selectedReviews.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-4 bg-muted rounded-lg">
              <span>{selectedReviews.length} selected</span>
              <Button size="sm" onClick={handleBulkApprove}>
                Approve Selected
              </Button>
              <Button size="sm" variant="destructive">
                Reject Selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedReviews([])}>
                Clear Selection
              </Button>
            </div>
          )}
          
          <ModerationQueue
            reviews={pendingReviews || []}
            selectedReviews={selectedReviews}
            onSelectionChange={setSelectedReviews}
            onRefresh={refetchPending}
            searchQuery={searchQuery}
          />
        </TabsContent>
        
        <TabsContent value="reported">
          <ModerationQueue
            reviews={[]} // Fetch reported reviews
            type="reported"
            reportData={reportData}
            onRefresh={refetchReports}
            searchQuery={searchQuery}
          />
        </TabsContent>
        
        <TabsContent value="audit">
          <ModerationAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### Moderation Queue Component

**File:** `src/components/admin/ModerationQueue.tsx`

```tsx
import { useState } from 'react';
import { Check, X, Eye, MoreVertical, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReviewDetailsSheet } from './ReviewDetailsSheet';
import { RejectReviewDialog } from './RejectReviewDialog';
import { approveReview } from '@/services/moderationService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ModerationQueueProps {
  reviews: PendingReview[];
  selectedReviews: string[];
  onSelectionChange: (ids: string[]) => void;
  onRefresh: () => void;
  searchQuery?: string;
}

export function ModerationQueue({
  reviews,
  selectedReviews,
  onSelectionChange,
  onRefresh,
  searchQuery
}: ModerationQueueProps) {
  const [viewingReview, setViewingReview] = useState<PendingReview | null>(null);
  const [rejectingReview, setRejectingReview] = useState<PendingReview | null>(null);
  
  const filteredReviews = reviews.filter(review => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      review.user.full_name.toLowerCase().includes(q) ||
      review.business.name.toLowerCase().includes(q) ||
      review.text?.toLowerCase().includes(q)
    );
  });
  
  const handleApprove = async (reviewId: string) => {
    try {
      await approveReview(reviewId);
      toast.success('Review approved');
      onRefresh();
    } catch (error) {
      toast.error('Could not approve review');
    }
  };
  
  const toggleSelection = (reviewId: string) => {
    if (selectedReviews.includes(reviewId)) {
      onSelectionChange(selectedReviews.filter(id => id !== reviewId));
    } else {
      onSelectionChange([...selectedReviews, reviewId]);
    }
  };
  
  const toggleAllSelection = () => {
    if (selectedReviews.length === filteredReviews.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredReviews.map(r => r.id));
    }
  };
  
  if (filteredReviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <p className="text-lg font-medium">All caught up!</p>
        <p>No reviews pending moderation.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 p-3 bg-muted rounded-t-lg font-medium text-sm">
        <Checkbox
          checked={selectedReviews.length === filteredReviews.length}
          onCheckedChange={toggleAllSelection}
        />
        <span className="flex-1">Review</span>
        <span className="w-32">Business</span>
        <span className="w-24">Submitted</span>
        <span className="w-24">Actions</span>
      </div>
      
      {/* Queue items */}
      {filteredReviews.map(review => (
        <div 
          key={review.id}
          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50"
        >
          <Checkbox
            checked={selectedReviews.includes(review.id)}
            onCheckedChange={() => toggleSelection(review.id)}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{review.user.full_name}</span>
              <Badge variant={review.recommendation ? 'default' : 'destructive'}>
                {review.recommendation ? '👍 Recommends' : '👎 Doesn\'t Recommend'}
              </Badge>
              {review.report_count > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {review.report_count} reports
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {review.text || '(No text)'}
            </p>
            {review.photo_urls.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                📷 {review.photo_urls.length} photos
              </p>
            )}
          </div>
          
          <div className="w-32 text-sm">
            {review.business.name}
          </div>
          
          <div className="w-24 text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
          </div>
          
          <div className="w-24 flex gap-1">
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setViewingReview(review)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => handleApprove(review.id)}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setRejectingReview(review)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      
      {/* Detail sheet */}
      <ReviewDetailsSheet
        review={viewingReview}
        onClose={() => setViewingReview(null)}
        onApprove={() => {
          handleApprove(viewingReview!.id);
          setViewingReview(null);
        }}
        onReject={() => {
          setRejectingReview(viewingReview);
          setViewingReview(null);
        }}
      />
      
      {/* Reject dialog */}
      <RejectReviewDialog
        review={rejectingReview}
        onClose={() => setRejectingReview(null)}
        onSuccess={() => {
          setRejectingReview(null);
          onRefresh();
        }}
      />
    </div>
  );
}
```

---

### Audit Log Component

**File:** `src/components/admin/ModerationAuditLog.tsx`

```tsx
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface AuditEntry {
  id: string;
  review_id: string;
  action: 'approve' | 'reject';
  performed_by: string;
  reason: string | null;
  created_at: string;
  admin: {
    full_name: string;
  };
}

export function ModerationAuditLog() {
  const { data: logs } = useQuery({
    queryKey: ['moderation-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_moderation_log')
        .select(`
          *,
          admin:profiles!performed_by (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AuditEntry[];
    }
  });
  
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input placeholder="Search by review ID..." className="max-w-sm" />
      </div>
      
      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Date</th>
              <th className="text-left p-3 text-sm font-medium">Action</th>
              <th className="text-left p-3 text-sm font-medium">Review ID</th>
              <th className="text-left p-3 text-sm font-medium">Admin</th>
              <th className="text-left p-3 text-sm font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map(log => (
              <tr key={log.id} className="border-t">
                <td className="p-3 text-sm">
                  <div>{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                  <div className="text-muted-foreground text-xs">
                    {format(new Date(log.created_at), 'h:mm a')}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={log.action === 'approve' ? 'default' : 'destructive'}>
                    {log.action}
                  </Badge>
                </td>
                <td className="p-3 text-sm font-mono">
                  {log.review_id.slice(0, 8)}...
                </td>
                <td className="p-3 text-sm">
                  {log.admin?.full_name || 'Unknown'}
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {log.reason || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### Add Route to Admin

**File:** `src/router/Router.tsx` (additions)

```tsx
import { ReviewModerationPage } from '@/pages/admin/ReviewModerationPage';

// In admin routes:
<Route path="/admin/moderation" element={<ReviewModerationPage />} />
```

---

## Testing Plan

### Unit Tests

```typescript
describe('ModerationQueue', () => {
  it('displays pending reviews', () => {
    render(<ModerationQueue reviews={mockPendingReviews} ... />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  
  it('allows bulk selection', async () => {
    render(<ModerationQueue reviews={mockPendingReviews} ... />);
    await userEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });
  
  it('filters by search query', () => {
    render(<ModerationQueue reviews={mockReviews} searchQuery="Pizza" />);
    // Only reviews mentioning Pizza should show
  });
});
```

### Manual Testing Checklist

- [ ] Navigate to /admin/moderation
- [ ] See pending review count in tab badge
- [ ] Click review to see full details
- [ ] Approve review → Removed from queue
- [ ] Reject review with reason → Removed from queue
- [ ] Select multiple → Bulk approve works
- [ ] Toggle to "Reported" tab → See reviews with reports
- [ ] Check audit log shows all actions
- [ ] Search filters reviews correctly

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/ReviewModerationPage.tsx` | CREATE | Main dashboard page |
| `src/components/admin/ModerationQueue.tsx` | CREATE | Queue list component |
| `src/components/admin/ModerationStats.tsx` | CREATE | Stats summary |
| `src/components/admin/ModerationAuditLog.tsx` | CREATE | Audit log table |
| `src/components/admin/ReviewDetailsSheet.tsx` | CREATE | Review detail slide-out |
| `src/components/admin/RejectReviewDialog.tsx` | CREATE | Rejection form modal |
| `src/router/Router.tsx` | MODIFY | Add admin route |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing admin dashboard structure
- [ ] Review table/data grid components in use
- [ ] Look for existing bulk action patterns
- [ ] Check existing sheet/drawer components
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

**Test Route 1: Queue Navigation**
1. Login as admin
2. Navigate to /admin/moderation
3. Verify pending reviews visible
4. Verify reported reviews visible
5. Check count badges accurate

**Test Route 2: Individual Actions**
1. Click review → Details open
2. Click Approve → Review approved
3. Click Reject → Reason prompt → Review rejected
4. Verify both logged in audit trail

**Test Route 3: Bulk Actions**
1. Select multiple reviews
2. Click "Approve Selected"
3. Confirm → All approved
4. Verify all removed from queue

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

### Core Functionality (Completed)
- [x] Dashboard page accessible at /admin/moderation
- [x] Pending reviews visible with counts
- [x] Reported reviews visible with report counts
- [x] Individual approve/reject working
- [x] Bulk actions working
- [x] Audit log capturing all actions
- [x] Search and filter working
- [x] Stats summary displaying correctly

### Real-Time Updates (US-11.4.3.8)
- [ ] Pending tab updates within 1 second of new review submission
- [ ] Reported tab updates within 1 second of new report submission
- [ ] Count badges update in real-time
- [ ] Stats tiles update in real-time
- [ ] Supabase Realtime publication includes `business_reviews` and `review_reports`

### Notifications (US-11.4.3.9)
- [ ] Admin receives in-app notification for every new report
- [ ] Bell icon badge updates immediately
- [ ] Notification links to correct tab

### Queue Clearing (US-11.4.3.10)
- [ ] Moderated reviews disappear from queue immediately
- [ ] Moderation Log updates immediately
- [ ] Report status changes to `actioned`/`dismissed` after moderation

### Re-Submission Flow (US-11.4.3.11)
- [ ] Edited rejected reviews return to pending
- [ ] Re-submission badge visible in Pending tab
- [ ] Admin receives re-submission notification

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
