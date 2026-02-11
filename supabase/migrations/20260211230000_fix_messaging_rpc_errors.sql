-- Migration: Fix Messaging RPC Errors
-- Date: 2026-02-11
-- Description: 
-- 1. Fixes get_messages_v2 to refer to 'link_preview' column instead of 'link_previews'
-- 2. Ensures get_mutual_friends function exists (was returning 404)
-- 3. Ensures message_reports table exists (dependency for get_messages_v2)

-- ============================================================
-- 1. Ensure Report Dependencies exist
-- ============================================================

-- Create Report Reason Enum if not exists
DO $$ BEGIN
    CREATE TYPE report_reason AS ENUM (
        'spam',
        'harassment',
        'hate_speech',
        'self_harm',
        'sexual_content',
        'violence',
        'scam',
        'impersonation',
        'copyright',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Message Reports Table if not exists
CREATE TABLE IF NOT EXISTS message_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    reporter_reputation NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(message_id, reporter_id)
);

-- Enable RLS
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- Policies (Drop first to avoid error on retry)
DROP POLICY IF EXISTS "Users can insert their own reports" ON message_reports;
CREATE POLICY "Users can insert their own reports" ON message_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view their own reports" ON message_reports;
CREATE POLICY "Users can view their own reports" ON message_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================================
-- 2. Fix get_messages_v2 RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_messages_v2(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  type TEXT,
  media_urls TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ, -- Keeping signature for compatibility, will return NULL
  is_deleted BOOLEAN,
  deleted_at TIMESTAMPTZ,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
  reply_to_id UUID,
  is_forwarded BOOLEAN,
  original_message_id UUID,
  forward_count INTEGER,
  link_previews JSONB,
  read_by UUID[],
  viewer_has_reported BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_before_ts TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF p_before_id IS NOT NULL THEN
    SELECT m.created_at INTO v_before_ts FROM messages m WHERE m.id = p_before_id;
  END IF;
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.type,
    m.media_urls,
    m.created_at,
    m.updated_at,
    NULL::TIMESTAMPTZ as read_at, 
    m.is_deleted,
    m.deleted_at,
    m.is_edited,
    m.edited_at,
    m.reply_to_id,
    m.is_forwarded,
    m.original_message_id,
    m.forward_count,
    m.link_preview AS link_previews, -- FIX: Alias singular column to plural return
    COALESCE(
      ARRAY(
        SELECT rr.user_id 
        FROM message_read_receipts rr 
        WHERE rr.message_id = m.id
        AND rr.user_id != m.sender_id
      ), 
      ARRAY[]::UUID[]
    ) AS read_by,
    EXISTS (
      SELECT 1 
      FROM message_reports mr 
      WHERE mr.message_id = m.id 
      AND mr.reporter_id = v_user_id
    ) AS viewer_has_reported
  FROM messages m
  WHERE 
    m.conversation_id = p_conversation_id
    AND (p_before_id IS NULL OR m.created_at < v_before_ts)
    AND NOT EXISTS (
      SELECT 1 
      FROM message_hides mh 
      WHERE mh.message_id = m.id 
      AND mh.user_id = v_user_id
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_messages_v2(UUID, INT, UUID) TO authenticated;

-- ============================================================
-- 3. Restore get_mutual_friends RPC and Add Missing Columns
-- ============================================================

-- Ensure profiles table has necessary columns (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'friend_count') THEN
        ALTER TABLE public.profiles ADD COLUMN friend_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'follower_count') THEN
        ALTER TABLE public.profiles ADD COLUMN follower_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_online') THEN
        ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_mutual_friends(p_target_user_id UUID)
RETURNS TABLE(
  friend_id UUID, 
  username TEXT, 
  full_name TEXT, 
  avatar_url TEXT,
  is_online BOOLEAN,
  friend_count INTEGER
) AS $$
  SELECT 
    p.id AS friend_id, 
    p.username, 
    p.full_name, 
    p.avatar_url,
    p.is_online, 
    p.friend_count
  FROM public.friendships f1
  INNER JOIN public.friendships f2 
    ON f1.friend_id = f2.friend_id
  INNER JOIN public.profiles p 
    ON p.id = f1.friend_id
  WHERE f1.user_id = auth.uid() 
    AND f2.user_id = p_target_user_id
    AND f1.status = 'active' 
    AND f2.status = 'active'
    -- Exclude blocked users (bidirectional check)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
  ORDER BY p.full_name NULLS LAST, p.username;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_mutual_friends(UUID) TO authenticated;
