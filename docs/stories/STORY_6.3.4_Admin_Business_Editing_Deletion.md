# Story 6.3.4: Admin Business Management - Editing & Deletion

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🟡 P1 - HIGH  
**Effort:** 1.5 days  
**Dependencies:** Story 6.3.1, 6.3.2, 6.3.3  
**Status:** ⚪ PLANNED

---

## Overview

Implement admin capabilities to edit business information and delete businesses (soft-delete by default, hard-delete for spam/fraud).

Make sure to utilize the existing code to your advantage. Few of the features that are in the stories of EPIC 6.3 are fully or partially implemented. Make sure you utilize those codes, modules, or functionalities to your advantage. 
---

## User Stories

### US-6.3.4.1: Edit Business Information
**As an** admin, **I want to** edit any business information **So that** I can fix incorrect entries.

**Acceptance Criteria:**
- [ ] Edit button opens modal with all editable fields
- [ ] **Editable Fields:**
  - Business name, type, description
  - Email, phone, website
  - Address, city, state, postal code
  - Operating hours (visual editor)
  - **Logo image** (upload/replace/remove)
  - **Cover image** (upload/replace/remove)
  - **Tags/Categories** (multi-select)
  - Social media links
- [ ] Form validation for required fields
- [ ] Image preview before save
- [ ] Changes logged to `admin_business_actions` with `changes_json` (before/after)
- [ ] Success toast on save
- [ ] "Notify owner" checkbox (default checked for major changes)

---

### US-6.3.4.2: Soft Delete Business
**As an** admin, **I want to** soft-delete a business **So that** it's hidden but recoverable.

**Acceptance Criteria:**
- [ ] Delete button opens confirmation dialog
- [ ] Required reason field
- [ ] Sets `deleted_at`, `deleted_by`, `status='deleted'`
- [ ] **Cascade Soft-Delete Behavior:**
  - Offers: Set `deleted_at` to hide from public
  - Products: Set `deleted_at` to hide from public
  - Followers: Deactivate relationships (keep data)
  - Reviews: **Keep visible** (attributed to "Business no longer available")
  - Check-ins: **Keep as historical data**
- [ ] Business moves to "Deleted" tab
- [ ] Owner notified of deletion

---

### US-6.3.4.3: Hard Delete (Spam/Fraud)
**As an** admin, **I want to** permanently delete spam businesses **So that** bad data is removed.

**Acceptance Criteria:**
- [ ] Only available for already soft-deleted businesses
- [ ] Requires typing business name to confirm
- [ ] Checkbox: "I understand this is permanent"
- [ ] Actually DELETEs row and cascades to related tables
- [ ] Cannot be undone

---

### US-6.3.4.4: Restore Deleted Business
**As an** admin, **I want to** restore soft-deleted businesses **So that** accidental deletions can be fixed.

**Acceptance Criteria:**
- [ ] Restore button visible in "Deleted" tab
- [ ] Clears `deleted_at`, sets `status='pending'`
- [ ] **Cascade Restore Behavior:**
  - Offers: Clear `deleted_at` to restore visibility
  - Products: Clear `deleted_at` to restore visibility
  - Followers: Reactivate relationships
- [ ] Business moves to "Pending" tab for re-review
- [ ] Owner notified of restoration

---

### US-6.3.4.5: Operating Hours Editor
**As an** admin, **I want to** easily edit operating hours **So that** I don't have to edit JSON manually.

**Acceptance Criteria:**
- [ ] Visual schedule editor (day rows with time pickers)
- [ ] Checkbox for "Closed" days
- [ ] Validation: close time > open time
- [ ] Converts to JSONB on save

---

## Technical Requirements

### Service Updates

```typescript
// src/services/adminBusinessService.ts
export async function updateBusiness(id: string, data: Partial<Business>, changes: object, notify: boolean);
export async function softDeleteBusiness(id: string, reason: string);
export async function restoreBusiness(id: string);
```

### Components to Create

- `EditBusinessModal.tsx` - Edit form
- `DeleteBusinessDialog.tsx` - Soft delete confirmation
- `HardDeleteDialog.tsx` - Permanent delete with confirmation
- `RestoreBusinessDialog.tsx` - Restore confirmation
- `OperatingHoursEditor.tsx` - Schedule UI

---

## Testing Plan

**Test Credentials:** testuser1@gmail.com / Testuser@1

1. Edit a business → verify changes saved and logged
2. Soft delete → verify moves to Deleted tab
3. Restore → verify moves to Pending tab
4. Owner receives notifications for each action

---

## Definition of Done

- [ ] Edit modal works with form validation
- [ ] Soft/hard delete work correctly
- [ ] Restore functionality works
- [ ] All actions logged to audit table
- [ ] Owner notifications sent
- [ ] Browser tests pass

---

**Story Owner:** Frontend Engineering
