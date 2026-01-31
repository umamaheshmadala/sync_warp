-- ============================================
-- Admin Hard Delete RPC
-- Story 6.3.4
-- ============================================

CREATE OR REPLACE FUNCTION admin_hard_delete_business(
    p_business_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Verify admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;

    -- Reason is required (even if logs are deleted, we enforce the check for intent)
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Deletion reason is required';
    END IF;

    -- DELETE business (Cascades to offers, products, etc. due to FKs)
    -- This will ALSO delete audit logs linked to this businessId
    DELETE FROM businesses
    WHERE id = p_business_id;

    -- We cannot insert a log entry linked to this business_id because it's gone.
    -- If we wanted to keep a "tombstone" log, we'd need a separate table or nullable business_id.
    -- For now, we accept that hard-delete is a full wipe.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_hard_delete_business TO authenticated;
