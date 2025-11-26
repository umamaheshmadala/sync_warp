-- ============================================
-- STORY 9.2.4: Search Filters & Advanced Search
-- Create deals, favorite_deals tables and search_users_with_filters function
-- ============================================

-- 1. Create deals table (Minimal for filters)
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_deals_category ON public.deals(category);

-- 2. Create favorite_deals table (User interests)
CREATE TABLE IF NOT EXISTS public.favorite_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_favorite_deals_user_deal ON public.favorite_deals(user_id, deal_id);

-- RLS Policies
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_deals ENABLE ROW LEVEL SECURITY;

-- Deals are public
CREATE POLICY "Deals are viewable by everyone" 
  ON public.deals FOR SELECT USING (true);

-- Users manage their own favorites
CREATE POLICY "Users can view own favorites" 
  ON public.favorite_deals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" 
  ON public.favorite_deals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" 
  ON public.favorite_deals FOR DELETE USING (auth.uid() = user_id);

-- 3. Create search_users_with_filters function
CREATE OR REPLACE FUNCTION search_users_with_filters(
  search_query TEXT,
  current_user_id UUID,
  filter_location_lat FLOAT DEFAULT NULL,
  filter_location_lng FLOAT DEFAULT NULL,
  filter_location_radius_km INT DEFAULT NULL,
  filter_require_mutual_friends BOOLEAN DEFAULT FALSE,
  filter_shared_interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  location TEXT,
  mutual_friends_count BIGINT, -- Changed to BIGINT to match search_users
  distance_km NUMERIC,         -- Changed to NUMERIC to match search_users
  relevance_score NUMERIC      -- Changed to NUMERIC to match search_users
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  filter_location GEOGRAPHY;
BEGIN
  -- Create geography point from coordinates if provided
  IF filter_location_lat IS NOT NULL AND filter_location_lng IS NOT NULL THEN
    filter_location := ST_MakePoint(filter_location_lng, filter_location_lat)::geography;
  END IF;

  RETURN QUERY
  WITH base_results AS (
    -- Get base search results (more than requested to account for filtering)
    SELECT * FROM search_users(search_query, current_user_id, limit_count * 3, 0)
  )
  SELECT *
  FROM base_results
  WHERE
    -- Location filter: within specified radius
    (
      filter_location IS NULL 
      OR filter_location_radius_km IS NULL 
      OR distance_km IS NULL
      OR distance_km <= filter_location_radius_km
    )
    -- Mutual friends filter: must have at least one mutual friend
    AND (
      NOT filter_require_mutual_friends 
      OR mutual_friends_count > 0
    )
    -- Shared interests filter: user has favorited deals in specified categories
    AND (
      filter_shared_interests IS NULL
      OR array_length(filter_shared_interests, 1) IS NULL
      OR base_results.user_id IN (
        SELECT DISTINCT fd.user_id
        FROM favorite_deals fd
        JOIN deals d ON d.id = fd.deal_id
        WHERE d.category = ANY(filter_shared_interests)
      )
    )
  ORDER BY relevance_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Success message
SELECT 'search_users_with_filters function and tables created successfully' AS status;
