# Story 6.3.3b: Admin Business Management - Approve & Reject Actions

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 1 day  
**Dependencies:** Story 6.3.1 (Database), Story 6.3.2 (Listing UI), Story 6.3.3a (Detail Modal)  
**Status:** 🟢 COMPLETED

---

## Overview

Implement the individual approval and rejection workflow for businesses. This includes action confirmation dialogs, rejection reason form, real-time status updates, and owner notifications. Each business must be verified individually (NO bulk operations per user requirement).

> **Note:** Make sure to utilize existing code. The notification service (`adminNotificationService.ts`) is already implemented and should be reused.

---

## User Stories

### US-6.3.3b.1: Individual Approve Action
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

### US-6.3.3b.2: Individual Reject Action
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

### US-6.3.3b.3: Re-approval After Rejection
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

### US-6.3.3b.4: Notify Business Owner on Approval
**As a** platform  
**I want to** notify business owners when their business is approved  
**So that** they know to start promoting their listing

**Acceptance Criteria:**
- [ ] On approval, call `sendBusinessApprovalNotification()` from `adminNotificationService.ts`
- [ ] Notification details:
  - Type: `business_approved`
  - Title: "Your business has been approved! 🎉"
  - Body: "Great news! {Business Name} is now live and visible to customers."
- [ ] In-app notification appears in bell icon immediately
- [ ] Notification badge count updates
- [ ] Push notification sent via existing EPIC 7.4 infrastructure

---

### US-6.3.3b.5: Notify Business Owner on Rejection
**As a** platform  
**I want to** notify business owners when their business is rejected  
**So that** they can address the issues and resubmit

**Acceptance Criteria:**
- [ ] On rejection, call `sendBusinessRejectionNotification()` from `adminNotificationService.ts`
- [ ] Notification details:
  - Type: `business_rejected`
  - Title: "Action required for your business listing"
  - Body: "Your listing for {Business Name} needs attention. Reason: {rejection_reason}"
- [ ] In-app notification appears in bell icon immediately
- [ ] Notification includes the rejection reason
- [ ] Push notification sent via existing EPIC 7.4 infrastructure

---

## Technical Requirements

### Service Layer

**File:** `src/services/adminBusinessService.ts` (additions)

```typescript
import { sendBusinessApprovalNotification, sendBusinessRejectionNotification } from './adminNotificationService';

// Approve business
export async function approveBusiness(businessId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase.rpc('admin_approve_business', {
    p_business_id: businessId,
    p_admin_id: user.id
  });
  
  if (error) throw error;
  
  // Send notification
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
  
  // Send notification
  await sendBusinessRejectionNotification(businessId, reason);
}
```

### Component Structure

```
src/components/admin/business-management/
├── ApproveBusinessDialog.tsx      # Approval confirmation
└── RejectBusinessDialog.tsx       # Rejection form with reason
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

### Approval Dialog Layout

```
┌─────────────────────────────────────────────────────────┐
│ Approve Business                                   [×]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Are you sure you want to approve **Pizza Palace**?      │
│                                                         │
│ This will make it visible to all users.                 │
│                                                         │
│           [Cancel]          [Approve]                   │
│                             (green button)              │
└─────────────────────────────────────────────────────────┘
```

---

## Testing Plan

### Manual Testing Checklist

#### Test Route 1: Approve Business
1. Login as admin (testuser1@gmail.com / Testuser@1)
2. Navigate to `/admin/businesses`
3. In "Pending" tab, find a pending business
4. Click approve (checkmark) icon
5. Confirm dialog appears with business name
6. Click "Approve"
7. Success toast appears
8. Business moves to "Active" tab
9. Tab counts update

#### Test Route 2: Reject Business
1. In "Pending" tab, find a pending business
2. Click reject (X) icon
3. Rejection dialog opens
4. Select "Other" reason
5. Type custom reason text
6. Click "Reject Business"
7. Success toast appears
8. Business moves to "Rejected" tab

#### Test Route 3: Re-approve Rejected Business
1. In "Rejected" tab, find a rejected business
2. Click approve icon
3. Confirm approval
4. Verify status changes to "Active"
5. Verify `rejection_reason` is cleared

#### Test Route 4: Verify Notifications
1. After approving a business, note the owner's user ID
2. Login as that owner (testuser3@gmail.com / Testuser@1)
3. Check notification bell → Approval notification visible
4. Click notification → Navigates to storefront

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/business-management/ApproveBusinessDialog.tsx` | CREATE | Approval confirmation |
| `src/components/admin/business-management/RejectBusinessDialog.tsx` | CREATE | Rejection form |
| `src/services/adminBusinessService.ts` | MODIFY | Add approve/reject functions |
| `src/components/admin/business-management/BusinessDetailModal.tsx` | MODIFY | Add dialog triggers |

---

## Definition of Done

- [ ] Approve action works with confirmation dialog
- [ ] Reject action requires reason with preset options
- [ ] Re-approval clears rejection fields
- [ ] Status badges update immediately after action
- [ ] Tab counts update in real-time
- [ ] Business owner receives in-app notification on approval
- [ ] Business owner receives in-app notification on rejection
- [ ] Audit log entries created for all actions
- [ ] Error handling with user-friendly messages
- [ ] All browser tests pass with evidence

---

## Dependencies

- **Requires:** Story 6.3.1 (Database), Story 6.3.2 (Listing UI), Story 6.3.3a (Detail Modal)
- **Blocks:** None
- **Related:** Story 6.3.4 (Edit/Delete), Story 6.3.5 (Audit Log)

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
