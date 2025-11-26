-- ============================================
-- STORY 9.2.2: PYMK Engine - Missing Components
-- Create dismissed_pymk_suggestions table and cleanup function
-- ============================================

-- Table: dismissed_pymk_suggestions
-- Stores users' dismissed PYMK suggestions to avoid showing them again
CREATE TABLE IF NOT EXISTS public.dismissed_pymk_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggested_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure a user can only dismiss a suggestion once
  UNIQUE(user_id, suggested_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dismissed_pymk_user_id 
  ON public.dismissed_pymk_suggestions(user_id);

CREATE INDEX IF NOT EXISTS idx_dismissed_pymk_suggested_user_id 
  ON public.dismissed_pymk_suggestions(suggested_user_id);

CREATE INDEX IF NOT EXISTS idx_dismissed_pymk_dismissed_at 
  ON public.dismissed_pymk_suggestions(dismissed_at);

-- RLS Policies
ALTER TABLE public.dismissed_pymk_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own dismissed suggestions
CREATE POLICY "Users can view own dismissed suggestions"
  ON public.dismissed_pymk_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own dismissals
CREATE POLICY "Users can dismiss suggestions"
  ON public.dismissed_pymk_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own dismissals (to re-enable suggestions)
CREATE POLICY "Users can delete own dismissals"
  ON public.dismissed_pymk_suggestions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Function: cleanup_dismissed_pymk
-- Removes dismissed suggestions older than 90 days
-- Should be run periodically (e.g., daily via cron)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_dismissed_pymk()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.dismissed_pymk_suggestions
  WHERE dismissed_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_dismissed_pymk() TO authenticated;

-- ============================================
-- Optional: Schedule cleanup (if pg_cron is available)
-- ============================================
-- Note: Uncomment if pg_cron extension is enabled
-- SELECT cron.schedule(
--   'cleanup-dismissed-pymk',
--   '0 3 * * *', -- Daily at 3 AM
--   $$SELECT cleanup_dismissed_pymk();$$
-- );

-- Success message
SELECT 'dismissed_pymk_suggestions table and cleanup function created successfully' AS status;
