-- Migration: Add Quiet Hours and Mute Conversations
-- Story 8.6.5: Notification Preferences
-- Date: 2024-12-07
-- Description: Add quiet hours (DND) and conversation mute features

-- ============================================================================
-- 1. CREATE MUTED_CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS muted_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  muted_until TIMESTAMPTZ, -- NULL = muted forever
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, conversation_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_muted_conversations_user ON muted_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_conversations_conv ON muted_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_muted_conversations_until ON muted_conversations(muted_until) 
  WHERE muted_until IS NOT NULL;

-- Enable RLS
ALTER TABLE muted_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own muted conversations"
  ON muted_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mute conversations"
  ON muted_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their mutes"
  ON muted_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmute conversations"
  ON muted_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE muted_conversations IS 'Tracks which conversations a user has muted';
COMMENT ON COLUMN muted_conversations.muted_until IS 'When mute expires. NULL means muted forever';

-- ============================================================================
-- 2. ADD QUIET HOURS TO NOTIFICATION SETTINGS
-- ============================================================================

-- Create a dedicated notification_settings table for more structured settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Global settings
  push_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  
  -- Preview settings
  show_preview BOOLEAN DEFAULT true,
  
  -- Quiet hours (Do Not Disturb)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',  -- 10 PM
  quiet_hours_end TIME DEFAULT '07:00',    -- 7 AM
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER trigger_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

COMMENT ON TABLE notification_settings IS 'User notification preferences including quiet hours';
COMMENT ON COLUMN notification_settings.quiet_hours_enabled IS 'Whether quiet hours (DND) is enabled';
COMMENT ON COLUMN notification_settings.quiet_hours_start IS 'When quiet hours start (24h format)';
COMMENT ON COLUMN notification_settings.quiet_hours_end IS 'When quiet hours end (24h format)';

-- ============================================================================
-- 3. CREATE HELPER FUNCTION TO CHECK IF IN QUIET HOURS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_in_quiet_hours(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  settings RECORD;
  current_time_of_day TIME;
  in_quiet_hours BOOLEAN;
BEGIN
  -- Get user settings
  SELECT * INTO settings
  FROM notification_settings
  WHERE user_id = target_user_id;

  -- If no settings or quiet hours disabled, return false
  IF NOT FOUND OR NOT settings.quiet_hours_enabled THEN
    RETURN false;
  END IF;

  current_time_of_day := LOCALTIME;

  -- Handle overnight ranges (e.g., 22:00 - 07:00)
  IF settings.quiet_hours_start > settings.quiet_hours_end THEN
    -- Overnight: true if current time is >= start OR < end
    in_quiet_hours := current_time_of_day >= settings.quiet_hours_start 
                      OR current_time_of_day < settings.quiet_hours_end;
  ELSE
    -- Same day: true if current time is >= start AND < end
    in_quiet_hours := current_time_of_day >= settings.quiet_hours_start 
                      AND current_time_of_day < settings.quiet_hours_end;
  END IF;

  RETURN in_quiet_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_in_quiet_hours IS 'Checks if the specified user is currently in quiet hours (DND)';

-- ============================================================================
-- 4. CREATE HELPER FUNCTION TO CHECK IF CONVERSATION IS MUTED
-- ============================================================================

CREATE OR REPLACE FUNCTION is_conversation_muted(
  target_user_id UUID,
  target_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  mute_record RECORD;
BEGIN
  -- Check muted_conversations table
  SELECT * INTO mute_record
  FROM muted_conversations
  WHERE user_id = target_user_id
    AND conversation_id = target_conversation_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if mute has expired
  IF mute_record.muted_until IS NOT NULL THEN
    RETURN mute_record.muted_until > NOW();
  END IF;

  -- Muted forever
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_conversation_muted IS 'Checks if a conversation is muted for a specific user';

-- ============================================================================
-- 5. UPDATE MESSAGE TRIGGER TO USE NEW FUNCTIONS
-- ============================================================================

-- Update the notify_new_message_push function to use new helper functions
CREATE OR REPLACE FUNCTION notify_new_message_push()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  message_preview TEXT;
  participant RECORD;
BEGIN
  -- Skip notification for deleted messages
  IF NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;

  -- Get sender's name
  SELECT COALESCE(full_name, email, 'Someone') INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create message preview based on type
  CASE NEW.type
    WHEN 'text' THEN
      message_preview := SUBSTRING(COALESCE(NEW.content, ''), 1, 100);
    WHEN 'image' THEN
      message_preview := '📷 Sent a photo';
    WHEN 'video' THEN
      message_preview := '🎥 Sent a video';
    WHEN 'link' THEN
      message_preview := '🔗 Shared a link';
    WHEN 'coupon' THEN
      message_preview := '🎟️ Shared a coupon';
    WHEN 'deal' THEN
      message_preview := '💰 Shared a deal';
    ELSE
      message_preview := 'Sent a message';
  END CASE;

  -- Loop through all participants except sender
  FOR participant IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
      AND cp.left_at IS NULL
  LOOP
    -- Check if should send notification:
    -- 1. Global notifications enabled
    -- 2. Conversation not muted
    -- 3. Not in quiet hours
    IF should_send_notification(participant.user_id, 'messages')
       AND NOT is_conversation_muted(participant.user_id, NEW.conversation_id)
       AND NOT is_in_quiet_hours(participant.user_id)
    THEN
      -- Log the notification
      INSERT INTO notification_log (
        user_id,
        notification_type,
        title,
        body,
        data,
        sent_at
      ) VALUES (
        participant.user_id,
        'new_message',
        sender_name,
        message_preview,
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id,
          'type', 'new_message',
          'action_url', '/messages/' || NEW.conversation_id
        ),
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CREATE FUNCTION TO MUTE/UNMUTE CONVERSATIONS
-- ============================================================================

-- Function: Mute a conversation
CREATE OR REPLACE FUNCTION mute_conversation(
  p_conversation_id UUID,
  p_duration TEXT DEFAULT 'forever' -- 'hour', 'day', 'week', 'forever'
)
RETURNS BOOLEAN AS $$
DECLARE
  muted_until_time TIMESTAMPTZ;
BEGIN
  -- Calculate muted_until based on duration
  CASE p_duration
    WHEN 'hour' THEN
      muted_until_time := NOW() + INTERVAL '1 hour';
    WHEN 'day' THEN
      muted_until_time := NOW() + INTERVAL '1 day';
    WHEN 'week' THEN
      muted_until_time := NOW() + INTERVAL '1 week';
    ELSE
      muted_until_time := NULL; -- Forever
  END CASE;

  -- Upsert mute record
  INSERT INTO muted_conversations (user_id, conversation_id, muted_until)
  VALUES (auth.uid(), p_conversation_id, muted_until_time)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET muted_until = muted_until_time;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Unmute a conversation
CREATE OR REPLACE FUNCTION unmute_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM muted_conversations
  WHERE user_id = auth.uid()
    AND conversation_id = p_conversation_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mute_conversation IS 'Mute a conversation for specified duration';
COMMENT ON FUNCTION unmute_conversation IS 'Unmute a conversation';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Quiet hours and mute conversations added';
  RAISE NOTICE 'Tables created: muted_conversations, notification_settings';
  RAISE NOTICE 'Functions created: is_in_quiet_hours, is_conversation_muted, mute_conversation, unmute_conversation';
END
$$;
