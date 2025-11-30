-- Fix RLS policies for conversation filtering
-- Story 8.10.1: Allow users to update archive/pin status

-- The existing UPDATE policy only uses USING clause
-- We need to add WITH CHECK clause to allow updates

DROP POLICY IF EXISTS "Users can update conversations they're part of" ON public.conversations;

CREATE POLICY "Users can update conversations they're part of"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = ANY(participants))
  WITH CHECK (auth.uid() = ANY(participants));

-- Grant explicit UPDATE permission on specific columns
GRANT UPDATE (is_archived, archived_at, is_pinned, pinned_at, is_muted) 
  ON public.conversations 
  TO authenticated;

COMMENT ON POLICY "Users can update conversations they're part of" ON public.conversations IS 
  'Story 8.10.1: Allow users to update archive/pin status for their conversations';
