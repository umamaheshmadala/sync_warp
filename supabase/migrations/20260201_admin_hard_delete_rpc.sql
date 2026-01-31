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

    -- DELETE the business
    -- Note: This cascades to all related tables (products, offers, etc.) 
    -- and also deletes the audit log (admin_business_actions) for this business
    -- because of ON DELETE CASCADE constraints.
    DELETE FROM businesses WHERE id = p_business_id;

    -- We cannot log *after* deletion in admin_business_actions if it references business_id,
    -- unless we allow NULL business_id or don't cascade.
    -- For now, we accept that hard delete removes the record entirely.
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to hard delete business: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_hard_delete_business TO authenticated;
