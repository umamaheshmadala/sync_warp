-- ============================================
-- MIGRATION: Business Review Analytics
-- Story: 11.3.4
-- ============================================

-- Daily review aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_review_stats AS
SELECT 
  business_id,
  DATE(created_at) AS review_date,
  COUNT(*) AS review_count,
  SUM(CASE WHEN recommendation THEN 1 ELSE 0 END) AS recommend_count,
  SUM(CASE WHEN NOT recommendation THEN 1 ELSE 0 END) AS not_recommend_count,
  AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100 AS recommendation_rate
FROM business_reviews
WHERE deleted_at IS NULL
GROUP BY business_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats ON mv_daily_review_stats(business_id, review_date);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_review_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_review_stats;
END;
$$ LANGUAGE plpgsql;

-- Category averages
CREATE OR REPLACE FUNCTION get_category_averages(p_category TEXT)
RETURNS TABLE (
  avg_recommendation_rate NUMERIC,
  avg_response_rate NUMERIC,
  avg_response_time_hours NUMERIC,
  total_businesses INTEGER,
  total_reviews INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(br_stats.recommendation_rate) AS avg_recommendation_rate,
    AVG(br_stats.response_rate) AS avg_response_rate,
    AVG(br_stats.avg_response_hours) AS avg_response_time_hours,
    COUNT(DISTINCT b.id)::INTEGER AS total_businesses,
    SUM(br_stats.review_count)::INTEGER AS total_reviews
  FROM businesses b
  JOIN LATERAL (
    SELECT 
      COUNT(*) AS review_count,
      AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100 AS recommendation_rate,
      AVG(CASE WHEN brr.id IS NOT NULL THEN 1 ELSE 0 END) * 100 AS response_rate,
      AVG(EXTRACT(EPOCH FROM (brr.created_at - br.created_at)) / 3600) AS avg_response_hours
    FROM business_reviews br
    LEFT JOIN business_review_responses brr ON brr.review_id = br.id
    WHERE br.business_id = b.id AND br.deleted_at IS NULL
  ) br_stats ON true
  WHERE b.category = p_category;
END;
$$ LANGUAGE plpgsql;

-- Tag analysis for a business
CREATE OR REPLACE FUNCTION get_business_tag_analysis(
  p_business_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  tag TEXT,
  count INTEGER,
  is_positive BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(tags) AS tag,
    COUNT(*)::INTEGER AS count,
    -- Determine if tag is positive based on recommendation correlation
    AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) > 0.5 AS is_positive
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
    AND tags IS NOT NULL
  GROUP BY unnest(tags)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Peak review times heatmap data
CREATE OR REPLACE FUNCTION get_review_time_heatmap(p_business_id UUID)
RETURNS TABLE (
  day_of_week INTEGER, -- 0=Sunday
  hour_of_day INTEGER,
  review_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DOW FROM created_at)::INTEGER AS day_of_week,
    EXTRACT(HOUR FROM created_at)::INTEGER AS hour_of_day,
    COUNT(*)::INTEGER AS review_count
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at > NOW() - INTERVAL '1 year'
  GROUP BY EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at);
END;
$$ LANGUAGE plpgsql;

-- Business review analytics aggregate
CREATE OR REPLACE FUNCTION get_business_review_analytics(
  p_business_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_rate NUMERIC;
  previous_rate NUMERIC;
  response_data RECORD;
BEGIN
  -- Current recommendation rate
  SELECT AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100
  INTO current_rate
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
  
  -- Previous period rate
  SELECT AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100
  INTO previous_rate
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at BETWEEN 
      NOW() - (p_days * 2 || ' days')::INTERVAL 
      AND NOW() - (p_days || ' days')::INTERVAL;
  
  -- Response metrics
  SELECT 
    AVG(CASE WHEN brr.id IS NOT NULL THEN 1 ELSE 0 END) * 100 AS response_rate,
    AVG(EXTRACT(EPOCH FROM (brr.created_at - br.created_at)) / 3600) AS avg_response_hours,
    COUNT(*) FILTER (WHERE brr.id IS NULL) AS unreplied_count
  INTO response_data
  FROM business_reviews br
  LEFT JOIN business_review_responses brr ON brr.review_id = br.id
  WHERE br.business_id = p_business_id
    AND br.deleted_at IS NULL;
  
  SELECT json_build_object(
    'recommendation_rate', COALESCE(current_rate, 0),
    'previous_rate', COALESCE(previous_rate, 0),
    'trend', CASE 
      WHEN current_rate > previous_rate THEN 'improving'
      WHEN current_rate < previous_rate THEN 'declining'
      ELSE 'stable'
    END,
    'response_rate', COALESCE(response_data.response_rate, 0),
    'avg_response_hours', COALESCE(response_data.avg_response_hours, 0),
    'unreplied_count', COALESCE(response_data.unreplied_count, 0)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
