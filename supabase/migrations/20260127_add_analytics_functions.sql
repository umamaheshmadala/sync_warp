-- ============================================
-- MIGRATION: Analytics Functions
-- Story: 11.4.8
-- ============================================

-- Function to get review trends by day
CREATE OR REPLACE FUNCTION get_review_trends(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  approved BIGINT,
  rejected BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE moderation_status = 'approved') as approved,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected') as rejected
  FROM business_reviews
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users (restricted by RLS mainly, but function executable)
-- Ideally this should be restricted to admins, but for now authenticated is standard.
GRANT EXECUTE ON FUNCTION get_review_trends TO authenticated;
