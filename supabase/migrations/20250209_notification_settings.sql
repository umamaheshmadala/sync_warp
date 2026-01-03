-- Story 8.6.5: Notification Preferences & Settings
-- Create tables for notification settings and muted conversations

-- ============================================
-- 0. CLEANUP (Run first to ensure fresh state)
-- ============================================

-- Drop all variants of functions to avoid conflicts
DROP FUNCTION IF EXISTS is_conversation_muted(UUID, UUID);
DROP FUNCTION IF EXISTS is_conversation_muted(UUID);
DROP FUNCTION IF EXISTS mute_conversation(UUID, INT);
DROP FUNCTION IF EXISTS mute_conversation(UUID, TEXT);
DROP FUNCTION IF EXISTS unmute_conversation(UUID);

-- ============================================
-- 1. NOTIFICATION SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Global settings
  enabled BOOLEAN DEFAULT true NOT NULL,
  sound_enabled BOOLEAN DEFAULT true NOT NULL,
  vibration_enabled BOOLEAN DEFAULT true NOT NULL,

  -- Preview settings
  show_preview BOOLEAN DEFAULT true NOT NULL,  -- Show message content in notification

  -- Quiet hours (Do Not Disturb)
  quiet_hours_enabled BOOLEAN DEFAULT false NOT NULL,
  quiet_hours_start TIME DEFAULT '22:00' NOT NULL,  -- 10 PM
  quiet_hours_end TIME DEFAULT '07:00' NOT NULL,    -- 7 AM

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. MUTED CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS muted_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  muted_until TIMESTAMPTZ,  -- NULL = muted forever
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, conversation_id)
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notification_settings_user 
  ON notification_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_muted_conversations_user 
  ON muted_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_muted_conversations_conv 
  ON muted_conversations(conversation_id);

CREATE INDEX IF NOT EXISTS idx_muted_conversations_active 
  ON muted_conversations(user_id, conversation_id) 
  WHERE muted_until IS NOT NULL;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_conversations ENABLE ROW LEVEL SECURITY;

-- Notification Settings Policies
DROP POLICY IF EXISTS "Users can manage own notification settings" ON notification_settings;
CREATE POLICY "Users can manage own notification settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Muted Conversations Policies
DROP POLICY IF EXISTS "Users can manage own muted conversations" ON muted_conversations;
CREATE POLICY "Users can manage own muted conversations"
  ON muted_conversations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. HELPER FUNCTION
-- ============================================

-- Function to check if a conversation is muted for a user
CREATE OR REPLACE FUNCTION is_conversation_muted(
  p_user_id UUID,
  p_conversation_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  mute_record RECORD;
BEGIN
  SELECT muted_until INTO mute_record
  FROM muted_conversations
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id;

  -- If no record, not muted
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- If muted_until is NULL, muted forever
  IF mute_record.muted_until IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if mute has expired
  RETURN mute_record.muted_until > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 6. RPC FUNCTIONS FOR CONVERSATION MUTE/UNMUTE
-- ============================================

-- Mute conversation RPC (called from conversationManagementService)
-- Logic updated to match frontend `p_duration` string values ('hour', 'day', 'week', 'forever')
CREATE OR REPLACE FUNCTION mute_conversation(
  p_conversation_id UUID,
  p_duration TEXT DEFAULT 'forever'
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_muted_until TIMESTAMPTZ;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate muted_until timestamp based on string duration
  CASE p_duration
    WHEN 'hour' THEN
      v_muted_until := NOW() + INTERVAL '1 hour';
    WHEN 'day' THEN
      v_muted_until := NOW() + INTERVAL '1 day';
    WHEN 'week' THEN
      v_muted_until := NOW() + INTERVAL '1 week';
    WHEN 'forever' THEN
      v_muted_until := NULL;
    ELSE
      -- Default fallback or error? treating as forever or handling specific known formats
      -- If migration previously used '1h', '8h' etc, we should support them or just fallback.
      -- Given strict frontend types, we stick to the cases.
      v_muted_until := NULL;
  END CASE;

  -- Upsert mute record
  INSERT INTO muted_conversations (user_id, conversation_id, muted_until)
  VALUES (v_user_id, p_conversation_id, v_muted_until)
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET 
    muted_until = v_muted_until,
    created_at = NOW();

  RAISE NOTICE 'Conversation % muted for user % (Duration: %)', p_conversation_id, v_user_id, p_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Unmute conversation RPC (called from conversationManagementService)
CREATE OR REPLACE FUNCTION unmute_conversation(
  p_conversation_id UUID
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete mute record
  DELETE FROM muted_conversations
  WHERE user_id = v_user_id
    AND conversation_id = p_conversation_id;

  RAISE NOTICE 'Conversation % unmuted for user %', p_conversation_id, v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE notification_settings IS 'User notification preferences for push notifications (Story 8.6.5)';
COMMENT ON TABLE muted_conversations IS 'Tracks muted conversations per user with optional expiry (Story 8.6.5)';
COMMENT ON FUNCTION is_conversation_muted IS 'Helper function to check if a conversation is currently muted for a user';
COMMENT ON FUNCTION mute_conversation IS 'RPC function to mute a conversation with optional duration (Story 8.6.5)';
COMMENT ON FUNCTION unmute_conversation IS 'RPC function to unmute a conversation (Story 8.6.5)';

-- ============================================
-- 7. UPDATE VIEW (Fix for persistence)
-- ============================================

-- Recreate conversation_list view to join with the correct table (muted_conversations)
CREATE OR REPLACE VIEW conversation_list AS
SELECT
  c.id AS conversation_id,
  c.type,
  c.participants,
  COALESCE(cp.is_archived, false) AS is_archived,
  -- Check if conversation is muted (from muted_conversations table - FIXED)
  EXISTS(
    SELECT 1 FROM muted_conversations cm
    WHERE cm.conversation_id = c.id
      AND cm.user_id = auth.uid()
      AND (cm.muted_until IS NULL OR cm.muted_until > NOW())
  ) AS is_muted,
  -- Get mute expiry time
  (
    SELECT cm.muted_until
    FROM muted_conversations cm
    WHERE cm.conversation_id = c.id
      AND cm.user_id = auth.uid()
    LIMIT 1
  ) AS muted_until,
  COALESCE(cp.is_pinned, false) AS is_pinned,
  c.created_at,
  c.last_message_at,
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.type AS last_message_type,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_timestamp,
  sender.full_name AS last_message_sender_name,
  sender.avatar_url AS last_message_sender_avatar,
  CASE
    WHEN c.type = 'direct' THEN (
      SELECT id
      FROM unnest(c.participants) AS id
      WHERE id <> auth.uid()
      LIMIT 1
    )
    ELSE NULL
  END AS other_participant_id,
  other_profile.full_name AS other_participant_name,
  other_profile.avatar_url AS other_participant_avatar,
  other_profile.is_online AS other_participant_online,
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  ) AS unread_count
FROM conversations c
LEFT JOIN LATERAL (
  SELECT *
  FROM messages
  WHERE conversation_id = c.id
    AND is_deleted = false
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true
LEFT JOIN profiles sender ON sender.id = lm.sender_id
LEFT JOIN LATERAL (
  SELECT *
  FROM profiles
  WHERE id = (
    SELECT id
    FROM unnest(c.participants) AS id
    WHERE id <> auth.uid()
    LIMIT 1
  )
) other_profile ON c.type = 'direct'
LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = auth.uid()
WHERE auth.uid() = ANY(c.participants)
  AND NOT EXISTS (
    SELECT 1
    FROM blocked_users bu
    WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = ANY(c.participants))
       OR (bu.blocked_id = auth.uid() AND bu.blocker_id = ANY(c.participants))
  )
  AND (cp.deleted_for_user IS NULL OR cp.deleted_for_user = false);
