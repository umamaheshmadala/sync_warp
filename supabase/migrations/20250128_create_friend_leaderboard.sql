-- =====================================================
-- Story 9.7.4: Friend Leaderboard
-- =====================================================
-- Created: 2025-11-28
-- Purpose: Gamified friend leaderboard ranking friends by engagement
--          Initial metric: Offers favorited ("deals found")
--          Designed for future expansion to multi-metric business driver identification
-- =====================================================

-- =====================================================
-- RPC Function: get_friend_leaderboard
-- =====================================================
-- Returns a leaderboard of friends ranked by the number of offers they've favorited
-- Supports time range filtering: 'week', 'month', 'all'
-- Future-ready: Structure supports adding review_count, share_count, total_score

CREATE OR REPLACE FUNCTION get_friend_leaderboard(
  time_range TEXT DEFAULT 'month',
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  deal_count BIGINT
) AS $$
DECLARE
  time_filter TIMESTAMPTZ;
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Determine time filter based on range
  time_filter := CASE time_range
    WHEN 'week' THEN NOW() - INTERVAL '7 days'
    WHEN 'month' THEN NOW() - INTERVAL '30 days'
    ELSE '1970-01-01'::TIMESTAMPTZ  -- All time
  END;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    COUNT(f.id)::BIGINT as deal_count
  FROM profiles p
  -- Join with friendships to get only friends of current user
  INNER JOIN friendships fr ON (
    (fr.friend_id = p.id AND fr.user_id = current_user_id) OR
    (fr.user_id = p.id AND fr.friend_id = current_user_id)
  ) AND fr.status = 'active'
  -- Left join with favorites to count offers favorited
  LEFT JOIN favorites f ON f.user_id = p.id 
    AND f.entity_type = 'offer'
    AND f.created_at >= time_filter
  GROUP BY p.id, p.full_name, p.username, p.avatar_url
  HAVING COUNT(f.id) > 0  -- Only include friends who have favorited offers
  ORDER BY deal_count DESC, p.full_name ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_friend_leaderboard TO authenticated;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION get_friend_leaderboard IS 
  'Returns friend leaderboard ranked by offers favorited. Supports time range filtering (week, month, all). Uses auth.uid() internally for current user. Future-ready for multi-metric expansion (reviews, shares, purchases).';

-- =====================================================
-- Future Expansion Notes
-- =====================================================
-- To add new metrics (Phase 2):
-- 1. Add columns to RETURNS TABLE: review_count BIGINT, share_count BIGINT, total_score BIGINT
-- 2. Add LEFT JOINs for business_reviews and shares tables
-- 3. Calculate counts in SELECT clause
-- 4. Implement weighted scoring algorithm for total_score
-- 
-- Example for business driver identification:
-- total_score = (purchases * 10) + (positive_reviews * 5) + (shares * 3) + (favorites * 1)
-- =====================================================

-- Migration Complete! ✅
