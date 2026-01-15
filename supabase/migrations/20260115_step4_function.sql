-- ============================================
-- STEP 4: CREATE ANALYTICS FUNCTION (Run after Step 3)
-- ============================================

CREATE OR REPLACE FUNCTION get_share_analytics(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH share_data AS (
    SELECT * FROM share_events
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND created_at BETWEEN p_from_date AND p_to_date
  ),
  stats AS (
    SELECT
      COUNT(*) as total_shares,
      COUNT(DISTINCT user_id) as unique_sharers
    FROM share_data
  ),
  click_data AS (
    SELECT COUNT(*) as total_clicks
    FROM share_clicks_unified sc
    JOIN share_data sd ON sc.share_event_id = sd.id
  ),
  conversion_data AS (
    SELECT COUNT(*) as total_conversions
    FROM share_conversions scv
    JOIN share_data sd ON scv.share_event_id = sd.id
  ),
  method_breakdown AS (
    SELECT COALESCE(jsonb_object_agg(share_method, cnt), '{}'::jsonb) as breakdown
    FROM (
      SELECT share_method, COUNT(*) as cnt
      FROM share_data
      GROUP BY share_method
    ) m
  ),
  daily_shares AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('date', date::text, 'count', cnt)
      ORDER BY date
    ), '[]'::jsonb) as daily
    FROM (
      SELECT DATE(created_at) as date, COUNT(*) as cnt
      FROM share_data
      GROUP BY DATE(created_at)
    ) d
  )
  SELECT jsonb_build_object(
    'totalShares', s.total_shares,
    'uniqueSharers', s.unique_sharers,
    'totalClicks', cd.total_clicks,
    'totalConversions', cvd.total_conversions,
    'clickThroughRate', CASE WHEN s.total_shares > 0 THEN ROUND((cd.total_clicks::NUMERIC / s.total_shares * 100)::numeric, 2) ELSE 0 END,
    'conversionRate', CASE WHEN cd.total_clicks > 0 THEN ROUND((cvd.total_conversions::NUMERIC / cd.total_clicks * 100)::numeric, 2) ELSE 0 END,
    'methodBreakdown', mb.breakdown,
    'dailyShares', ds.daily
  ) INTO result
  FROM stats s
  CROSS JOIN click_data cd
  CROSS JOIN conversion_data cvd
  CROSS JOIN method_breakdown mb
  CROSS JOIN daily_shares ds;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_share_analytics IS 'Returns aggregated share analytics for an entity';
