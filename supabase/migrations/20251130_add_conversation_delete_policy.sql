-- Add DELETE policy for conversations
-- Allow users to delete conversations they're participants in

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete conversations they're part of" ON public.conversations;

-- Create DELETE policy
CREATE POLICY "Users can delete conversations they're part of"
  ON public.conversations FOR DELETE
  USING (auth.uid() = ANY(participants));

-- Add comment
COMMENT ON POLICY "Users can delete conversations they're part of" ON public.conversations IS 
  'Allow users to delete conversations they are participants in';
