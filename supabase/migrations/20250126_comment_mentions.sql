-- Migration: Create deal_comments table and add mention support
-- Story: 9.7.2 - Friend Tags in Deal Comments

-- 1. Create deal_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL, -- References deals(id) - constraint added separately if needed
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add mentions column
ALTER TABLE deal_comments
ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] DEFAULT '{}';

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_deal_comments_deal_id ON deal_comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_comments_user_id ON deal_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_comments_mentioned_users ON deal_comments USING GIN (mentioned_user_ids);

-- 4. RLS Policies
ALTER TABLE deal_comments ENABLE ROW LEVEL SECURITY;

-- Safely create policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'deal_comments' AND policyname = 'Everyone can view comments'
    ) THEN
        CREATE POLICY "Everyone can view comments" ON deal_comments FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'deal_comments' AND policyname = 'Authenticated users can create comments'
    ) THEN
        CREATE POLICY "Authenticated users can create comments" ON deal_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'deal_comments' AND policyname = 'Users can update their own comments'
    ) THEN
        CREATE POLICY "Users can update their own comments" ON deal_comments FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'deal_comments' AND policyname = 'Users can delete their own comments'
    ) THEN
        CREATE POLICY "Users can delete their own comments" ON deal_comments FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 5. Function to notify mentioned users
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_commenter_name TEXT;
  v_deal_title TEXT;
BEGIN
  -- Get commenter name
  SELECT full_name INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get deal title (if deals table exists)
  BEGIN
    SELECT title INTO v_deal_title
    FROM deals
    WHERE id = NEW.deal_id;
  EXCEPTION WHEN OTHERS THEN
    v_deal_title := 'a deal';
  END;
  
  IF v_deal_title IS NULL THEN
    v_deal_title := 'a deal';
  END IF;

  -- Notify each mentioned user
  IF NEW.mentioned_user_ids IS NOT NULL THEN
    FOREACH v_user_id IN ARRAY NEW.mentioned_user_ids
    LOOP
      -- Don't notify self
      IF v_user_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, notification_type, title, message, data, entity_id, sender_id)
        VALUES (
          v_user_id,
          'comment_mention',
          'You were mentioned',
          COALESCE(v_commenter_name, 'Someone') || ' mentioned you in a comment on "' || v_deal_title || '"',
          jsonb_build_object(
            'deal_id', NEW.deal_id,
            'comment_id', NEW.id,
            'commenter_id', NEW.user_id
          ),
          NEW.deal_id,
          NEW.user_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger
DROP TRIGGER IF EXISTS trigger_notify_comment_mentions ON deal_comments;
CREATE TRIGGER trigger_notify_comment_mentions
  AFTER INSERT ON deal_comments
  FOR EACH ROW
  WHEN (array_length(NEW.mentioned_user_ids, 1) > 0)
  EXECUTE FUNCTION notify_comment_mentions();

-- Comments
COMMENT ON TABLE deal_comments IS 'Comments on deals/offers';
COMMENT ON COLUMN deal_comments.mentioned_user_ids IS 'Array of user IDs mentioned in the comment';
