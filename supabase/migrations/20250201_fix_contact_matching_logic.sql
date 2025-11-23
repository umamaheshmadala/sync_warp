-- Fix contact matching logic
-- Problem: match_contacts was matching contact_hashes against contact_hashes (mutual friends)
-- Solution: Match uploaded contact hashes against profiles.phone_hash

-- 1. Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add phone_hash column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_hash TEXT;

-- 3. Create index for fast matching
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash ON profiles(phone_hash);

-- 4. Create function to automatically hash phone numbers
CREATE OR REPLACE FUNCTION update_profile_phone_hash()
RETURNS TRIGGER AS $$
BEGIN
    -- If phone is set, hash it
    IF NEW.phone IS NOT NULL THEN
        -- Normalize: remove non-digits
        -- Hash: SHA-256
        NEW.phone_hash := encode(digest(regexp_replace(NEW.phone, '\D', '', 'g'), 'sha256'), 'hex');
    ELSE
        NEW.phone_hash := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to keep hash updated
DROP TRIGGER IF EXISTS update_profile_phone_hash_trigger ON profiles;
CREATE TRIGGER update_profile_phone_hash_trigger
    BEFORE INSERT OR UPDATE OF phone ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_phone_hash();

-- 6. Backfill existing profiles
UPDATE profiles 
SET phone_hash = encode(digest(regexp_replace(phone, '\D', '', 'g'), 'sha256'), 'hex')
WHERE phone IS NOT NULL;

-- 7. Update match_contacts function to use profiles.phone_hash
CREATE OR REPLACE FUNCTION match_contacts(
    p_user_id UUID,
    p_phone_hashes TEXT[]
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    phone_hash TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.full_name,
        COALESCE(p.email, '') as username,
        p.avatar_url,
        p.phone_hash
    FROM profiles p
    WHERE 
        -- Match: User's phone hash is in the uploaded contact list
        p.phone_hash = ANY(p_phone_hashes)
        -- Exclude self
        AND p.id != p_user_id
        -- Exclude existing friends
        AND NOT EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = p_user_id AND f.friend_id = p.id)
               OR (f.user_id = p.id AND f.friend_id = p_user_id)
        )
        -- Exclude pending friend requests
        AND NOT EXISTS (
            SELECT 1 FROM friend_requests fr
            WHERE (fr.sender_id = p_user_id AND fr.receiver_id = p.id)
               OR (fr.sender_id = p.id AND fr.receiver_id = p_user_id)
            AND fr.status = 'pending'
        )
    LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION match_contacts(UUID, TEXT[]) TO authenticated;

COMMENT ON FUNCTION match_contacts IS 'Matches uploaded contact hashes against profiles.phone_hash';
