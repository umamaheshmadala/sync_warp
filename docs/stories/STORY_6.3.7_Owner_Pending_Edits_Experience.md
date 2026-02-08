# Story 6.3.7: Owner Pending Edits Experience

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🟠 P1 - HIGH  
**Effort:** 1 day  
**Dependencies:** Story 6.3.6 (Pending Edits Infrastructure)  
**Status:** 🟢 COMPLETE  
**Blocks:** Story 6.3.8

---

## Overview

Implement the business owner-facing UI for the pending edits workflow. This includes the "Pending Changes" banner, the ability to overwrite pending edits, and success/info messaging.

---

## User Stories

### US-6.3.7.1: Owner Sees Pending Changes Banner
**As a** business owner  
**I want to** see a banner when my business has pending edits  
**So that** I know changes are awaiting admin review

**Acceptance Criteria:**
- [ ] Yellow banner displayed on owner's storefront view when `has_pending_edits = true`
- [ ] Banner text: "⏳ Changes pending admin approval"
- [ ] Banner lists pending field changes: e.g., "Name: 'Old' → 'New'"
- [ ] Banner has a dismiss (X) button (temporary, returns on reload)
- [ ] Banner NOT visible to public users

---

### US-6.3.7.2: Owner Submits Sensitive Edit → Pending
**As a** business owner  
**I want** sensitive field edits to be submitted for review  
**So that** my business remains active while changes are reviewed

**Acceptance Criteria:**
- [ ] When editing `business_name`, `address`, `city`, `state`, `postal_code`, or `categories`:
  - Changes stored in `business_pending_edits`
  - Original values remain on `businesses` table
  - Business status remains `active`
- [ ] Success toast: "Your changes have been submitted for review"
- [ ] Pending changes banner appears after save

---

### US-6.3.7.3: Owner Can Overwrite Pending Changes
**As a** business owner  
**I want to** update my pending changes before admin review  
**So that** only my final intended changes are approved

**Acceptance Criteria:**
- [ ] If pending edits exist, new edits to same fields overwrite old values
- [ ] If editing different sensitive field, it's added to existing pending record
- [ ] `pending_edits.updated_at` timestamp updated
- [ ] Message: "Your previous pending changes have been updated"

---

### US-6.3.7.4: Owner Instant Update for Non-Sensitive Fields
**As a** business owner  
**I want** non-sensitive field edits to apply immediately  
**So that** I can update contact info and hours without delay

**Acceptance Criteria:**
- [ ] Edits to `business_phone`, `business_email`, `operating_hours`, `description`, `logo_url`, `cover_image_url`, `website_url`, `social_media` apply instantly
- [ ] Changes visible to public immediately
- [ ] Success message: "Changes saved successfully"

---

### US-6.3.7.5: Owner Receives Notification on Decision
**As a** business owner  
**I want to** be notified when my edit request is decided  
**So that** I know if my changes are live or need adjustment

**Acceptance Criteria:**
- [ ] **On Approval:** In-app notification: "Your business changes have been approved! 🎉"
- [ ] **On Rejection:** In-app notification: "Your business changes were not approved" (includes reason)
- [ ] **On Partial Approval:** Notification lists which fields were approved/rejected
- [ ] Push notification sent (if enabled)

---

## Technical Requirements

### Component Structure

```
src/components/business/
├── PendingChangesWarning.tsx     # Yellow banner component
└── BusinessEditForm.tsx          # Modified to route sensitive vs instant
```

### PendingChangesWarning.tsx

```tsx
interface PendingChangesWarningProps {
    businessId: string;
    pendingEdits: PendingEdits | null;
    currentValues: Business;
    onDismiss: () => void;
}

// Displays:
// ⏳ Changes pending admin approval [X]
// • Business Name: "Old" → "New"
// • Address: "123 Main" → "456 Oak"
// Your business remains active with previous approved values.
```

---

## UI/UX Specifications

### Pending Changes Banner (Owner View Only)
```
┌─────────────────────────────────────────────────────────────────┐
│ ⏳ Changes pending admin approval                           [×] │
├─────────────────────────────────────────────────────────────────┤
│ The following changes are awaiting review:                      │
│                                                                 │
│ • Business Name: "Old Name" → "New Name"                        │
│ • Address: "123 Main St" → "456 Oak Ave"                        │
│                                                                 │
│ Your business remains active with the previous approved values. │
└─────────────────────────────────────────────────────────────────┘
```

---

## Definition of Done

- [ ] `PendingChangesWarning` component created
- [ ] Banner displayed only to owner when `has_pending_edits = true`
- [ ] `BusinessEditForm` routes edits to correct handler (pending vs instant)
- [ ] Overwrite logic works correctly
- [ ] Notifications received by owner on approval/rejection/partial

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/business/PendingChangesWarning.tsx` | CREATE |
| `src/components/business/BusinessEditForm.tsx` | MODIFY |
| `src/services/adminNotificationService.ts` | MODIFY (add edit approval/rejection) |

---

**Story Owner:** Full-Stack Engineering  
**Reviewer:** [TBD]
