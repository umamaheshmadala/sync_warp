# Story 6.3.1: Admin Business Management - Database Schema & Infrastructure

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** None  
**Status:** Completed

---

## Overview

Establish the database foundation for admin business management. This includes creating audit tables, extending the businesses table with admin-required columns, creating database functions for admin operations, and setting up RLS policies for admin-only access.

---

## Problem Statement

### Current State
- The `businesses` table exists with basic fields (status, city, business_type, created_at)
- No audit trail for admin actions on businesses
- No rejection tracking (reason, timestamp, who rejected)
- No soft-delete mechanism for businesses
- No RLS policies for admin-only operations

### Desired State
- Complete audit trail for all admin actions on businesses
- Status history tracking for business lifecycle
- Soft-delete with recovery capability
- Admin-only RLS policies for sensitive operations

---

## User Stories

### US-6.3.1.1: Admin Business Actions Audit Table
**As a** platform administrator  
**I want to** have all admin actions on businesses logged in an audit table  
**So that** I can track who did what, when, and why

**Acceptance Criteria:**
- [ ] New table `admin_business_actions` created with schema:
  - `id` (UUID, PK)
  - `business_id` (UUID, FK to businesses)
  - `admin_id` (UUID, FK to auth.users)
  - `action` (VARCHAR: 'approve', 'reject', 'edit', 'soft_delete', 'hard_delete', 'restore')
  - `reason` (TEXT, nullable - required for reject/delete)
  - `changes_json` (JSONB, nullable - stores before/after for edits)
  - `created_at` (TIMESTAMPTZ)
- [ ] RLS policy: Only users with `is_admin = true` in profiles can SELECT
- [ ] RLS policy: Only users with `is_admin = true` in profiles can INSERT
- [ ] Index on `business_id` for fast lookup
- [ ] Index on `admin_id` for admin activity reports
- [ ] Index on `created_at` for time-based queries

---

### US-6.3.1.2: Business Status History Table
**As a** platform administrator  
**I want to** track all status changes for each business  
**So that** I can see the complete lifecycle history

**Acceptance Criteria:**
- [ ] New table `business_status_history` created with schema:
  - `id` (UUID, PK)
  - `business_id` (UUID, FK to businesses)
  - `previous_status` (VARCHAR, nullable - null for initial creation)
  - `new_status` (VARCHAR)
  - `changed_by` (UUID, FK to auth.users - could be owner or admin)
  - `change_reason` (TEXT, nullable)
  - `created_at` (TIMESTAMPTZ)
- [ ] Database trigger: Automatically insert row on businesses.status change
- [ ] Index on `business_id` for fast lookup
- [ ] RLS policy: Business owners can read their own business history
- [ ] RLS policy: Admins can read all history

---

### US-6.3.1.3: Extend Businesses Table for Admin Fields
**As a** system  
**I want to** have additional columns in the businesses table for admin operations  
**So that** rejection reasons, approval info, and deletion status are stored

**Acceptance Criteria:**
- [ ] New columns added to `businesses` table:
  - `rejection_reason` (TEXT, nullable)
  - `rejected_at` (TIMESTAMPTZ, nullable)
  - `rejected_by` (UUID, FK to auth.users, nullable)
  - `approved_at` (TIMESTAMPTZ, nullable)
  - `approved_by` (UUID, FK to auth.users, nullable)
  - `deleted_at` (TIMESTAMPTZ, nullable - soft delete marker)
  - `deleted_by` (UUID, FK to auth.users, nullable)
  - `is_hard_deleted` (BOOLEAN, default false)
  - `last_admin_action_at` (TIMESTAMPTZ, nullable)
- [ ] Default values set correctly for all new columns
- [ ] Indexes created:
  - `idx_businesses_deleted_at` on `deleted_at`
  - `idx_businesses_approved_at` on `approved_at`
  - `idx_businesses_last_admin_action` on `last_admin_action_at`

---

### US-6.3.1.4: Admin RLS Policies for Businesses
**As a** security requirement  
**I want to** restrict admin operations to users with admin role  
**So that** only authorized personnel can approve/reject/delete businesses

**Acceptance Criteria:**
- [ ] Verify `profiles.is_admin` column exists (create if not)
- [ ] New RLS policy: `admin_can_view_all_businesses`
  - Admins can SELECT all businesses regardless of status
  - Regular users still only see active businesses
- [ ] New RLS policy: `admin_can_update_all_businesses`
  - Admins can UPDATE any business (for status changes, edits)
  - Business owners can still update their own
- [ ] New RLS policy: `admin_can_soft_delete_businesses`
  - Admins can set `deleted_at` on any business
- [ ] Existing policies remain functional for business owners

---

### US-6.3.1.5: Database Functions for Admin Operations
**As a** system  
**I want to** have reusable database functions for common admin operations  
**So that** business logic is consistent across all entry points

**Acceptance Criteria:**
- [ ] Function `admin_approve_business(business_id UUID, admin_id UUID)`:
  - Sets status to 'active'
  - Sets approved_at = NOW()
  - Sets approved_by = admin_id
  - Clears any previous rejection_reason
  - Returns the updated business row
- [ ] Function `admin_reject_business(business_id UUID, admin_id UUID, reason TEXT)`:
  - Sets status to 'rejected' (add to CHECK constraint if not exists)
  - Sets rejection_reason = reason
  - Sets rejected_at = NOW()
  - Sets rejected_by = admin_id
  - Returns the updated business row
- [ ] Function `admin_soft_delete_business(business_id UUID, admin_id UUID, reason TEXT)`:
  - Sets deleted_at = NOW()
  - Sets deleted_by = admin_id
  - Sets status to 'deleted' (add to CHECK constraint if not exists)
  - Returns the updated business row
- [ ] Function `admin_hard_delete_business(business_id UUID, admin_id UUID)`:
  - Actually DELETEs the row from businesses
  - Only allowed if is_hard_deleted = true (set by prior action)
  - Cascades to related tables via FK constraints
  - Returns success/failure
- [ ] Function `admin_restore_business(business_id UUID, admin_id UUID)`:
  - Clears deleted_at
  - Sets status to 'pending' (for re-review)
  - Returns the updated business row

---

### US-6.3.1.6: Update Status CHECK Constraint
**As a** system  
**I want to** add 'rejected' and 'deleted' to the status CHECK constraint  
**So that** these new statuses are valid values

**Acceptance Criteria:**
- [ ] ALTER businesses table CHECK constraint to include:
  - 'pending', 'active', 'suspended', 'inactive', 'rejected', 'deleted'
- [ ] Verify constraint allows all expected values
- [ ] Existing data not affected

---

## Technical Requirements

### Migration Script

**File:** `supabase/migrations/YYYYMMDD_admin_business_infrastructure.sql`

```sql
-- ============================================
-- Admin Business Management Infrastructure
-- Story 6.3.1 - Database Schema & Infrastructure
-- ============================================

-- 1. Extend businesses table with admin fields
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_hard_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_admin_action_at TIMESTAMPTZ;

-- 2. Update status CHECK constraint (drop old, create new)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_status_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_status_check 
  CHECK (status IN ('pending', 'active', 'suspended', 'inactive', 'rejected', 'deleted'));

-- 3. Create indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_businesses_deleted_at ON businesses(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_approved_at ON businesses(approved_at);
CREATE INDEX IF NOT EXISTS idx_businesses_last_admin_action ON businesses(last_admin_action_at);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at);
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON businesses(business_type);

-- 4. Create admin_business_actions audit table
CREATE TABLE IF NOT EXISTS admin_business_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'edit', 'soft_delete', 'hard_delete', 'restore', 'view')),
    reason TEXT,
    changes_json JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_business_actions_business_id ON admin_business_actions(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_business_actions_admin_id ON admin_business_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_business_actions_created_at ON admin_business_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_business_actions_action ON admin_business_actions(action);

-- 5. Create business_status_history table
CREATE TABLE IF NOT EXISTS business_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_status_history_business_id ON business_status_history(business_id);
CREATE INDEX IF NOT EXISTS idx_business_status_history_created_at ON business_status_history(created_at DESC);

-- 6. Ensure profiles.is_admin exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 7. Create trigger to auto-log status changes
CREATE OR REPLACE FUNCTION log_business_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO business_status_history (business_id, previous_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_business_status_change ON businesses;
CREATE TRIGGER trigger_log_business_status_change
    AFTER UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION log_business_status_change();

-- 8. RLS Policies for admin_business_actions
ALTER TABLE admin_business_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert audit logs" ON admin_business_actions
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can view all audit logs" ON admin_business_actions
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 9. RLS Policies for business_status_history
ALTER TABLE business_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all status history" ON business_status_history
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Business owners can view own history" ON business_status_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_status_history.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- 10. Admin RLS policy for businesses (view all)
DROP POLICY IF EXISTS "Admins can view all businesses" ON businesses;
CREATE POLICY "Admins can view all businesses" ON businesses
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 11. Admin RLS policy for businesses (update)
DROP POLICY IF EXISTS "Admins can update all businesses" ON businesses;
CREATE POLICY "Admins can update all businesses" ON businesses
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 12. Admin database functions
CREATE OR REPLACE FUNCTION admin_approve_business(
    p_business_id UUID,
    p_admin_id UUID
)
RETURNS businesses AS $$
DECLARE
    v_result businesses;
BEGIN
    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;

    -- Update business
    UPDATE businesses
    SET 
        status = 'active',
        approved_at = NOW(),
        approved_by = p_admin_id,
        rejection_reason = NULL,
        rejected_at = NULL,
        rejected_by = NULL,
        last_admin_action_at = NOW()
    WHERE id = p_business_id
    RETURNING * INTO v_result;

    -- Log action
    INSERT INTO admin_business_actions (business_id, admin_id, action)
    VALUES (p_business_id, p_admin_id, 'approve');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_reject_business(
    p_business_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS businesses AS $$
DECLARE
    v_result businesses;
BEGIN
    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;

    -- Reason is required
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Rejection reason is required';
    END IF;

    -- Update business
    UPDATE businesses
    SET 
        status = 'rejected',
        rejection_reason = p_reason,
        rejected_at = NOW(),
        rejected_by = p_admin_id,
        last_admin_action_at = NOW()
    WHERE id = p_business_id
    RETURNING * INTO v_result;

    -- Log action
    INSERT INTO admin_business_actions (business_id, admin_id, action, reason)
    VALUES (p_business_id, p_admin_id, 'reject', p_reason);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_soft_delete_business(
    p_business_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS businesses AS $$
DECLARE
    v_result businesses;
BEGIN
    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;

    -- Reason is required
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Deletion reason is required';
    END IF;

    -- Update business
    UPDATE businesses
    SET 
        status = 'deleted',
        deleted_at = NOW(),
        deleted_by = p_admin_id,
        last_admin_action_at = NOW()
    WHERE id = p_business_id
    RETURNING * INTO v_result;

    -- CASCADE: Soft-delete related offers
    UPDATE offers
    SET deleted_at = NOW()
    WHERE business_id = p_business_id AND deleted_at IS NULL;

    -- CASCADE: Soft-delete related products
    UPDATE products
    SET deleted_at = NOW()
    WHERE business_id = p_business_id AND deleted_at IS NULL;

    -- CASCADE: Deactivate follower relationships
    UPDATE business_followers
    SET is_active = false, updated_at = NOW()
    WHERE business_id = p_business_id AND is_active = true;

    -- Log action
    INSERT INTO admin_business_actions (business_id, admin_id, action, reason)
    VALUES (p_business_id, p_admin_id, 'soft_delete', p_reason);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_restore_business(
    p_business_id UUID,
    p_admin_id UUID
)
RETURNS businesses AS $$
DECLARE
    v_result businesses;
BEGIN
    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;

    -- Update business
    UPDATE businesses
    SET 
        status = 'pending',
        deleted_at = NULL,
        deleted_by = NULL,
        last_admin_action_at = NOW()
    WHERE id = p_business_id
    RETURNING * INTO v_result;

    -- CASCADE: Restore related offers
    UPDATE offers
    SET deleted_at = NULL
    WHERE business_id = p_business_id AND deleted_at IS NOT NULL;

    -- CASCADE: Restore related products
    UPDATE products
    SET deleted_at = NULL
    WHERE business_id = p_business_id AND deleted_at IS NOT NULL;

    -- CASCADE: Reactivate follower relationships
    UPDATE business_followers
    SET is_active = true, updated_at = NOW()
    WHERE business_id = p_business_id AND is_active = false;

    -- Log action
    INSERT INTO admin_business_actions (business_id, admin_id, action)
    VALUES (p_business_id, p_admin_id, 'restore');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (RLS will prevent non-admins)
GRANT EXECUTE ON FUNCTION admin_approve_business TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_business TO authenticated;
GRANT EXECUTE ON FUNCTION admin_soft_delete_business TO authenticated;
GRANT EXECUTE ON FUNCTION admin_restore_business TO authenticated;
```

---

## Testing Plan

### Database Tests (SQL)

```sql
-- Test 1: Verify new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name IN ('rejection_reason', 'approved_at', 'deleted_at');

-- Test 2: Verify admin_business_actions table
SELECT * FROM information_schema.tables 
WHERE table_name = 'admin_business_actions';

-- Test 3: Verify status CHECK constraint
INSERT INTO businesses (user_id, business_name, business_type, address, city, state, status)
VALUES (auth.uid(), 'Test', 'retail', '123 St', 'City', 'State', 'rejected');
-- Should succeed

-- Test 4: Verify RLS - Non-admin cannot insert audit log
-- (Run as non-admin user)
INSERT INTO admin_business_actions (business_id, admin_id, action)
VALUES ('some-uuid', auth.uid(), 'approve');
-- Should fail with RLS violation

-- Test 5: Verify admin function works
SELECT admin_approve_business('business-uuid', 'admin-uuid');
-- Should succeed if run as admin
```

### Manual Testing Checklist

- [ ] Run migration in local development
- [ ] Verify all columns added to businesses table
- [ ] Verify admin_business_actions table created
- [ ] Verify business_status_history table created
- [ ] Test status trigger by changing a business status
- [ ] Verify RLS blocks non-admin from audit table
- [ ] Verify admin functions work correctly
- [ ] Check indexes are created

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check if `profiles.is_admin` column already exists
- [ ] Review existing RLS policies on businesses table
- [ ] Verify no conflicting column names
- [ ] Check existing triggers on businesses table

### 2. Database Migration Execution
- [ ] Use **Supabase MCP tools** to execute SQL migrations when possible
- [ ] Use `mcp_supabase-mcp-server_apply_migration` for DDL operations
- [ ] Use `mcp_supabase-mcp-server_execute_sql` for verification queries
- [ ] Verify migration success with follow-up queries

### 3. Acceptance Criteria Verification
After implementation is complete:
- [ ] Go through EACH acceptance criterion one by one
- [ ] Mark each criterion as verified with evidence (query result or code reference)
- [ ] Document any deviations or edge cases discovered
- [ ] Get sign-off before proceeding to Story 6.3.2

### 4. Browser Testing & Evidence Collection

> **IMPORTANT**: Database changes must be verified before confirming completion.

**Test Environment:**
- Supabase Dashboard or local psql for SQL verification
- Local dev server: `http://localhost:5173` for admin panel testing

**Test Credentials:**
| User | Email | Password | Role |
|------|-------|----------|------|
| Admin User 1 (testuser1) | testuser1@gmail.com | Testuser@1 | Admin |
| Business Owner (testuser3) | testuser3@gmail.com | Testuser@1 | Business Owner |
| Regular User (testuser5) | testuser5@gmail.com | Testuser@1 | Regular User |

**Completion Criteria:**
- [ ] All database objects created successfully
- [ ] RLS policies verified (admin access works, non-admin blocked)
- [ ] Admin functions execute correctly
- [ ] Status trigger logs changes correctly

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/YYYYMMDD_admin_business_infrastructure.sql` | CREATE | Main migration script |
| `src/types/admin.ts` | CREATE | TypeScript types for admin operations |

---

## Definition of Done

- [ ] All new database tables created (`admin_business_actions`, `business_status_history`)
- [ ] All new columns added to `businesses` table
- [ ] Status CHECK constraint updated
- [ ] All indexes created
- [ ] RLS policies configured and tested
- [ ] Admin functions created and tested
- [ ] Status change trigger working
- [ ] Migration script committed to repository
- [ ] TypeScript types created for new tables
- [ ] All acceptance criteria verified

---

## Dependencies

- **Blocks:** Stories 6.3.2, 6.3.3, 6.3.4, 6.3.5 (all depend on this schema)
- **Related:** None

---

**Story Owner:** Backend Engineering  
**Reviewer:** [TBD]
