# Story 6.3.3a: Admin Business Management - Detail Modal

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 1 day  
**Dependencies:** Story 6.3.1 (Database), Story 6.3.2 (Listing UI)  
**Status:** 🟢 COMPLETED

---

## Overview

Implement the business detail modal with three tabs (Details, Audit History, Owner Info) and contextual action buttons in the table. This provides admins with comprehensive information to make informed decisions before approving or rejecting.

> **Note:** Make sure to utilize existing code. Some features may be fully or partially implemented. Reuse available modules and patterns.

---

## User Stories

### US-6.3.3a.1: Business Detail Modal
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
  - **Claim Status** (✅ Claimed | ⚠️ Unclaimed | 🔄 Pending) - display only
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
  - Link: "View Owner's Other Businesses" (filters table by owner)
- [ ] Close button (X) in top right
- [ ] Modal is scrollable for long content

---

### US-6.3.3a.2: Action Buttons in Table Row
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
  - Pending: Show View, Approve, Reject, Edit, Delete
  - Active: Show View, Edit, Delete, Reject
  - Rejected: Show View, Approve, Delete
  - Deleted: Show View, Restore (Story 6.3.4)

---

## Technical Requirements

### Service Layer

**File:** `src/services/adminBusinessService.ts` (additions)

```typescript
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

// Get owner's other businesses count
export async function getOwnerBusinessCount(ownerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerId);
  
  if (error) throw error;
  return count ?? 0;
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
└── BusinessActionButtons.tsx      # Row action icons
```

---

## UI/UX Specifications

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
│ Status: ● Pending (since 2026-01-15)                    │
│ Claim Status: ✅ Claimed by John Doe on 2026-01-10      │
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
│      [Approve]              [Reject]                    │
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

#### Test Route 2: Action Button Visibility
1. In "Pending" tab → Verify Approve/Reject visible
2. In "Active" tab → Verify Approve hidden, Reject visible
3. In "Rejected" tab → Verify Reject hidden, Approve visible

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/business-management/BusinessDetailModal.tsx` | CREATE | Main detail modal |
| `src/components/admin/business-management/BusinessDetailsTab.tsx` | CREATE | Details tab content |
| `src/components/admin/business-management/BusinessAuditHistoryTab.tsx` | CREATE | Audit tab content |
| `src/components/admin/business-management/BusinessOwnerInfoTab.tsx` | CREATE | Owner tab content |
| `src/components/admin/business-management/BusinessActionButtons.tsx` | CREATE | Row action icons |
| `src/services/adminBusinessService.ts` | MODIFY | Add detail/audit functions |
| `src/hooks/useBusinessDetails.ts` | CREATE | React Query hook |

---

## Definition of Done

- [ ] Business detail modal shows all information in 3 tabs
- [ ] Action buttons show/hide correctly based on status
- [ ] Owner's other businesses count displayed
- [ ] "View Owner's Other Businesses" link filters table
- [ ] Modal is scrollable and responsive
- [ ] All browser tests pass with evidence

---

## Dependencies

- **Requires:** Story 6.3.1 (Database), Story 6.3.2 (Listing UI)
- **Blocks:** Story 6.3.3b (Approve/Reject Actions)
- **Related:** Story 6.3.4 (Edit/Delete), Story 6.3.5 (Audit Log)

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
