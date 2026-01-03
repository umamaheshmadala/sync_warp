-- Check if notification was created for Test User 2
-- Test User 2 ID: eed7a6f3-f531-4621-a118-756cd5d694c4
-- Test User 1 ID: d7c2f5c4-0f19-4b4f-a641-3f77c34937b2

-- 1. Check notifications table
SELECT 
    id,
    user_id,
    title,
    message,
    notification_type,
    entity_id,
    sender_id,
    is_read,
    created_at
FROM notifications
WHERE user_id = 'eed7a6f3-f531-4621-a118-756cd5d694c4'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check deal_shares table
SELECT 
    id,
    deal_id,
    sender_id,
    recipient_id,
    message,
    share_method,
    created_at
FROM deal_shares
WHERE recipient_id = 'eed7a6f3-f531-4621-a118-756cd5d694c4'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if deal_shares table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'deal_shares'
);

-- 4. Check if notifications table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
);
