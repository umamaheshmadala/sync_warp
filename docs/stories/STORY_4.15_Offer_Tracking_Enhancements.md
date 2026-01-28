# Story 4.15: Offer Tracking & Display Enhancements

**Epic**: EPIC 4 - Business Features  
**Priority**: High  
**Effort**: 4-5 days  
**Status**: 📝 Specified  
**Created**: January 29, 2026  
**Depends On**: Story 4.14 (Offer Status Management)

---

## Overview

Enhanced tracking and display features for offers including unique audit codes, short code display on cards, draft auto-save with expiry warnings, featured offer controls, and comprehensive audit logging.

---

## User Stories

---

### US-4.15.1: Unique Audit Code

**As a** business owner  
**I want** each offer to have a unique tracking code  
**So that** I can identify and track offers internally

#### Acceptance Criteria

| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Auto-generated** | Created automatically when offer is saved as draft |
| 2 | **Format** | `AUDIT-{PREFIX}-{YYYYMM}-{SEQ}` |
| 3 | **PREFIX** | First 3 chars of business slug (e.g., "TB1") |
| 4 | **YYYYMM** | Year and month (e.g., "202601") |
| 5 | **SEQ** | 4-digit zero-padded sequence (e.g., "0042") |
| 6 | **Example** | `AUDIT-TB1-202601-0042` |
| 7 | **Unique constraint** | Database enforces uniqueness |
| 8 | **Not editable** | Read-only in all forms |
| 9 | **Custom reference** | Separate optional field for business notes |
| 10 | **Sequence reset** | Resets to 0001 each month per business |
| 11 | **Shown in details** | Full code visible in offer edit/detail view |

#### Database Changes

| Column | Type | Constraints |
|--------|------|-------------|
| `audit_code` | `VARCHAR(50)` | UNIQUE, NOT NULL |
| `custom_reference` | `VARCHAR(100)` | DEFAULT NULL |

#### SQL Function

```sql
CREATE OR REPLACE FUNCTION generate_audit_code(p_business_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix VARCHAR(3);
  v_yyyymm VARCHAR(6);
  v_seq INTEGER;
  v_code VARCHAR(50);
BEGIN
  -- Get business prefix (first 3 chars of slug)
  SELECT UPPER(LEFT(COALESCE(slug, id::text), 3))
  INTO v_prefix FROM businesses WHERE id = p_business_id;
  
  -- Get current YYYYMM
  v_yyyymm := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Get next sequence for this business+month
  SELECT COALESCE(MAX(
    CAST(RIGHT(audit_code, 4) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM offers
  WHERE business_id = p_business_id
    AND audit_code LIKE 'AUDIT-' || v_prefix || '-' || v_yyyymm || '-%';
  
  -- Build code
  v_code := 'AUDIT-' || v_prefix || '-' || v_yyyymm || '-' || LPAD(v_seq::text, 4, '0');
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;
```

---

### US-4.15.2: Display Short Code on Card

**As a** user (business or customer)  
**I want to** see a short identifier on each offer card  
**So that** I can distinguish similar offers

#### Acceptance Criteria

| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Extract last 6** | From `AUDIT-TB1-202601-0042` → `01-0042` |
| 2 | **Format** | `XX-XXXX` (month digits + sequence) |
| 3 | **Location** | Right section of TicketOfferCard, below banner |
| 4 | **Business view** | Visible on dashboard offer cards |
| 5 | **Customer view** | Visible on storefront offer cards |
| 6 | **Styling** | Monospace font, 10px, text-gray-500 |
| 7 | **Not a redemption code** | No "use this code" messaging |
| 8 | **Tooltip** | Desktop hover shows "Offer ID: 01-0042" |

#### Component Changes

```tsx
// TicketOfferCard.tsx - Add prop and display
interface TicketOfferCardProps {
  // ... existing props
  auditCode?: string;  // Full audit code
}

// Extract and display last 6 characters
const shortCode = auditCode?.slice(-7); // "01-0042"
```

---

### US-4.15.3: Draft Management

**As a** business owner  
**I want to** save offers as drafts with auto-save  
**So that** I don't lose work

#### Acceptance Criteria

| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Auto-save: Timer** | Save automatically every 30 seconds when form has unsaved changes |
| 2 | **Auto-save: Blur** | Save automatically when user clicks outside any form field |
| 3 | **Last saved indicator** | Display "Last saved: X minutes ago" or "Last saved: Just now" |
| 4 | **Indicator position** | Near form header, subtle gray text (text-gray-500) |
| 5 | **Explicit Save button** | "Save as Draft" button visible at ALL form steps (not just final step) |
| 6 | **Save Draft location** | Button in form footer alongside "Publish" button |
| 7 | **Draft badge** | Yellow/amber "Draft" badge on offer cards in list |
| 8 | **Filter by drafts** | Status filter dropdown includes "Draft" option |
| 9 | **Auto-delete: 30 days** | Drafts with no updates for 30 days are automatically hard-deleted |
| 10 | **Warning: 25 days** | Show warning banner: "⚠️ This draft will be deleted in 5 days due to inactivity" |
| 11 | **Warning: 28 days** | Show warning banner: "⚠️ This draft will be deleted in 2 days due to inactivity" |
| 12 | **Warning: 29 days** | Show warning banner: "⚠️ This draft will be deleted tomorrow due to inactivity" |
| 13 | **Warning on card** | Show small warning icon on draft card when < 5 days until deletion |
| 14 | **Audit logging** | Log `draft_created`, `draft_updated` actions (via `log_offer_action`) |

#### Technical Implementation

- Track `updated_at` timestamp on every save for draft expiry calculation
- Scheduled job (Supabase Edge Function or pg_cron) runs daily to:
  - Hard-delete drafts where `status = 'draft' AND updated_at < NOW() - INTERVAL '30 days'`
  - Log `draft_auto_deleted` action before deletion
- Banner component checks `updated_at` against current date to show warnings

---

### US-4.15.4: Feature Offers

**As a** business owner  
**I want to** highlight top offers on my Overview tab  
**So that** customers see my best deals first

#### Acceptance Criteria

| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Maximum 3** | Cannot feature more than 3 offers |
| 2 | **Error on 4th** | "Maximum 3 featured offers. Unfeature one first." |
| 3 | **Toggle control** | Simple switch on offer card or edit view |
| 4 | **Priority control** | Drag-drop or numeric input (1, 2, 3) |
| 5 | **Featured badge** | Gold "★ Featured" badge on cards |
| 6 | **Overview display** | Featured offers shown at top of Overview tab |
| 7 | **Only active offers** | Can only feature offers with status = `active` |
| 8 | **Auto-unfeature: Pause** | Unfeatured when paused |
| 9 | **Auto-unfeature: Terminate** | Unfeatured when terminated |
| 10 | **Auto-unfeature: Archive** | Unfeatured when archived/expired |

#### Database Changes

| Column | Type | Default |
|--------|------|---------|
| `is_featured` | `BOOLEAN` | false |
| `featured_priority` | `INTEGER` | NULL |

---

### US-4.15.5: Audit Log

**As a** business owner  
**I want** a history of all offer actions  
**So that** I can track changes for compliance

#### Acceptance Criteria

| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Actions logged** | `created`, `edited`, `published`, `paused`, `resumed`, `terminated`, `archived`, `deleted`, `duplicated`, `featured`, `unfeatured` |
| 2 | **Data stored** | `offer_id`, `action`, `user_id`, `reason`, `metadata`, `created_at` |
| 3 | **Metadata (JSON)** | `{ "old_status": "active", "new_status": "paused" }` |
| 4 | **Access point** | "View History" button in offer edit view |
| 5 | **Display format** | Sliding drawer with chronological list |
| 6 | **Entry format** | "Jan 29, 2026 at 10:30 AM - Paused by John Doe" |
| 7 | **Reason display** | If exists: "Reason: Stock exhausted" below action |
| 8 | **Filter: Action** | Dropdown to filter by action type |
| 9 | **Filter: Date** | Date picker for from/to range |
| 10 | **Pagination** | Load 20 entries, "Load more" for older |
| 11 | **Read-only** | Cannot edit or delete log entries |

#### Database Schema

```sql
CREATE TABLE offer_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_offer ON offer_audit_log(offer_id, created_at DESC);
```

#### SQL Function

```sql
CREATE OR REPLACE FUNCTION log_offer_action(
  p_offer_id UUID,
  p_action VARCHAR(50),
  p_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO offer_audit_log (offer_id, action, user_id, reason, metadata)
  VALUES (p_offer_id, p_action, p_user_id, p_reason, p_metadata)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Tasks

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1 | Migration: Add `audit_code`, `custom_reference` columns | P0 | 0.25d |
| 2 | Migration: Add `is_featured`, `featured_priority` columns | P0 | 0.25d |
| 3 | Migration: Create `offer_audit_log` table | P0 | 0.25d |
| 4 | Function: `generate_audit_code(business_id)` | P0 | 0.5d |
| 5 | Function: `log_offer_action(...)` | P0 | 0.25d |
| 6 | Trigger: Auto-generate audit code on INSERT | P0 | 0.25d |
| 7 | Backfill: Generate audit codes for existing offers | P1 | 0.25d |
| 8 | Scheduled job: Auto-delete stale drafts | P1 | 0.5d |
| 9 | Hook: `useOfferAuditLog(offerId)` | P1 | 0.25d |
| 10 | Hook: `toggleFeatured(id, priority?)` | P1 | 0.25d |
| 11 | UI: Short code display in `TicketOfferCard` | P0 | 0.25d |
| 12 | UI: Auto-save in `CreateOfferForm` | P1 | 0.5d |
| 13 | UI: "Last saved" indicator | P1 | 0.25d |
| 14 | UI: Draft expiry warning banners | P1 | 0.25d |
| 15 | UI: Featured toggle and priority controls | P1 | 0.5d |
| 16 | UI: `OfferAuditLogPanel` drawer | P1 | 0.5d |

**Total: 4-5 days**

---

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Create new draft | Audit code auto-generated |
| 2 | View offer card | Last 6 digits visible below banner |
| 3 | Edit offer | Full audit code shown in details |
| 4 | Auto-save fires | "Last saved: Just now" appears |
| 5 | Leave draft 25 days | Warning banner appears |
| 6 | Leave draft 30 days | Draft auto-deleted |
| 7 | Feature active offer | ★ Featured badge shown |
| 8 | Feature 4th offer | Error message displayed |
| 9 | Pause featured offer | Automatically unfeatured |
| 10 | View audit log | All actions shown chronologically |
| 11 | Filter audit log | Filters work correctly |
| 12 | Duplicate offer | New audit code generated |

---

## Dependencies

- ✅ Story 4.14: Offer Status Management (columns and workflows)
- ✅ Story 4.12B: Offer Categorization
- ✅ `TicketOfferCard` component

---

## Out of Scope (Phase II)

- Product linking (many-to-many)
- Customer notifications
- Bulk operations
- Offer analytics dashboard
