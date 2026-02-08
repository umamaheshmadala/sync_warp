# Story 6.3.6: Pending Edits Infrastructure

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 1.5 days  
**Dependencies:** Story 6.3.3 (Approval/Rejection), Story 6.3.4 (Edit/Delete)  
**Status:** 🟢 COMPLETE  
**Blocks:** Story 6.3.7, Story 6.3.8

---

## Overview

Implement the foundational database schema, field classification logic, and service layer for the moderated edit workflow. This story establishes the `business_pending_edits` table, RLS policies, and the core logic to differentiate sensitive vs. instant-update fields.

---

## User Stories

### US-6.3.6.1: Field Classification System
**As a** system  
**I want to** classify business fields as "sensitive" or "instant-update"  
**So that** edits are routed to the appropriate workflow

**Acceptance Criteria:**
- [ ] `SENSITIVE_FIELDS` constant defined: `business_name`, `address`, `city`, `state`, `postal_code`, `categories`
- [ ] `INSTANT_UPDATE_FIELDS` constant defined: `business_phone`, `business_email`, `operating_hours`, `description`, `logo_url`, `cover_image_url`, `website_url`, `social_media`
- [ ] Service function `isSensitiveField(fieldName: string): boolean` implemented

---

### US-6.3.6.2: Pending Edits Database Schema
**As a** developer  
**I want** a `business_pending_edits` table  
**So that** pending changes can be stored and reviewed

**Acceptance Criteria:**
- [ ] Table created with columns:
  - `id` (UUID, PK)
  - `business_id` (UUID, FK to businesses, UNIQUE)
  - `pending_business_name`, `pending_address`, `pending_city`, `pending_state`, `pending_postal_code` (TEXT, nullable)
  - `pending_categories` (TEXT[], nullable)
  - `submitted_by` (UUID, FK to profiles)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- [ ] `businesses.has_pending_edits` column added (BOOLEAN, default false)
- [ ] Indexes created: `business_id`, `created_at`
- [ ] Unique constraint ensures one pending edit per business

---

### US-6.3.6.3: RLS Policies for Pending Edits
**As a** developer  
**I want** secure RLS policies  
**So that** only owners and admins can access pending edits

**Acceptance Criteria:**
- [ ] Policy: Owners can INSERT/UPDATE/SELECT their own pending edits
- [ ] Policy: Admins can SELECT/DELETE all pending edits
- [ ] Policy: Public users cannot access `business_pending_edits`

---

### US-6.3.6.4: Submit Pending Edits Service
**As a** business owner  
**I want** sensitive field edits to be stored as pending  
**So that** I can submit changes for admin review

**Acceptance Criteria:**
- [ ] `submitPendingEdits(businessId, changes)` function implemented
- [ ] Uses UPSERT on `business_id` (overwrites previous pending edits)
- [ ] Sets `businesses.has_pending_edits = true`
- [ ] Returns success or throws error

---

### US-6.3.6.5: Instant Update Service
**As a** business owner  
**I want** non-sensitive field edits to apply immediately  
**So that** I can update contact info without delay

**Acceptance Criteria:**
- [ ] `applyInstantUpdates(businessId, changes)` function implemented
- [ ] Updates `businesses` table directly
- [ ] Does NOT touch `has_pending_edits` flag
- [ ] Returns success or throws error

---

## Technical Requirements

### Database Migration

```sql
-- File: supabase/migrations/YYYYMMDD_pending_edits_infrastructure.sql

CREATE TABLE business_pending_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    pending_business_name TEXT,
    pending_address TEXT,
    pending_city TEXT,
    pending_state TEXT,
    pending_postal_code TEXT,
    pending_categories TEXT[],
    submitted_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_business_pending_edit UNIQUE (business_id)
);

CREATE INDEX idx_pending_edits_business ON business_pending_edits(business_id);
CREATE INDEX idx_pending_edits_created ON business_pending_edits(created_at);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS has_pending_edits BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_businesses_pending_edits ON businesses(has_pending_edits) WHERE has_pending_edits = TRUE;

-- RLS
ALTER TABLE business_pending_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own pending edits" ON business_pending_edits
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_pending_edits.business_id AND user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_pending_edits.business_id AND user_id = auth.uid())
);

CREATE POLICY "Admins can manage all pending edits" ON business_pending_edits
FOR ALL TO authenticated
USING (public.is_admin());
```

### Service Layer

**File:** `src/services/businessEditService.ts`

```typescript
export const SENSITIVE_FIELDS = ['business_name', 'address', 'city', 'state', 'postal_code', 'categories'] as const;
export const INSTANT_UPDATE_FIELDS = ['business_phone', 'business_email', 'operating_hours', 'description', 'logo_url', 'cover_image_url', 'website_url', 'social_media'] as const;

export function isSensitiveField(field: string): boolean {
    return SENSITIVE_FIELDS.includes(field as any);
}

export async function submitPendingEdits(businessId: string, changes: Record<string, any>): Promise<void> { ... }
export async function applyInstantUpdates(businessId: string, changes: Record<string, any>): Promise<void> { ... }
```

---

## Definition of Done

- [ ] `business_pending_edits` table created with all columns
- [ ] RLS policies active and tested
- [ ] `has_pending_edits` flag added to `businesses`
- [ ] `businessEditService.ts` created with field classification and submit/instant functions
- [ ] Unit test for `isSensitiveField` passes

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_pending_edits_infrastructure.sql` | CREATE |
| `src/services/businessEditService.ts` | CREATE |

---

**Story Owner:** Full-Stack Engineering  
**Reviewer:** [TBD]
