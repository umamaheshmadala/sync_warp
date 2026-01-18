# Story 11.4.3: Admin Moderation Dashboard

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 4 days  
**Dependencies:** Story 11.4.1 (Pre-Moderation), Story 11.4.2 (Report System)  
**Status:** 📋 Ready for Implementation

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
- [ ] Tab or page in admin dashboard: "Review Moderation"
- [ ] Shows pending reviews (newest pending at bottom - FIFO)
- [ ] Shows reported reviews (sorted by report count)
- [ ] Toggle between: All, Pending, Reported
- [ ] Count badges for each category
- [ ] Real-time updates when new reviews arrive

---

### US-11.4.3.2: Review Details Panel
**As an** admin reviewing a submission  
**I want to** see complete review details  
**So that** I can make informed moderation decisions

**Acceptance Criteria:**
- [ ] Full review text and photos
- [ ] All tags selected
- [ ] Reviewer profile info (name, join date, review count)
- [ ] Business info (name, category)
- [ ] GPS check-in status (verified/not verified)
- [ ] Report reasons (if any) with reporter info
- [ ] Reviewer's review history summary
- [ ] Fraud signals (if any)

---

### US-11.4.3.3: Individual Moderation Actions
**As an** admin  
**I want to** approve or reject individual reviews  
**So that** I can handle edge cases appropriately

**Acceptance Criteria:**
- [ ] "Approve" button → Publishes review immediately
- [ ] "Reject" button → Opens rejection reason modal
- [ ] Rejection reasons preset + custom option:
  - Spam or promotional content
  - Inappropriate language
  - Fake or misleading review
  - Not about actual experience
  - Other (custom text required)
- [ ] Confirm before action
- [ ] Review removed from queue after action

---

### US-11.4.3.4: Bulk Moderation Actions
**As an** admin  
**I want to** approve or reject multiple reviews at once  
**So that** I can efficiently clear large queues

**Acceptance Criteria:**
- [ ] Checkbox to select individual reviews
- [ ] "Select All" checkbox for current page
- [ ] "Approve Selected" button
- [ ] "Reject Selected" button (requires single reason for all)
- [ ] Confirmation: "Approve 5 reviews?"
- [ ] Progress indicator during bulk action
- [ ] Summary after: "5 approved, 0 rejected"

---

### US-11.4.3.5: Audit Trail View
**As an** admin  
**I want to** see history of moderation actions  
**So that** I can review decisions and ensure consistency

**Acceptance Criteria:**
- [ ] Separate "Audit Log" tab
- [ ] Shows: Date, Action, Review ID, Admin, Reason
- [ ] Filter by: Admin, Action type, Date range
- [ ] Search by review ID or reviewer name
- [ ] Export to CSV (optional)
- [ ] Retention: Keep indefinitely

---

### US-11.4.3.6: Queue Filtering & Search
**As an** admin  
**I want to** filter and search the moderation queue  
**So that** I can find specific reviews quickly

**Acceptance Criteria:**
- [ ] Search by: Business name, Reviewer name
- [ ] Filter by: Date range, Report reason, Business category
- [ ] Sort by: Date, Report count, Business
- [ ] Clear filters button
- [ ] Persist filter preferences

---

### US-11.4.3.7: Dashboard Summary Stats
**As an** admin  
**I want to** see moderation statistics at a glance  
**So that** I understand queue health

**Acceptance Criteria:**
- [ ] Pending reviews count (badge in nav)
- [ ] Today's processed count
- [ ] Average processing time
- [ ] Approval vs rejection ratio
- [ ] Most reported businesses (top 5)
- [ ] Trend chart (daily reviews over time)

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

## Definition of Done

- [ ] Dashboard page accessible at /admin/moderation
- [ ] Pending reviews visible with counts
- [ ] Reported reviews visible with report counts
- [ ] Individual approve/reject working
- [ ] Bulk actions working
- [ ] Audit log capturing all actions
- [ ] Search and filter working
- [ ] Stats summary displaying correctly
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
