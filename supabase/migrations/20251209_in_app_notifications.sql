-- Migration: In-App Notifications View
-- Story: 8.6.6 In-App Notifications
-- Description: Create a view to simplify fetching notifications with sender details and filtering out muted conversations.

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
-- Join with profiles to get sender details (assuming sender_id is in data->>'sender_id' or sender_id column if it exists)
-- Note: notification_log data jsonb usually contains sender_id
LEFT JOIN profiles p ON p.id = (nl.data->>'sender_id')::uuid
WHERE 
    -- Filter out notifications from currently muted conversations
    -- This handles cases where a user mutes a chat AFTER receiving notifications
    NOT EXISTS (
        SELECT 1 
        FROM muted_conversations mc 
        WHERE mc.user_id = nl.user_id 
        AND mc.conversation_id = (nl.data->>'conversation_id')::uuid
        AND (mc.muted_until IS NULL OR mc.muted_until > NOW())
    );

-- Grant perms
GRANT SELECT ON in_app_notifications TO authenticated;

COMMENT ON VIEW in_app_notifications IS 'Notifications log enriched with sender details, filtering out currently muted conversations.';
