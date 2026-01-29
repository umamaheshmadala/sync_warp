-- Migration: Offer Tracking Enhancements (Story 4.14 - 4.19)
-- Date: 2026-01-29
-- Description: Adds audit codes, comprehensive audit logging table, and featured offer columns.

-- 1. Add Tracking Columns to 'offers' table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS audit_code VARCHAR(50) UNIQUE DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS custom_reference VARCHAR(100) DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS featured_priority INTEGER DEFAULT 0;

-- Comments for documentation
COMMENT ON COLUMN offers.audit_code IS 'Unique auto-generated tracking code: AUDIT-{PREFIX}-{YYYYMM}-{SEQ}';
COMMENT ON COLUMN offers.custom_reference IS 'Optional internal reference code for business owners';
COMMENT ON COLUMN offers.is_featured IS 'Whether this offer is pinned to the top (max 3 per business)';
COMMENT ON COLUMN offers.featured_priority IS 'Ordering for featured offers (higher = first)';

-- 2. Create Audit Log Table
CREATE TABLE IF NOT EXISTS offer_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id), -- User who performed the action
    action VARCHAR(50) NOT NULL, -- 'created', 'paused', 'terminated', 'archived', etc.
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_fields JSONB DEFAULT '{}'::jsonb, -- For tracking specific field edits
    metadata JSONB DEFAULT '{}'::jsonb, -- Extra data (e.g. restart_date, reason)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE offer_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Business owners can view logs for their own offers
CREATE POLICY "Business owners can view audit logs" ON offer_audit_log
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
        )
    );

-- RLS: System/Triggers insert logs (users don't insert directly generally, but giving permission for now if done via RPC/Client for some actions)
-- Better: Only allow INSERT via server-side functions? For now, allow authenticated if they own the business.
CREATE POLICY "Business owners can insert audit logs" ON offer_audit_log
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
        )
    );


-- 3. Function: Generate Unique Audit Code
-- Format: AUDIT-{PREFIX}-{YYYYMM}-{SEQ}
-- Prefix: First 3 chars of Business Name (or Slug), upper case.
-- Seq: Resets every month.
CREATE OR REPLACE FUNCTION generate_offer_audit_code()
RETURNS TRIGGER AS $$
DECLARE
    biz_prefix VARCHAR(10);
    date_part VARCHAR(6);
    seq_num INTEGER;
    new_code VARCHAR(50);
BEGIN
    -- Only generate if not present
    IF NEW.audit_code IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get Business Prefix (First 3 chars of name, uppercase, default 'OFF')
    SELECT UPPER(SUBSTRING(business_name, 1, 3)) INTO biz_prefix
    FROM businesses 
    WHERE id = NEW.business_id;
    
    IF biz_prefix IS NULL THEN 
        biz_prefix := 'OFF';
    END IF;

    -- Get Date Part (YYYYMM)
    date_part := TO_CHAR(NOW(), 'YYYYMM');

    -- Calculate Sequence
    -- Find max sequence for this business + month
    -- We'll parse the sequence from existing codes: AUDIT-PRE-202601-XXXX
    -- This is slightly expensive but safe for transaction volume expected.
    -- Alternative: A separate sequences table. Let's stick to max(code) for simplicity for now.
    
    WITH pattern_match AS (
        SELECT audit_code
        FROM offers
        WHERE business_id = NEW.business_id
        AND audit_code LIKE 'AUDIT-' || biz_prefix || '-' || date_part || '-%'
    )
    SELECT COALESCE(MAX(CAST(SPLIT_PART(audit_code, '-', 4) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM pattern_match;

    -- Format: AUDIT-{PREFIX}-{YYYYMM}-{0000}
    new_code := 'AUDIT-' || biz_prefix || '-' || date_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    
    NEW.audit_code := new_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Generate Audit Code on Insert
DROP TRIGGER IF EXISTS trigger_generate_audit_code ON offers;
CREATE TRIGGER trigger_generate_audit_code
BEFORE INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION generate_offer_audit_code();


-- 4. Function: Log Offer Action (Helper for internal usage)
CREATE OR REPLACE FUNCTION log_offer_action_trigger()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    metadata JSONB := '{}'::jsonb;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        action_type := 'created';
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Determine action based on status change or field update
        IF OLD.status != NEW.status THEN
            action_type := NEW.status; -- 'active', 'paused', etc.
            -- Store reasons if present
            IF NEW.pause_reason IS NOT NULL AND NEW.pause_reason != OLD.pause_reason THEN
                metadata := jsonb_build_object('reason', NEW.pause_reason);
            END IF;
            IF NEW.terminate_reason IS NOT NULL AND NEW.terminate_reason != OLD.terminate_reason THEN
                 metadata := jsonb_build_object('reason', NEW.terminate_reason);
            END IF;
        ELSE
            action_type := 'updated';
            -- Track changed fields (simplistic)
             metadata := jsonb_build_object('changes', 'Field updates'); 
        END IF;

        -- Soft Delete Case
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            action_type := 'deleted';
        END IF;
    END IF;

    INSERT INTO offer_audit_log (
        offer_id,
        business_id,
        actor_id,
        action,
        previous_status,
        new_status,
        metadata
    ) VALUES (
        NEW.id,
        NEW.business_id,
        auth.uid(), -- Might be null if system trigger? fallback to created_by
        action_type,
        OLD.status,
        NEW.status,
        metadata
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Trigger for logging might be overkill if we want granular control from Application layer.
-- Story says "Log action to offer_audit_log".
-- Let's NOT add an auto-trigger for logging everywhere yet to avoid noise, 
-- but we DO need a helper function callable from RLS/RPC if needed.
-- Actually, Requirement 4.19 says "Comprehensive audit log for... created, edited, published...".
-- Doing it in App Layer (useOfferAuditLog hook) is often safer for capturing "User Intent" context.
-- BUT, database triggers ensure integrity. 
-- Decision: We will create the TABLE here, but insert logs via the Application Hook for now to ensure we capture the specific 'Action Name' defined in stories (e.g. 'duplicated' is hard to detect in trigger).

-- However, let's create a Helper RPC for easy logging:
CREATE OR REPLACE FUNCTION log_offer_activity(
    p_offer_id UUID,
    p_action VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
    v_business_id UUID;
    v_status VARCHAR;
BEGIN
    SELECT business_id, status INTO v_business_id, v_status FROM offers WHERE id = p_offer_id;

    INSERT INTO offer_audit_log (
        offer_id,
        business_id,
        actor_id,
        action,
        new_status,
        metadata
    ) VALUES (
        p_offer_id,
        v_business_id,
        auth.uid(),
        p_action,
        v_status,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
