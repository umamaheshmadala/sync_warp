-- ============================================
-- REMAINING STEPS: Indexes, RLS, and Function
-- Run this after tables are created
-- ============================================

-- INDEXES for share_events
CREATE INDEX IF NOT EXISTS idx_share_events_entity ON share_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_created ON share_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_events_method ON share_events(share_method);

-- INDEXES for share_clicks_unified
CREATE INDEX IF NOT EXISTS idx_share_clicks_unified_event ON share_clicks_unified(share_event_id);
CREATE INDEX IF NOT EXISTS idx_share_clicks_unified_dedup ON share_clicks_unified(share_event_id, ip_hash, clicked_at);

-- INDEXES for share_conversions
CREATE INDEX IF NOT EXISTS idx_share_conversions_event ON share_conversions(share_event_id);
CREATE INDEX IF NOT EXISTS idx_share_conversions_user ON share_conversions(converted_user_id);
CREATE INDEX IF NOT EXISTS idx_share_conversions_type ON share_conversions(conversion_type);

-- COMMENTS
COMMENT ON TABLE share_events IS 'Tracks all share events across entity types (storefront, product, offer, profile)';
COMMENT ON TABLE share_clicks_unified IS 'Tracks clicks on shared links with deduplication support';
COMMENT ON TABLE share_conversions IS 'Tracks conversions (favorite, follow, etc.) from shared links';

-- ENABLE RLS
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_clicks_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_conversions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES for share_events
DROP POLICY IF EXISTS "Users can view own shares" ON share_events;
CREATE POLICY "Users can view own shares" ON share_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create shares" ON share_events;
CREATE POLICY "Authenticated users can create shares" ON share_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Business owners can view entity shares" ON share_events;
CREATE POLICY "Business owners can view entity shares" ON share_events FOR SELECT USING (
  (entity_type = 'storefront' AND EXISTS (SELECT 1 FROM businesses b WHERE b.id = entity_id AND b.owner_id = auth.uid()))
  OR (entity_type = 'product' AND EXISTS (SELECT 1 FROM business_products bp JOIN businesses b ON bp.business_id = b.id WHERE bp.id = entity_id AND b.owner_id = auth.uid()))
  OR (entity_type = 'offer' AND EXISTS (SELECT 1 FROM business_offers bo JOIN businesses b ON bo.business_id = b.id WHERE bo.id = entity_id AND b.owner_id = auth.uid()))
  OR (entity_type = 'profile' AND entity_id = auth.uid())
);

-- RLS POLICIES for share_clicks_unified
DROP POLICY IF EXISTS "Users can view clicks on their shares" ON share_clicks_unified;
CREATE POLICY "Users can view clicks on their shares" ON share_clicks_unified FOR SELECT USING (
  EXISTS (SELECT 1 FROM share_events se WHERE se.id = share_clicks_unified.share_event_id AND se.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can track clicks" ON share_clicks_unified;
CREATE POLICY "Anyone can track clicks" ON share_clicks_unified FOR INSERT WITH CHECK (true);

-- RLS POLICIES for share_conversions
DROP POLICY IF EXISTS "Users can view conversions on their shares" ON share_conversions;
CREATE POLICY "Users can view conversions on their shares" ON share_conversions FOR SELECT USING (
  EXISTS (SELECT 1 FROM share_events se WHERE se.id = share_conversions.share_event_id AND se.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can track conversions" ON share_conversions;
CREATE POLICY "Authenticated users can track conversions" ON share_conversions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ANALYTICS FUNCTION
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
    SELECT * FROM share_events WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND created_at BETWEEN p_from_date AND p_to_date
  ),
  stats AS (SELECT COUNT(*) as total_shares, COUNT(DISTINCT user_id) as unique_sharers FROM share_data),
  click_data AS (SELECT COUNT(*) as total_clicks FROM share_clicks_unified sc JOIN share_data sd ON sc.share_event_id = sd.id),
  conversion_data AS (SELECT COUNT(*) as total_conversions FROM share_conversions scv JOIN share_data sd ON scv.share_event_id = sd.id),
  method_breakdown AS (SELECT COALESCE(jsonb_object_agg(share_method, cnt), '{}'::jsonb) as breakdown FROM (SELECT share_method, COUNT(*) as cnt FROM share_data GROUP BY share_method) m),
  daily_shares AS (SELECT COALESCE(jsonb_agg(jsonb_build_object('date', date::text, 'count', cnt) ORDER BY date), '[]'::jsonb) as daily FROM (SELECT DATE(created_at) as date, COUNT(*) as cnt FROM share_data GROUP BY DATE(created_at)) d)
  SELECT jsonb_build_object(
    'totalShares', s.total_shares, 'uniqueSharers', s.unique_sharers, 'totalClicks', cd.total_clicks, 'totalConversions', cvd.total_conversions,
    'clickThroughRate', CASE WHEN s.total_shares > 0 THEN ROUND((cd.total_clicks::NUMERIC / s.total_shares * 100)::numeric, 2) ELSE 0 END,
    'conversionRate', CASE WHEN cd.total_clicks > 0 THEN ROUND((cvd.total_conversions::NUMERIC / cd.total_clicks * 100)::numeric, 2) ELSE 0 END,
    'methodBreakdown', mb.breakdown, 'dailyShares', ds.daily
  ) INTO result FROM stats s CROSS JOIN click_data cd CROSS JOIN conversion_data cvd CROSS JOIN method_breakdown mb CROSS JOIN daily_shares ds;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_share_analytics IS 'Returns aggregated share analytics for an entity';
