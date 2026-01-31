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

-- 2. Update status handling
-- Drop old check constraint if it exists, as we rely on the Enum type
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_status_check;

-- Note: Enum values ('rejected', 'deleted', 'suspended') must be added via separate transaction or prior execution.
-- (We assume they are added).

-- 3. Create indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_businesses_deleted_at ON businesses(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_approved_at ON businesses(approved_at);
CREATE INDEX IF NOT EXISTS idx_businesses_last_admin_action ON businesses(last_admin_action_at);
-- These likely exist but good to be safe
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

-- 6. Ensure profiles.is_admin exists (handled in previous migration)

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

DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_business_actions;
CREATE POLICY "Admins can insert audit logs" ON admin_business_actions
    FOR INSERT
    WITH CHECK (
        public.is_admin()
    );

DROP POLICY IF EXISTS "Admins can view all audit logs" ON admin_business_actions;
CREATE POLICY "Admins can view all audit logs" ON admin_business_actions
    FOR SELECT
    USING (
        public.is_admin()
    );

-- 9. RLS Policies for business_status_history
ALTER TABLE business_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all status history" ON business_status_history;
CREATE POLICY "Admins can view all status history" ON business_status_history
    FOR SELECT
    USING (
        public.is_admin()
    );

DROP POLICY IF EXISTS "Business owners can view own history" ON business_status_history;
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
        public.is_admin()
    );

-- 11. Admin RLS policy for businesses (update)
DROP POLICY IF EXISTS "Admins can update all businesses" ON businesses;
CREATE POLICY "Admins can update all businesses" ON businesses
    FOR UPDATE
    USING (
        public.is_admin()
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
    IF NOT public.is_admin() THEN
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
    IF NOT public.is_admin() THEN
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
    IF NOT public.is_admin() THEN
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
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;

    -- Update business
    UPDATE businesses
    SET 
        status = 'active', 
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

GRANT EXECUTE ON FUNCTION admin_approve_business TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_business TO authenticated;
GRANT EXECUTE ON FUNCTION admin_soft_delete_business TO authenticated;
GRANT EXECUTE ON FUNCTION admin_restore_business TO authenticated;
