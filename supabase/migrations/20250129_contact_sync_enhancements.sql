-- ============================================
-- STORY 9.2.7: Contact Sync Enhancements
-- Analytics, Background Sync Support, and Settings Integration
-- ============================================

-- 1. Add last_sync_at timestamp to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_contact_sync_at TIMESTAMPTZ;

-- 2. Create analytics table for sync events
CREATE TABLE IF NOT EXISTS public.contact_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'completed', 'failed')),
  contacts_count INT,
  matches_found INT,
  duration_ms INT,
  error_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_contact_sync_events_user ON public.contact_sync_events(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_sync_events_type ON public.contact_sync_events(event_type);
CREATE INDEX IF NOT EXISTS idx_contact_sync_events_created ON public.contact_sync_events(created_at DESC);

-- RLS Policies
ALTER TABLE public.contact_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync events"
  ON public.contact_sync_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync events"
  ON public.contact_sync_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Function to log sync event (Called by service layer)
CREATE OR REPLACE FUNCTION public.log_contact_sync_event(
  p_event_type TEXT,
  p_contacts_count INT DEFAULT NULL,
  p_matches_found INT DEFAULT NULL,
  p_duration_ms INT DEFAULT NULL,
  p_error_type TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.contact_sync_events (
    user_id,
    event_type,
    contacts_count,
    matches_found,
    duration_ms,
    error_type
  )
  VALUES (
    auth.uid(),
    p_event_type,
    p_contacts_count,
    p_matches_found,
    p_duration_ms,
    p_error_type
  );

  -- Update last sync timestamp on profile if completed
  IF p_event_type = 'completed' THEN
    UPDATE public.profiles
    SET last_contact_sync_at = NOW()
    WHERE id = auth.uid();
  END IF;
END;
$$;

-- 4. Analytics Query: Get sync success rate
CREATE OR REPLACE FUNCTION public.get_sync_success_rate(
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  total_syncs BIGINT,
  successful_syncs BIGINT,
  failed_syncs BIGINT,
  success_rate FLOAT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE event_type = 'completed') as successful_syncs,
    COUNT(*) FILTER (WHERE event_type = 'failed') as failed_syncs,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE event_type = 'completed')::FLOAT / COUNT(*)::FLOAT * 100)
      ELSE 0
    END as success_rate
  FROM public.contact_sync_events
  WHERE 
    user_id = auth.uid()
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- 5. Analytics Query: Get average match rate
CREATE OR REPLACE FUNCTION public.get_average_match_rate(
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  avg_contacts FLOAT,
  avg_matches FLOAT,
  avg_match_rate FLOAT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG(contacts_count), 0)::FLOAT as avg_contacts,
    COALESCE(AVG(matches_found), 0)::FLOAT as avg_matches,
    CASE 
      WHEN AVG(contacts_count) > 0 THEN (AVG(matches_found)::FLOAT / AVG(contacts_count)::FLOAT * 100)
      ELSE 0
    END as avg_match_rate
  FROM public.contact_sync_events
  WHERE 
    user_id = auth.uid()
    AND event_type = 'completed'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

SELECT 'Contact sync enhancements applied successfully' AS status;
