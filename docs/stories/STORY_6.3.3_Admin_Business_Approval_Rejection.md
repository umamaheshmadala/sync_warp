# Story 6.3.3: Admin Business Management - Approval & Rejection Workflow

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** Story 6.3.1 (Database), Story 6.3.2 (Listing UI)  
**Status:** ⚪ PLANNED

---

## Overview

Implement the individual approval and rejection workflow for businesses. This includes the business detail modal, action confirmation dialogs, rejection reason form, and real-time status updates. Each business must be verified individually (NO bulk operations per user requirement).

---

## Problem Statement

### Current State
- Admins cannot approve or reject businesses
- No interface to view full business details
- No rejection reason capture mechanism
- Business owners are not notified of status changes

### Desired State
- Detailed business view modal with all information
- Individual approve button with confirmation
- Rejection dialog with required reason
- Push and in-app notifications to business owners
- Real-time status updates in the UI

---

## User Stories

### US-6.3.3.1: Business Detail Modal
**As an** admin  
**I want to** view complete business details in a modal  
**So that** I can make informed approval/rejection decisions

**Acceptance Criteria:**
- [ ] Click business name or "View" icon opens detail modal
- [ ] Modal tabs: "Details", "Audit History", "Owner Info"
- [ ] **Details tab** shows:
  - Business name, type, description
  - Contact: email, phone, website
  - Address: full address, city, state, postal code
  - Location: map preview with coordinates (optional)
  - Operating hours (formatted table)
  - Social media links
  - Logo and cover image preview
  - Gallery images carousel
  - Categories and tags
  - Registration date
  - Current status with timestamp
  - **Claim Status** (✅ Claimed by [user] on [date] | ⚠️ Unclaimed | 🔄 Claim Pending)
- [ ] **Audit History tab** shows:
  - All admin actions from `admin_business_actions` table
  - Format: Date | Action | Admin | Reason
  - Sorted newest first
- [ ] **Owner Info tab** shows:
  - Owner name (from profiles)
  - Owner email (link: mailto:)
  - Owner phone (link: tel:)
  - Owner registration date
  - Owner's other businesses count
  - Link: "View Owner's Other Businesses"
- [ ] Close button (X) in top right
- [ ] Modal is scrollable for long content

---

### US-6.3.3.2: Individual Approve Action
**As an** admin  
**I want to** approve a business individually  
**So that** it becomes visible to users on the platform

**Acceptance Criteria:**
- [ ] "Approve" button visible in table row actions (checkmark icon)
- [ ] "Approve" button visible in detail modal footer
- [ ] Clicking opens confirmation dialog:
  - Title: "Approve Business"
  - Message: "Are you sure you want to approve **{Business Name}**? This will make it visible to all users."
  - Buttons: "Cancel" | "Approve"
- [ ] Approve button in dialog uses primary green color
- [ ] On confirm:
  - Call `admin_approve_business` database function
  - Show loading spinner during operation
  - Show success toast: "Business approved successfully"
  - Update table row status badge to "Active" immediately
  - Close detail modal if open
  - Decrement "Pending" tab count, increment "Active" count
- [ ] On error:
  - Show error toast with message
  - Keep modal/dialog open for retry

---

### US-6.3.3.3: Individual Reject Action
**As an** admin  
**I want to** reject a business with a required reason  
**So that** the owner understands why their business was rejected

**Acceptance Criteria:**
- [ ] "Reject" button visible in table row actions (X icon)
- [ ] "Reject" button visible in detail modal footer (red/destructive variant)
- [ ] Clicking opens rejection dialog:
  - Title: "Reject Business"
  - Business name displayed prominently
  - **Reason** field (required):
    - Dropdown with preset reasons:
      - "Incomplete or inaccurate information"
      - "Duplicate business listing"
      - "Fraudulent or spam entry"
      - "Business does not comply with platform policies"
      - "Insufficient verification documents"
      - "Other (specify below)"
    - Custom text area (required if "Other" selected, optional otherwise)
    - Character limit: 500 characters
    - Real-time character count
  - Buttons: "Cancel" | "Reject Business"
- [ ] Reject button disabled until reason provided
- [ ] On confirm:
  - Call `admin_reject_business` database function with reason
  - Show loading spinner during operation
  - Show success toast: "Business rejected"
  - Update table row status badge to "Rejected" immediately
  - Close detail modal if open
  - Decrement "Pending" tab count, increment "Rejected" count
- [ ] Reason is stored in `businesses.rejection_reason` AND `admin_business_actions.reason`

---

### US-6.3.3.4: Action Buttons in Table Row
**As an** admin  
**I want to** have quick action buttons in each table row  
**So that** I can take actions without opening the detail modal

**Acceptance Criteria:**
- [ ] Action buttons column in table:
  - 👁️ View (Eye icon) - Opens detail modal
  - ✓ Approve (Check icon) - Green, only shown if status is pending/rejected
  - ✗ Reject (X icon) - Red, only shown if status is pending/active
  - ✏️ Edit (Pencil icon) - Opens edit modal (Story 6.3.4)
  - 🗑️ Delete (Trash icon) - Opens delete confirmation (Story 6.3.4)
- [ ] Icons have tooltips on hover
- [ ] Icons use appropriate colors:
  - View: Gray/neutral
  - Approve: Green
  - Reject: Red
  - Edit: Blue
  - Delete: Red
- [ ] Conditional visibility based on current status:
  - Pending: Show all except Restore
  - Active: Show View, Edit, Delete, Reject
  - Rejected: Show View, Approve, Delete
  - Deleted: Show View, Restore (Story 6.3.4)

---

### US-6.3.3.5: Notify Business Owner on Approval
**As a** platform  
**I want to** notify business owners when their business is approved  
**So that** they know to start promoting their listing

**Acceptance Criteria:**
- [ ] On approval, create notification in `notification_log`:
  - Type: `business_approved`
  - Recipient: Business owner (user_id)
  - Title: "Your business has been approved! 🎉"
  - Body: "Great news! {Business Name} is now live and visible to customers."
  - Action URL: `/business/{business_id}/storefront`
- [ ] Send push notification (if enabled for user)
- [ ] In-app notification appears in bell icon immediately
- [ ] Notification badge count updates

---

### US-6.3.3.6: Notify Business Owner on Rejection
**As a** platform  
**I want to** notify business owners when their business is rejected  
**So that** they can address the issues and resubmit

**Acceptance Criteria:**
- [ ] On rejection, create notification in `notification_log`:
  - Type: `business_rejected`
  - Recipient: Business owner (user_id)
  - Title: "Action required for your business listing"
  - Body: "Your listing for {Business Name} needs attention. Reason: {rejection_reason}"
  - Action URL: `/my-businesses?id={business_id}`
- [ ] Send push notification (if enabled for user)
- [ ] In-app notification appears in bell icon immediately
- [ ] Notification includes the rejection reason

---

### US-6.3.3.7: Re-approval After Rejection
**As an** admin  
**I want to** approve a previously rejected business  
**So that** owners who fix their issues can get approved

**Acceptance Criteria:**
- [ ] Approve button visible on rejected businesses
- [ ] Approval clears:
  - `rejection_reason` → NULL
  - `rejected_at` → NULL
  - `rejected_by` → NULL
- [ ] Sets:
  - `status` → 'active'
  - `approved_at` → NOW()
  - `approved_by` → admin_id
- [ ] Notification sent to owner: "Your business has been approved!"

---

## Technical Requirements

### Service Layer

**File:** `src/services/adminBusinessService.ts` (additions)

```typescript
// Approve business
export async function approveBusiness(businessId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase.rpc('admin_approve_business', {
    p_business_id: businessId,
    p_admin_id: user.id
  });
  
  if (error) throw error;
  
  // Trigger notification (handled by database trigger or here)
  await sendBusinessApprovalNotification(businessId);
}

// Reject business
export async function rejectBusiness(businessId: string, reason: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase.rpc('admin_reject_business', {
    p_business_id: businessId,
    p_admin_id: user.id,
    p_reason: reason
  });
  
  if (error) throw error;
  
  // Trigger notification
  await sendBusinessRejectionNotification(businessId, reason);
}

// Get business details for modal
export async function getBusinessDetails(businessId: string): Promise<AdminBusinessDetails> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      owner:profiles!user_id (
        id,
        full_name,
        email,
        phone_number,
        created_at
      )
    `)
    .eq('id', businessId)
    .single();
  
  if (error) throw error;
  return data;
}

// Get audit history for a business
export async function getBusinessAuditHistory(businessId: string) {
  const { data, error } = await supabase
    .from('admin_business_actions')
    .select(`
      id,
      action,
      reason,
      created_at,
      admin:profiles!admin_id (
        full_name
      )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}
```

### Notification Service

**File:** `src/services/adminNotificationService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export async function sendBusinessApprovalNotification(businessId: string): Promise<void> {
  // Get business and owner details
  const { data: business } = await supabase
    .from('businesses')
    .select('business_name, user_id')
    .eq('id', businessId)
    .single();
  
  if (!business) return;
  
  // Insert notification
  await supabase.from('notification_log').insert({
    user_id: business.user_id,
    type: 'business_approved',
    title: 'Your business has been approved! 🎉',
    message: `Great news! ${business.business_name} is now live and visible to customers.`,
    action_url: `/business/${businessId}/storefront`,
    is_read: false
  });
  
  // TODO: Trigger push notification via Edge Function
}

export async function sendBusinessRejectionNotification(
  businessId: string, 
  reason: string
): Promise<void> {
  const { data: business } = await supabase
    .from('businesses')
    .select('business_name, user_id')
    .eq('id', businessId)
    .single();
  
  if (!business) return;
  
  await supabase.from('notification_log').insert({
    user_id: business.user_id,
    type: 'business_rejected',
    title: 'Action required for your business listing',
    message: `Your listing for ${business.business_name} needs attention. Reason: ${reason}`,
    action_url: `/my-businesses?id=${businessId}`,
    is_read: false
  });
}
```

### Component Structure

```
src/components/admin/business-management/
├── BusinessDetailModal.tsx        # Full business details modal
├── BusinessDetailTabs.tsx         # Tab content switcher
├── BusinessDetailsTab.tsx         # Details view
├── BusinessAuditHistoryTab.tsx    # Audit log view
├── BusinessOwnerInfoTab.tsx       # Owner information
├── ApproveBusinessDialog.tsx      # Approval confirmation
├── RejectBusinessDialog.tsx       # Rejection form
└── BusinessActionButtons.tsx      # Row action icons
```

### Business Detail Modal Component

**File:** `src/components/admin/business-management/BusinessDetailModal.tsx`

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { BusinessDetailsTab } from './BusinessDetailsTab';
import { BusinessAuditHistoryTab } from './BusinessAuditHistoryTab';
import { BusinessOwnerInfoTab } from './BusinessOwnerInfoTab';
import { ApproveBusinessDialog } from './ApproveBusinessDialog';
import { RejectBusinessDialog } from './RejectBusinessDialog';
import { useBusinessDetails } from '@/hooks/useBusinessDetails';

interface BusinessDetailModalProps {
  businessId: string | null;
  onClose: () => void;
  onActionComplete: () => void;
}

export function BusinessDetailModal({ 
  businessId, 
  onClose,
  onActionComplete 
}: BusinessDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  const { data: business, isLoading } = useBusinessDetails(businessId);
  
  if (!businessId) return null;
  
  const canApprove = business?.status === 'pending' || business?.status === 'rejected';
  const canReject = business?.status === 'pending' || business?.status === 'active';
  
  return (
    <>
      <Dialog open={!!businessId} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {business?.business_name || 'Business Details'}
            </DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="py-12 text-center">Loading...</div>
          ) : business ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="audit">Audit History</TabsTrigger>
                <TabsTrigger value="owner">Owner Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4">
                <BusinessDetailsTab business={business} />
              </TabsContent>
              
              <TabsContent value="audit" className="mt-4">
                <BusinessAuditHistoryTab businessId={businessId} />
              </TabsContent>
              
              <TabsContent value="owner" className="mt-4">
                <BusinessOwnerInfoTab owner={business.owner} />
              </TabsContent>
            </Tabs>
          ) : null}
          
          <DialogFooter className="flex gap-2">
            {canApprove && (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowApproveDialog(true)}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ApproveBusinessDialog
        business={business}
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onSuccess={() => {
          setShowApproveDialog(false);
          onActionComplete();
          onClose();
        }}
      />
      
      <RejectBusinessDialog
        business={business}
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onSuccess={() => {
          setShowRejectDialog(false);
          onActionComplete();
          onClose();
        }}
      />
    </>
  );
}
```

---

## UI/UX Specifications

### Rejection Dialog Layout

```
┌─────────────────────────────────────────────────────────┐
│ Reject Business                                    [×]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Business: **Pizza Palace**                              │
│                                                         │
│ Reason for rejection: *                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Select a reason...                              ▼   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Additional details:                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │                                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                          125/500 chars  │
│                                                         │
│           [Cancel]          [Reject Business]           │
│                             (disabled if no reason)     │
└─────────────────────────────────────────────────────────┘
```

### Detail Modal Tabs Layout

```
┌─────────────────────────────────────────────────────────┐
│ Pizza Palace                                       [×]  │
├─────────────────────────────────────────────────────────┤
│ [Details] [Audit History] [Owner Info]                  │
├─────────────────────────────────────────────────────────┤
│ BASIC INFORMATION                                       │
│ Name: Pizza Palace                                      │
│ Type: Restaurant                                        │
│ Description: Best pizza in town...                      │
│                                                         │
│ CONTACT                                                 │
│ Email: info@pizzapalace.com                             │
│ Phone: +91 98765 43210                                  │
│ Website: www.pizzapalace.com                            │
│                                                         │
│ ADDRESS                                                 │
│ 123 Main Street, Downtown                               │
│ Mumbai, Maharashtra 400001                              │
│                                                         │
│ OPERATING HOURS                                         │
│ Mon-Fri: 10:00 AM - 10:00 PM                            │
│ Sat-Sun: 11:00 AM - 11:00 PM                            │
│                                                         │
│ IMAGES                                                  │
│ [Logo] [Cover Image] [Gallery...]                       │
├─────────────────────────────────────────────────────────┤
│      [Approve]              [Reject]              │
└─────────────────────────────────────────────────────────┘
```

---

## Testing Plan

### Manual Testing Checklist

#### Test Route 1: View Business Details
1. Login as admin (testuser1@gmail.com / Testuser@1)
2. Navigate to `/admin/businesses`
3. Click on a business name → Detail modal opens
4. Verify all details displayed correctly
5. Click "Audit History" tab → History shown
6. Click "Owner Info" tab → Owner details shown
7. Close modal via X button

#### Test Route 2: Approve Business
1. In "Pending" tab, find a pending business
2. Click approve (checkmark) icon
3. Confirm dialog appears with business name
4. Click "Approve"
5. Success toast appears
6. Business moves to "Approved" tab
7. Tab counts update

#### Test Route 3: Reject Business
1. In "Pending" tab, find a pending business
2. Click reject (X) icon
3. Rejection dialog opens
4. Select "Other" reason
5. Type custom reason text
6. Click "Reject Business"
7. Success toast appears
8. Business moves to "Rejected" tab

#### Test Route 4: Verify Notifications
1. After approving a business, note the owner's user ID
2. Login as that owner (testuser3@gmail.com / Testuser@1)
3. Check notification bell → Approval notification visible
4. Click notification → Navigates to storefront

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Review existing modal patterns (`Dialog` component usage)
- [ ] Check notification service patterns
- [ ] Review existing tab component implementations
- [ ] Verify database functions from Story 6.3.1 exist

### 2. Database Function Verification
- [ ] Test `admin_approve_business` function manually
- [ ] Test `admin_reject_business` function manually
- [ ] Verify RLS allows admin operations

### 3. Browser Testing & Evidence Collection

**Test Environment:**
- Local dev server: `http://localhost:5173`

**Test Credentials:**
| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | testuser1@gmail.com | Testuser@1 | Admin |
| Business Owner | testuser3@gmail.com | Testuser@1 | Has business |

**Evidence Collection Requirements:**
- [ ] **Screenshot** business detail modal (all 3 tabs)
- [ ] **Screenshot** approval confirmation dialog
- [ ] **Screenshot** rejection dialog with reason
- [ ] **Screenshot** notification received by owner
- [ ] **Record** approval flow end-to-end

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/business-management/BusinessDetailModal.tsx` | CREATE | Main detail modal |
| `src/components/admin/business-management/ApproveBusinessDialog.tsx` | CREATE | Approval confirmation |
| `src/components/admin/business-management/RejectBusinessDialog.tsx` | CREATE | Rejection form |
| `src/components/admin/business-management/BusinessDetailsTab.tsx` | CREATE | Details tab content |
| `src/components/admin/business-management/BusinessAuditHistoryTab.tsx` | CREATE | Audit tab content |
| `src/components/admin/business-management/BusinessOwnerInfoTab.tsx` | CREATE | Owner tab content |
| `src/services/adminBusinessService.ts` | MODIFY | Add approve/reject functions |
| `src/services/adminNotificationService.ts` | CREATE | Business notifications |
| `src/hooks/useBusinessDetails.ts` | CREATE | React Query hook |

---

## Definition of Done

- [ ] Business detail modal shows all information in 3 tabs
- [ ] Approve action works with confirmation dialog
- [ ] Reject action requires reason with preset options
- [ ] Status badges update immediately after action
- [ ] Tab counts update in real-time
- [ ] Business owner receives in-app notification on approval
- [ ] Business owner receives in-app notification on rejection
- [ ] Audit log entries created for all actions
- [ ] Error handling with user-friendly messages
- [ ] All browser tests pass with evidence

---

## Dependencies

- **Requires:** Story 6.3.1 (Database), Story 6.3.2 (Listing UI)
- **Blocks:** None
- **Related:** Story 6.3.4 (Edit/Delete), Story 6.3.5 (Audit Log)

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
