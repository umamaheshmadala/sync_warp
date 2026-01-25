-- Add sender_id column to notification_log
ALTER TABLE notification_log 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill sender_id from data JSON
UPDATE notification_log
SET sender_id = (data->>'sender_id')::uuid
WHERE sender_id IS NULL AND data->>'sender_id' IS NOT NULL;

-- Verify View (View definitions often bind to specific columns at creation time, so we might need to recreate it)
-- Recreating view to ensure it prefers the column 'sender_id' over json 'sender_id' if ambiguous, 
-- or simply to refresh it.
CREATE OR REPLACE VIEW in_app_notifications AS
SELECT 
    nl.id,
    nl.user_id,
    nl.notification_type,
    nl.title,
    nl.body,
    nl.data,
    nl.sent_at,
    nl.opened,
    -- Extract sender info for UI
    p.full_name as sender_name,
    p.avatar_url as sender_avatar,
    p.id as sender_id
FROM notification_log nl
LEFT JOIN profiles p ON p.id = nl.sender_id -- Use the new column!
WHERE 
    NOT EXISTS (
        SELECT 1 
        FROM muted_conversations mc 
        WHERE mc.user_id = nl.user_id 
        AND mc.conversation_id = (nl.data->>'conversation_id')::uuid
        AND (mc.muted_until IS NULL OR mc.muted_until > NOW())
    );

GRANT SELECT ON in_app_notifications TO authenticated;
