-- Get a real offer ID to use in ShareDealDemo
SELECT id, title, description
FROM offers
WHERE valid_until > NOW()
ORDER BY created_at DESC
LIMIT 5;
