# Story 6.3.6: Business Edit Approval Workflow (Pending Changes)

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 5-6 days  
**Dependencies:** Story 6.3.3 (Approval/Rejection), Story 6.3.4 (Edit/Delete)  
**Status:** ⚪ PLANNED

---

## Overview

Implement a moderated edit workflow for sensitive business fields. When a business owner edits certain fields (business name, address, categories), the changes are stored as "pending" and require admin approval before becoming visible to the public. The business remains active during this period with the original approved values displayed.

---

## Problem Statement

### Current State
- All owner edits are applied immediately and visible to the public
- No review mechanism for potentially fraudulent or misleading changes
- Owners could change business name/address to unrelated content after approval
- No visibility for admins on what changes are being made post-approval

### Desired State
- Sensitive field edits require admin re-approval
- Business remains active with original approved values during review
- Owners see a "Changes pending approval" indicator
- Admins see a diff comparison of old vs new values
- Non-sensitive fields (phone, email, hours, etc.) update immediately
- Admins can partially approve/reject individual changes

---

## Field Classification

### 🔒 Fields Requiring Re-Approval (Sensitive)
| Field | Reason |
|-------|--------|
| `business_name` | Identity verification - prevents bait-and-switch |
| `address` / `city` / `state` / `postal_code` | Location verification - prevents false locations |
| `categories` | Category accuracy - prevents gaming search results |

### ✅ Fields NOT Requiring Re-Approval (Instant Update)
| Field | Reason |
|-------|--------|
| `business_phone` | Contact info - owner's discretion |
| `business_email` | Contact info - owner's discretion |
| `operating_hours` | Operational data - changes frequently |
| `description` | Marketing content - owner's discretion |
| `logo_url` / `cover_image_url` | Visual identity - low fraud risk |
| `website_url` | Contact info - owner's discretion |
| `social_media` | Contact info - owner's discretion |
| Products (separate table) | Managed separately |
| Offers (separate table) | Managed separately |

---

## User Stories

### US-6.3.6.1: Owner Edits Sensitive Field → Pending State
**As a** business owner  
**I want my** sensitive field edits to be submitted for review  
**So that** my business maintains its approved status while changes are reviewed

**Acceptance Criteria:**
- [ ] When owner edits `business_name`, `address`, `city`, `state`, `postal_code`, or `categories`:
  - Changes are stored in new `business_pending_edits` table
  - `businesses.has_pending_edits` flag set to `true`
  - Business status remains `active` (NOT changed to `pending`)
  - Original approved values remain visible to public
- [ ] Owner sees success message: "Your changes have been submitted for review"
- [ ] If owner already has pending edits, new changes **overwrite** old pending edits
- [ ] Only the final/latest changes await admin approval

---

### US-6.3.6.2: Owner Sees Pending Changes Indicator
**As a** business owner  
**I want to** see when my business has pending changes  
**So that** I know to expect an admin review

**Acceptance Criteria:**
- [ ] On business storefront (owner view only):
  - Yellow banner: "⏳ Changes pending admin approval"
  - Banner shows: "The following changes are awaiting review:"
  - Lists pending field changes (e.g., "Name: 'Old Name' → 'New Name'")
- [ ] In business dashboard/list:
  - Yellow badge: "Pending Changes" next to business name
- [ ] Banner/badge NOT visible to regular users (public view)
- [ ] Owner can dismiss banner temporarily but it returns on page reload

---

### US-6.3.6.3: Owner Can Overwrite Pending Changes
**As a** business owner  
**I want to** update my pending changes before admin reviews  
**So that** only my final intended changes are approved

**Acceptance Criteria:**
- [ ] If pending edits exist, owner editing same fields:
  - Old pending values replaced with new values
  - `pending_edits.updated_at` timestamp updated
- [ ] If editing different field (still sensitive):
  - Field added to existing pending edits record
- [ ] Owner sees message: "Your previous pending changes have been updated"
- [ ] Admin only sees/reviews the latest version of pending changes

---

### US-6.3.6.4: Admin Sees Pending Edits Queue
**As an** admin  
**I want to** see all businesses with pending edit requests  
**So that** I can review and approve/reject changes

**Acceptance Criteria:**
- [ ] New tab in Business Management: "Pending Edits" (with count badge)
- [ ] Table columns: Business Name | Owner | Submitted At | Fields Changed | Actions
- [ ] "Fields Changed" shows count: "3 fields" with hover tooltip listing them
- [ ] Clicking row opens **Pending Edits Review Modal**
- [ ] Tab count updates when pending edits are approved/rejected
- [ ] Sorted by `pending_edits.created_at` (oldest first for fairness)

---

### US-6.3.6.5: Admin Reviews Pending Edits (Diff View)
**As an** admin  
**I want to** see a side-by-side comparison of old vs new values  
**So that** I can make informed approval decisions

**Acceptance Criteria:**
- [ ] **Pending Edits Review Modal** shows:
  - Business name (current approved)
  - Owner name and contact
  - Submitted at timestamp
  - **Diff Table:**
    | Field | Current (Approved) | Requested (Pending) | Action |
    |-------|-------------------|---------------------|--------|
    | Business Name | "Pizza Palace" | "Best Pizza Palace" | ✓ ✗ |
    | Address | "123 Main St" | "456 Oak Ave" | ✓ ✗ |
    | Categories | Food, Restaurant | Fast Food, Pizza | ✓ ✗ |
  - Each row has individual ✓ Approve / ✗ Reject buttons
- [ ] Visual highlighting:
  - Added text: Green highlight
  - Removed text: Red strikethrough
  - Changed text: Yellow background with old→new arrow
- [ ] Footer buttons: "Approve All" | "Reject All" | "Save Partial" | "Cancel"

---

### US-6.3.6.6: Admin Approves All Pending Changes
**As an** admin  
**I want to** approve all pending changes at once  
**So that** I can quickly process straightforward edit requests

**Acceptance Criteria:**
- [ ] "Approve All" button in modal footer
- [ ] Confirmation dialog: "Approve all 3 pending changes for **{Business Name}**?"
- [ ] On confirm:
  - All pending values copied to `businesses` table
  - `business_pending_edits` record deleted
  - `businesses.has_pending_edits` set to `false`
  - Audit log entry created: action = 'edit_approved'
  - Owner receives notification: "Your business changes have been approved! 🎉"
- [ ] Success toast: "All changes approved"
- [ ] Refresh pending edits list (count decrements)

---

### US-6.3.6.7: Admin Rejects All Pending Changes
**As an** admin  
**I want to** reject all pending changes with a reason  
**So that** I can decline inappropriate edit requests

**Acceptance Criteria:**
- [ ] "Reject All" button in modal footer
- [ ] Rejection dialog opens:
  - Reason field (required) with preset options:
    - "Changes appear fraudulent or misleading"
    - "Address does not match business location"
    - "Business name violates naming guidelines"
    - "Categories do not match business type"
    - "Other (specify below)"
  - Custom text area (500 char limit)
- [ ] On confirm:
  - `business_pending_edits` record deleted
  - `businesses.has_pending_edits` set to `false`
  - Audit log entry: action = 'edit_rejected', reason = provided reason
  - Owner receives notification: "Your business changes were not approved. Reason: {reason}"
- [ ] Original approved values remain unchanged

---

### US-6.3.6.8: Admin Partially Approves/Rejects Changes
**As an** admin  
**I want to** approve some changes and reject others  
**So that** I can handle mixed edit requests fairly

**Acceptance Criteria:**
- [ ] Each field row has individual ✓ / ✗ buttons
- [ ] Clicking ✓ marks field as "approved" (green checkmark)
- [ ] Clicking ✗ marks field as "rejected" (red X)
- [ ] "Save Partial" button enabled when at least one decision made on each field
- [ ] On "Save Partial":
  - Approved fields: Values copied to `businesses` table
  - Rejected fields: Logged with reason (modal prompts for reason for rejected fields)
  - `business_pending_edits` record deleted
  - `businesses.has_pending_edits` set to `false`
  - Audit log: action = 'edit_partial_approved', changes_json includes approved/rejected breakdown
  - Owner notification: "Some of your business changes were approved:\n✅ Business Name\n❌ Address (Reason: ...)"

---

### US-6.3.6.9: Instant Fields Update Immediately
**As a** business owner  
**I want** non-sensitive field edits to apply immediately  
**So that** I can update contact info and hours without delay

**Acceptance Criteria:**
- [ ] Edits to these fields apply instantly (no pending state):
  - `business_phone`
  - `business_email`
  - `operating_hours`
  - `description`
  - `logo_url`
  - `cover_image_url`
  - `website_url`
  - `social_media`
- [ ] Changes visible to public immediately after save
- [ ] No notification to admin (audit log still captures for history)
- [ ] Owner sees success message: "Changes saved successfully"

---

### US-6.3.6.10: Public View Shows Only Approved Values
**As a** user browsing the platform  
**I want to** see only verified/approved business information  
**So that** I can trust the listings are accurate

**Acceptance Criteria:**
- [ ] Public storefront always shows values from `businesses` table (approved)
- [ ] Pending edit values are NEVER displayed to non-owner users
- [ ] No "pending" indicator visible to public
- [ ] Search results use approved values only
- [ ] Business cards show approved name/address/categories only

---

### US-6.3.6.11: Notify Owner on Edit Decision
**As a** business owner  
**I want to** be notified when my edit request is decided  
**So that** I know if my changes are live or need adjustment

**Acceptance Criteria:**
- [ ] **On Approval:**
  - In-app notification: "Your business changes have been approved! 🎉"
  - Push notification (if enabled): Same message
  - Action URL: `/business/{business_id}/storefront`
- [ ] **On Rejection:**
  - In-app notification: "Your business changes were not approved"
  - Notification body includes rejection reason
  - Push notification (if enabled): Summary message
  - Action URL: `/business/{business_id}/edit`
- [ ] **On Partial Approval:**
  - In-app notification: "Your business changes have been partially approved"
  - Body lists which fields were approved/rejected
  - Push notification: Summary message

---

## Technical Requirements

### Database Schema

**New Table:** `business_pending_edits`

```sql
CREATE TABLE business_pending_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Pending field values (NULL if not changed)
    pending_business_name TEXT,
    pending_address TEXT,
    pending_city TEXT,
    pending_state TEXT,
    pending_postal_code TEXT,
    pending_categories TEXT[], -- Array of categories
    
    -- Metadata
    submitted_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one pending edit per business
    CONSTRAINT unique_business_pending_edit UNIQUE (business_id)
);

-- Indexes
CREATE INDEX idx_pending_edits_business ON business_pending_edits(business_id);
CREATE INDEX idx_pending_edits_created ON business_pending_edits(created_at);
```

**Modified Table:** `businesses`

```sql
ALTER TABLE businesses 
ADD COLUMN has_pending_edits BOOLEAN DEFAULT FALSE;

-- Index for admin pending edits query
CREATE INDEX idx_businesses_pending_edits ON businesses(has_pending_edits) WHERE has_pending_edits = TRUE;
```

### RLS Policies

```sql
-- Owners can insert/update their own pending edits
CREATE POLICY "Owners can manage own pending edits"
ON business_pending_edits
FOR ALL
TO authenticated
USING (
    submitted_by = auth.uid() OR
    EXISTS (SELECT 1 FROM businesses WHERE id = business_pending_edits.business_id AND user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_pending_edits.business_id AND user_id = auth.uid())
);

-- Admins can read/delete all pending edits
CREATE POLICY "Admins can manage all pending edits"
ON business_pending_edits
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

### Service Layer

**File:** `src/services/businessEditService.ts`

```typescript
// Constants defining which fields require approval
export const SENSITIVE_FIELDS = [
    'business_name',
    'address',
    'city',
    'state',
    'postal_code',
    'categories'
] as const;

export const INSTANT_UPDATE_FIELDS = [
    'business_phone',
    'business_email',
    'operating_hours',
    'description',
    'logo_url',
    'cover_image_url',
    'website_url',
    'social_media'
] as const;

// Submit sensitive field edits for approval
export async function submitPendingEdits(
    businessId: string,
    changes: Partial<Pick<Business, typeof SENSITIVE_FIELDS[number]>>
): Promise<void> {
    // Upsert pending edits (overwrites previous pending)
    const { error } = await supabase
        .from('business_pending_edits')
        .upsert({
            business_id: businessId,
            pending_business_name: changes.business_name,
            pending_address: changes.address,
            pending_city: changes.city,
            pending_state: changes.state,
            pending_postal_code: changes.postal_code,
            pending_categories: changes.categories,
            submitted_by: (await supabase.auth.getUser()).data.user?.id,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'business_id'
        });
    
    if (error) throw error;
    
    // Set flag on business
    await supabase
        .from('businesses')
        .update({ has_pending_edits: true })
        .eq('id', businessId);
}

// Apply instant updates (non-sensitive fields)
export async function applyInstantUpdates(
    businessId: string,
    changes: Partial<Pick<Business, typeof INSTANT_UPDATE_FIELDS[number]>>
): Promise<void> {
    const { error } = await supabase
        .from('businesses')
        .update(changes)
        .eq('id', businessId);
    
    if (error) throw error;
}
```

**File:** `src/services/adminPendingEditsService.ts`

```typescript
// Get all businesses with pending edits
export async function getPendingEditsList(params: PaginationParams) {
    const { data, error, count } = await supabase
        .from('business_pending_edits')
        .select(`
            *,
            business:businesses!inner(
                id,
                business_name,
                address,
                city,
                state,
                postal_code,
                categories,
                user_id
            ),
            submitter:profiles!submitted_by(
                full_name,
                email
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: true })
        .range(params.from, params.to);
    
    if (error) throw error;
    return { data, totalCount: count };
}

// Approve all pending edits
export async function approveAllPendingEdits(businessId: string): Promise<void> {
    // Get pending edits
    const { data: pending } = await supabase
        .from('business_pending_edits')
        .select('*')
        .eq('business_id', businessId)
        .single();
    
    if (!pending) throw new Error('No pending edits found');
    
    // Build update object (only non-null pending values)
    const updates: any = { has_pending_edits: false };
    if (pending.pending_business_name) updates.business_name = pending.pending_business_name;
    if (pending.pending_address) updates.address = pending.pending_address;
    if (pending.pending_city) updates.city = pending.pending_city;
    if (pending.pending_state) updates.state = pending.pending_state;
    if (pending.pending_postal_code) updates.postal_code = pending.pending_postal_code;
    if (pending.pending_categories) updates.categories = pending.pending_categories;
    
    // Apply updates to business
    await supabase.from('businesses').update(updates).eq('id', businessId);
    
    // Delete pending edits record
    await supabase.from('business_pending_edits').delete().eq('business_id', businessId);
    
    // Log action
    await logAdminAction(businessId, 'edit_approved', null, updates);
    
    // Notify owner
    await sendEditApprovalNotification(businessId);
}

// Reject all pending edits
export async function rejectAllPendingEdits(
    businessId: string, 
    reason: string
): Promise<void> {
    // Delete pending edits
    await supabase.from('business_pending_edits').delete().eq('business_id', businessId);
    
    // Clear flag
    await supabase.from('businesses').update({ has_pending_edits: false }).eq('id', businessId);
    
    // Log action
    await logAdminAction(businessId, 'edit_rejected', reason, {});
    
    // Notify owner
    await sendEditRejectionNotification(businessId, reason);
}
```

### Component Structure

```
src/components/admin/business-management/
├── PendingEditsTab.tsx              # New tab showing pending edit queue
├── PendingEditsTable.tsx            # Table of businesses with pending edits
├── PendingEditsReviewModal.tsx      # Side-by-side diff review modal
├── FieldDiffRow.tsx                 # Single field comparison row
├── ApproveEditsDialog.tsx           # Confirm all approval
├── RejectEditsDialog.tsx            # Rejection with reason
└── PartialApprovalHandler.tsx       # Partial approve/reject logic

src/components/business/
├── PendingChangesWarning.tsx        # Owner-visible banner on storefront
└── BusinessEditForm.tsx             # Modified to handle pending vs instant
```

---

## UI/UX Specifications

### Owner View: Pending Changes Banner
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

### Admin View: Pending Edits Review Modal
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
│ City            │ Mumbai                │ —              │ — — │
│ Categories      │ Restaurant, Food      │ Fast Food, Pizza│ ✓ ✗│
├─────────────────────────────────────────────────────────────────┤
│     [Reject All]        [Approve All]        [Save Partial]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Plan

### Manual Testing Checklist

#### Test Route 1: Owner Submits Sensitive Edit
1. Login as business owner (testuser3@gmail.com)
2. Navigate to owned business storefront
3. Click "Edit Profile"
4. Change business name
5. Save changes
6. Verify: Toast shows "Changes submitted for review"
7. Verify: Pending changes banner appears
8. Verify: Public view still shows old name

#### Test Route 2: Admin Approves All Changes
1. Login as admin (testuser1@gmail.com)
2. Navigate to `/admin/businesses`
3. Click "Pending Edits" tab
4. Click on business row
5. Review diff in modal
6. Click "Approve All"
7. Confirm in dialog
8. Verify: Success toast
9. Login as owner → Verify notification received
10. Check public storefront → New name visible

#### Test Route 3: Admin Rejects Changes
1. Admin opens pending edit review modal
2. Click "Reject All"
3. Select reason from dropdown
4. Add custom details
5. Confirm rejection
6. Verify: Owner receives rejection notification with reason
7. Verify: Business still has original values

#### Test Route 4: Partial Approval
1. Admin opens pending edit review modal
2. Click ✓ on "Business Name" row
3. Click ✗ on "Address" row
4. Click "Save Partial"
5. Enter reason for rejected field
6. Confirm
7. Verify: Name updated, address unchanged
8. Verify: Owner notification shows partial results

#### Test Route 5: Owner Overwrites Pending Edits
1. Owner submits edit (name change)
2. Before admin reviews, owner edits again
3. Change name to something different
4. Save
5. Verify: Old pending discarded, new pending saved
6. Admin sees only latest pending values

---

## Definition of Done

- [ ] Sensitive fields (name, address, categories) require admin approval
- [ ] Non-sensitive fields update immediately
- [ ] Owner sees pending changes banner on their storefront
- [ ] Admin has "Pending Edits" tab with queue
- [ ] Admin can view side-by-side diff comparison
- [ ] Admin can approve all, reject all, or partial approve
- [ ] Rejection requires reason
- [ ] Owner receives notification on approval/rejection
- [ ] Public always sees approved values only
- [ ] Pending edits can be overwritten by owner
- [ ] Audit log captures all edit approval/rejection actions
- [ ] All browser tests pass with evidence

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/YYYYMMDD_pending_edits.sql` | CREATE | New table + RLS |
| `src/services/businessEditService.ts` | CREATE | Pending edit submission |
| `src/services/adminPendingEditsService.ts` | CREATE | Admin review service |
| `src/components/admin/.../PendingEditsTab.tsx` | CREATE | Admin tab component |
| `src/components/admin/.../PendingEditsReviewModal.tsx` | CREATE | Diff review modal |
| `src/components/business/PendingChangesWarning.tsx` | CREATE | Owner banner |
| `src/components/business/BusinessEditForm.tsx` | MODIFY | Handle field classification |
| `src/pages/admin/BusinessManagementPage.tsx` | MODIFY | Add pending edits tab |

---

## Dependencies

- **Requires:** Story 6.3.3 (Approval/Rejection patterns), Story 6.3.4 (Edit infrastructure)
- **Blocks:** None
- **Related:** Story 6.3.5 (Audit Logging)

---

**Story Owner:** Full-Stack Engineering  
**Reviewer:** [TBD]
