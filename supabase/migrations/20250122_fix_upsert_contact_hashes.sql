-- Fix upsert_contact_hashes function
-- The issue is that SECURITY DEFINER functions run with the definer's privileges
-- but we need to explicitly handle the user_id parameter

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
    -- Verify the caller is the user they claim to be (security check)
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: Cannot update contact hashes for another user';
    END IF;
    
    -- Delete existing contact hashes for this user
    DELETE FROM contact_hashes
    WHERE user_id = p_user_id;
    
    -- Insert new contact hashes
    -- Using INSERT with explicit column names
    IF array_length(p_phone_hashes, 1) > 0 THEN
        INSERT INTO contact_hashes (user_id, phone_hash, updated_at)
        SELECT 
            p_user_id,
            hash,
            NOW()
        FROM unnest(p_phone_hashes) AS hash;
    END IF;
    
    -- Log for debugging
    RAISE NOTICE 'Upserted % contact hashes for user %', array_length(p_phone_hashes, 1), p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_contact_hashes(UUID, TEXT[]) TO authenticated;
