-- Update the created_at timestamp of favorites to NOW()
-- This ensures they are within the last 7 days for the RPC function

UPDATE favorites
SET created_at = NOW()
WHERE entity_type = 'offer'
  AND entity_id IN (
    SELECT id FROM offers 
    WHERE business_id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50'
  );

-- Verify the update
SELECT 
    f.id,
    f.user_id,
    p.full_name,
    f.entity_type,
    o.title,
    f.created_at,
    NOW() - f.created_at as age
FROM favorites f
INNER JOIN offers o ON o.id = f.entity_id
INNER JOIN profiles p ON p.id = f.user_id
WHERE f.entity_type = 'offer'
  AND o.business_id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50'
ORDER BY f.created_at DESC;
