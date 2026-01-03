-- Migration: Filter Messages from In-App Notifications View
-- Story: 8.6.6 In-App Notifications
-- Description: Updates the in_app_notifications view to exclude chat messages, keeping only system alerts (friend requests, etc.) to avoid clutter in the Notification Center.

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
-- Join with profiles to get sender details
LEFT JOIN profiles p ON p.id = (nl.data->>'sender_id')::uuid
WHERE 
    -- Exclude message notifications (as they belong in the Chat tab, not Notification Center)
    nl.notification_type NOT IN ('new_message', 'message', 'text', 'image', 'video', 'voice', 'location')
    AND
    -- Filter out notifications from currently muted conversations (just in case)
    NOT EXISTS (
        SELECT 1 
        FROM muted_conversations mc 
        WHERE mc.user_id = nl.user_id 
        AND mc.conversation_id = (nl.data->>'conversation_id')::uuid
        AND (mc.muted_until IS NULL OR mc.muted_until > NOW())
    );

GRANT SELECT ON in_app_notifications TO authenticated;

COMMENT ON VIEW in_app_notifications IS 'Notifications log enriched with sender details, EXCLUDING chat messages.';
