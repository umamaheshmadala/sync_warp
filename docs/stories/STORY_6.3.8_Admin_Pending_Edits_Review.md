# Story 6.3.8: Admin Pending Edits Queue & Review

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2.5-3 days  
**Dependencies:** Story 6.3.6 (Infrastructure), Story 6.3.7 (Owner Experience)  
**Status:** 🟢 COMPLETE

---

## Overview

Implement the admin-facing UI for reviewing and acting on pending business edits. This includes the "Pending Edits" tab in Business Management, the diff review modal, and approve/reject/partial approval actions.

---

## User Stories

### US-6.3.8.1: Admin Sees Pending Edits Queue
**As an** admin  
**I want to** see all businesses with pending edit requests  
**So that** I can review and approve/reject changes

**Acceptance Criteria:**
- [ ] New tab in Business Management: "Pending Edits" (with count badge)
- [ ] Table columns: Business Name | Owner | Submitted At | Fields Changed | Actions
- [ ] "Fields Changed" shows count with hover tooltip listing field names
- [ ] Clicking row opens Pending Edits Review Modal
- [ ] Sorted by `created_at` (oldest first - FIFO)
- [ ] Count badge updates on approval/rejection

---

### US-6.3.8.2: Admin Reviews Pending Edits (Diff View)
**As an** admin  
**I want to** see a side-by-side comparison of old vs new values  
**So that** I can make informed approval decisions

**Acceptance Criteria:**
- [ ] **Pending Edits Review Modal** displays:
  - Business name (current approved)
  - Owner name and contact
  - Submitted at timestamp
  - **Diff Table:** Field | Current (Approved) | Requested (Pending) | Action
- [ ] Each row has individual ✓ Approve / ✗ Reject buttons
- [ ] Visual highlighting:
  - Added text: Green highlight
  - Removed text: Red strikethrough
  - Changed text: Yellow background
- [ ] Footer buttons: "Approve All" | "Reject All" | "Save Partial" | "Cancel"

---

### US-6.3.8.3: Admin Approves All Changes
**As an** admin  
**I want to** approve all pending changes at once  
**So that** I can quickly process straightforward requests

**Acceptance Criteria:**
- [ ] "Approve All" button in modal footer
- [ ] Confirmation dialog: "Approve all X pending changes for {Business Name}?"
- [ ] On confirm:
  - Pending values copied to `businesses` table
  - `business_pending_edits` record deleted
  - `has_pending_edits` set to `false`
  - Audit log: action = 'edit_approved'
  - Owner notification sent
- [ ] Success toast: "All changes approved"

---

### US-6.3.8.4: Admin Rejects All Changes
**As an** admin  
**I want to** reject all pending changes with a reason  
**So that** I can decline inappropriate edit requests

**Acceptance Criteria:**
- [ ] "Reject All" button in modal footer
- [ ] Rejection dialog with:
  - Reason dropdown (preset options)
  - Custom text area (500 char limit)
- [ ] On confirm:
  - `business_pending_edits` record deleted
  - `has_pending_edits` set to `false`
  - Audit log: action = 'edit_rejected', reason = provided
  - Owner notification with reason
- [ ] Original approved values unchanged

---

### US-6.3.8.5: Admin Partially Approves/Rejects Changes
**As an** admin  
**I want to** approve some changes and reject others  
**So that** I can handle mixed edit requests fairly

**Acceptance Criteria:**
- [ ] Each field row has individual ✓ / ✗ buttons
- [ ] ✓ marks field as "approved" (green checkmark)
- [ ] ✗ marks field as "rejected" (red X)
- [ ] "Save Partial" enabled when all fields have a decision
- [ ] On "Save Partial":
  - Approved fields: Values copied to `businesses`
  - Rejected fields: Logged with reason (prompt for reason)
  - Pending edits record deleted
  - `has_pending_edits` set to `false`
  - Audit log: action = 'edit_partial_approved', with breakdown
  - Owner notification shows partial results

---

## Technical Requirements

### Service Layer

**File:** `src/services/adminPendingEditsService.ts`

```typescript
export async function getPendingEditsList(params: PaginationParams): Promise<PendingEditsListResult> { ... }
export async function getPendingEditDetails(businessId: string): Promise<PendingEditDetails> { ... }
export async function approveAllPendingEdits(businessId: string): Promise<void> { ... }
export async function rejectAllPendingEdits(businessId: string, reason: string): Promise<void> { ... }
export async function partialApprovePendingEdits(businessId: string, decisions: FieldDecision[]): Promise<void> { ... }
```

### Component Structure

```
src/components/admin/business-management/
├── PendingEditsTab.tsx              # Tab content with queue table
├── PendingEditsTable.tsx            # Table component
├── PendingEditsReviewModal.tsx      # Diff review modal
├── FieldDiffRow.tsx                 # Single field comparison row
├── ApproveEditsDialog.tsx           # Confirm all approval
├── RejectEditsDialog.tsx            # Rejection with reason
└── PartialApprovalHandler.tsx       # Partial approve/reject logic
```

---

## UI/UX Specifications

### Pending Edits Tab (Admin)
```
┌─────────────────────────────────────────────────────────────────┐
│ [Pending] [Approved] [Rejected] [Deleted] [Pending Edits (3)]   │
├─────────────────────────────────────────────────────────────────┤
│ Business Name   │ Owner        │ Submitted    │ Fields │ Action │
├─────────────────┼──────────────┼──────────────┼────────┼────────┤
│ Pizza Palace    │ John Doe     │ 2 hours ago  │ 3      │ Review │
│ Coffee House    │ Jane Smith   │ 1 day ago    │ 1      │ Review │
└─────────────────────────────────────────────────────────────────┘
```

### Pending Edits Review Modal
```
┌─────────────────────────────────────────────────────────────────┐
│ Review Pending Changes - Pizza Palace                      [×]  │
├─────────────────────────────────────────────────────────────────┤
│ Owner: John Doe (john@example.com)                              │
│ Submitted: Feb 2, 2026 at 3:45 PM                               │
├─────────────────────────────────────────────────────────────────┤
│ FIELD           │ CURRENT (APPROVED)    │ REQUESTED      │ ACT │
├─────────────────┼───────────────────────┼────────────────┼─────┤
│ Business Name   │ Pizza Palace          │ Best Pizza     │ ✓ ✗ │
│ Address         │ 123 Main Street       │ 456 Oak Avenue │ ✓ ✗ │
│ Categories      │ Restaurant, Food      │ Fast Food      │ ✓ ✗ │
├─────────────────────────────────────────────────────────────────┤
│     [Reject All]        [Approve All]        [Save Partial]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Definition of Done

- [ ] "Pending Edits" tab added to Business Management page
- [ ] Pending edits table displays queue with count badge
- [ ] Diff review modal shows side-by-side comparison
- [ ] Approve All, Reject All, and Save Partial actions work correctly
- [ ] Audit log captures all actions with changes_json
- [ ] Owner notifications sent on all decision types
- [ ] Browser tests pass with evidence

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/adminPendingEditsService.ts` | CREATE |
| `src/components/admin/business-management/PendingEditsTab.tsx` | CREATE |
| `src/components/admin/business-management/PendingEditsTable.tsx` | CREATE |
| `src/components/admin/business-management/PendingEditsReviewModal.tsx` | CREATE |
| `src/components/admin/business-management/FieldDiffRow.tsx` | CREATE |
| `src/pages/admin/BusinessManagementPage.tsx` | MODIFY (add tab) |

---

**Story Owner:** Full-Stack Engineering  
**Reviewer:** [TBD]
