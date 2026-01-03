-- =====================================================
-- Story 9.3.6: Contact Sync Permission Flow
-- Migration: Create contact sync schema and functions
-- =====================================================

-- Table: synced_contacts
-- Stores hashed contact information for privacy-focused matching
CREATE TABLE IF NOT EXISTS synced_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    contact_hash TEXT NOT NULL,
    matched_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique contact hashes per user
    UNIQUE(user_id, contact_hash)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_synced_contacts_user_id ON synced_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_contacts_hash ON synced_contacts(contact_hash);
CREATE INDEX IF NOT EXISTS idx_synced_contacts_matched_user ON synced_contacts(matched_user_id);

-- Enable RLS
ALTER TABLE synced_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own synced contacts"
    ON synced_contacts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own synced contacts"
    ON synced_contacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced contacts"
    ON synced_contacts FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Function: match_contacts
-- Matches hashed contacts against user profiles
-- Returns matched users who are not already friends
-- =====================================================

CREATE OR REPLACE FUNCTION match_contacts(
    contact_hashes TEXT[]
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    city TEXT,
    is_online BOOLEAN,
    contact_hash TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Match contacts against user emails and phone numbers (hashed)
    -- Exclude users who are already friends
    RETURN QUERY
    SELECT DISTINCT
        p.user_id as id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.city,
        p.is_online,
        unnest(contact_hashes) as contact_hash
    FROM profiles p
    WHERE 
        -- Match against hashed email or phone
        (
            MD5(LOWER(p.email)) = ANY(contact_hashes)
            OR (p.phone IS NOT NULL AND MD5(p.phone) = ANY(contact_hashes))
        )
        -- Exclude self
        AND p.user_id != current_user_id
        -- Exclude existing friends
        AND NOT EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = current_user_id AND f.friend_id = p.user_id)
               OR (f.user_id = p.user_id AND f.friend_id = current_user_id)
        )
        -- Exclude pending friend requests
        AND NOT EXISTS (
            SELECT 1 FROM friend_requests fr
            WHERE (fr.sender_id = current_user_id AND fr.receiver_id = p.user_id)
               OR (fr.sender_id = p.user_id AND fr.receiver_id = current_user_id)
            AND fr.status = 'pending'
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_contacts(TEXT[]) TO authenticated;

-- =====================================================
-- Function: save_synced_contacts
-- Saves synced contact matches to the database
-- =====================================================

CREATE OR REPLACE FUNCTION save_synced_contacts(
    contacts JSONB
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
    contact JSONB;
    inserted_count INTEGER := 0;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Insert each contact match
    FOR contact IN SELECT * FROM jsonb_array_elements(contacts)
    LOOP
        INSERT INTO synced_contacts (
            user_id,
            contact_hash,
            matched_user_id
        )
        VALUES (
            current_user_id,
            contact->>'contact_hash',
            (contact->>'matched_user_id')::UUID
        )
        ON CONFLICT (user_id, contact_hash) 
        DO UPDATE SET
            matched_user_id = EXCLUDED.matched_user_id,
            synced_at = NOW();
        
        inserted_count := inserted_count + 1;
    END LOOP;

    RETURN inserted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION save_synced_contacts(JSONB) TO authenticated;

-- =====================================================
-- Function: get_contact_matches
-- Retrieves previously matched contacts for a user
-- =====================================================

CREATE OR REPLACE FUNCTION get_contact_matches()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    city TEXT,
    is_online BOOLEAN,
    synced_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        p.user_id as id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.city,
        p.is_online,
        sc.synced_at
    FROM synced_contacts sc
    JOIN profiles p ON p.user_id = sc.matched_user_id
    WHERE sc.user_id = current_user_id
    AND sc.matched_user_id IS NOT NULL
    ORDER BY sc.synced_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_contact_matches() TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE synced_contacts IS 'Stores hashed contact information for privacy-focused friend matching';
COMMENT ON FUNCTION match_contacts IS 'Matches hashed contacts against user profiles, excluding existing friends';
COMMENT ON FUNCTION save_synced_contacts IS 'Saves synced contact matches to the database';
COMMENT ON FUNCTION get_contact_matches IS 'Retrieves previously matched contacts for the current user';
