-- Diagnostic query for contact sync debugging

-- Step 1: Check test users' phone numbers and sync status
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    COUNT(ch.phone_hash) as contacts_synced,
    MAX(ch.updated_at) as last_sync
FROM profiles p
LEFT JOIN contact_hashes ch ON ch.user_id = p.id
WHERE p.full_name LIKE '%Test%'
   OR p.email LIKE '%test%'
GROUP BY p.id, p.full_name, p.email, p.phone
ORDER BY p.full_name;
