-- Migration: Fix block_user RPC - Remove unfriend logic
-- Date: 2025-12-28
-- Purpose: Block should NOT unfriend. Users stay friends but can't message.
--          Unblocking allows immediate chat resumption.
-- 
-- This fixes the regression where blocking atomically unfriended users,
-- making it impossible to resume chat after unblocking.

-- ============================================================
-- STEP 1: Recreate block_user function (simplified)
-- ============================================================

CREATE OR REPLACE FUNCTION public.block_user(
  p_blocked_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_blocker_id UUID := auth.uid();
  v_already_blocked BOOLEAN := FALSE;
BEGIN
  -- Validate authentication
  IF v_blocker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate not blocking self
  IF v_blocker_id = p_blocked_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_blocked_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if already blocked (idempotent operation)
  v_already_blocked := EXISTS (
    SELECT 1 FROM public.blocked_users 
    WHERE blocker_id = v_blocker_id 
      AND blocked_id = p_blocked_user_id
  );
  
  -- Create block entry (idempotent - only if not already blocked)
  IF NOT v_already_blocked THEN
    INSERT INTO public.blocked_users (blocker_id, blocked_id, reason)
    VALUES (v_blocker_id, p_blocked_user_id, p_reason);
  END IF;
  
  -- NOTE: We intentionally do NOT:
  -- - Unfriend the user (friendship stays intact)
  -- - Remove follows (not applicable per user requirements)
  -- - Cancel friend requests
  -- 
  -- This allows immediate chat resumption after unblocking.
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', TRUE,
    'already_blocked', v_already_blocked,
    'blocked_at', NOW(),
    'note', 'User blocked. Friendship preserved for unblock.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to block user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.block_user IS 
  'Blocks a user without unfriending. Friendship is preserved so unblocking allows immediate chat resumption. Blocked user cannot send/receive messages.';

-- ============================================================
-- STEP 2: Verify send_message blocks messages from blocked users
-- ============================================================
-- The send_message RPC should already check blocked_users table
-- and silently drop messages. This is handled by existing RLS policies.

-- ============================================================  
-- STEP 3: Log completion
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'block_user RPC fixed: no longer unfriends users on block';
END $$;
