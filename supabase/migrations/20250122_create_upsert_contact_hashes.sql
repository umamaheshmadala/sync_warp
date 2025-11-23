-- Create upsert_contact_hashes function
-- This function is called by the contact sync service to upload hashed phone numbers

CREATE OR REPLACE FUNCTION upsert_contact_hashes(
    p_user_id UUID,
    p_phone_hashes TEXT[]
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete existing contact hashes for this user
    DELETE FROM contact_hashes
    WHERE user_id = p_user_id;
    
    -- Insert new contact hashes
    INSERT INTO contact_hashes (user_id, phone_hash, updated_at)
    SELECT 
        p_user_id,
        unnest(p_phone_hashes),
        NOW();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_contact_hashes(UUID, TEXT[]) TO authenticated;

COMMENT ON FUNCTION upsert_contact_hashes IS 'Upserts contact hashes for a user - replaces all existing hashes with new ones';
