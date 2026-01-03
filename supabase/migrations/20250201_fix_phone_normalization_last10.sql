-- Update phone normalization to use last 10 digits
-- This fixes country code mismatch issues

-- 1. Update the trigger function to use last 10 digits
CREATE OR REPLACE FUNCTION update_profile_phone_hash()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.phone IS NOT NULL THEN
        -- Normalize: remove non-digits, then take last 10 digits
        -- Hash: SHA-256
        NEW.phone_hash := encode(
            digest(
                right(regexp_replace(NEW.phone, '\D', '', 'g'), 10),
                'sha256'
            ),
            'hex'
        );
    ELSE
        NEW.phone_hash := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Backfill existing profiles with new normalization
UPDATE profiles 
SET phone_hash = encode(
    digest(
        right(regexp_replace(phone, '\D', '', 'g'), 10),
        'sha256'
    ),
    'hex'
)
WHERE phone IS NOT NULL;

-- 3. Update match_contacts to use the new phone_hash (no changes needed, it already uses phone_hash column)
-- The function will automatically use the updated hashes

-- 4. Verify the changes
SELECT 
    phone,
    right(regexp_replace(phone, '\D', '', 'g'), 10) as normalized,
    phone_hash
FROM profiles 
WHERE phone IS NOT NULL 
LIMIT 5;
