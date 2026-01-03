-- Update offer expiration dates to be in the future
-- This will make them valid and appear in the friend recommendations

UPDATE offers
SET valid_until = NOW() + INTERVAL '30 days'
WHERE business_id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50';

-- Verify the update
SELECT
    id,
    title,
    is_active,
    status,
    valid_until,
    (valid_until IS NULL OR valid_until > NOW()) as is_valid
FROM offers
WHERE business_id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
