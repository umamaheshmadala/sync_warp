-- Migration: Fix Offer Analytics Realtime Tracking
-- Date: 2026-01-30
-- Description: Creates offer_views table and offer_analytics summary table with triggers for real-time updates.
-- UPDATED: Now aggregates from share_events and share_clicks_unified to match unifiedShareService.

-- 1. Create offer_views table
CREATE TABLE IF NOT EXISTS offer_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id),
    viewer_ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_views_offer_id ON offer_views(offer_id);
ALTER TABLE offer_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert offer views" ON offer_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Business owners can view their offer views" ON offer_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM offers WHERE offers.id = offer_views.offer_id AND offers.business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    ))
);

-- 2. Create/Ensure offer_analytics table
CREATE TABLE IF NOT EXISTS offer_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id),
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    daily_stats JSONB DEFAULT '[]'::jsonb,
    share_channels JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT offer_analytics_offer_id_key UNIQUE(offer_id)
);

ALTER TABLE offer_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view offer analytics" ON offer_analytics FOR SELECT USING (true);

-- 3. Function to aggregate analytics
CREATE OR REPLACE FUNCTION refresh_offer_analytics(p_offer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_business_id UUID;
    v_total_views INT;
    v_unique_views INT;
    v_total_shares INT;
    v_total_clicks INT;
    v_daily_stats JSONB;
    v_share_channels JSONB;
BEGIN
    -- Get Business ID safely
    SELECT business_id INTO v_business_id FROM offers WHERE id = p_offer_id;
    IF v_business_id IS NULL THEN RETURN; END IF;

    -- Calculate Totals
    SELECT COUNT(*), COUNT(DISTINCT CASE WHEN viewer_id IS NOT NULL THEN viewer_id ELSE NULL END) 
    INTO v_total_views, v_unique_views 
    FROM offer_views WHERE offer_id = p_offer_id;
    
    -- Count shares from unified share_events
    -- NOTE: share_events.entity_id is UUID, so no casting needed for p_offer_id
    SELECT COUNT(*) INTO v_total_shares 
    FROM share_events 
    WHERE entity_type = 'offer' AND entity_id = p_offer_id;

    -- Count clicks from unified share_clicks_unified joining with share_events
    SELECT COUNT(*) INTO v_total_clicks 
    FROM share_clicks_unified sc
    JOIN share_events se ON sc.share_event_id = se.id
    WHERE se.entity_type = 'offer' AND se.entity_id = p_offer_id;

    -- Calculate Daily Stats
    WITH daily_counts AS (
        SELECT date_trunc('day', created_at)::date as day, count(*) as views, 0 as shares, 0 as clicks 
        FROM offer_views WHERE offer_id = p_offer_id GROUP BY 1
        UNION ALL
        SELECT date_trunc('day', created_at)::date as day, 0, count(*), 0 
        FROM share_events 
        WHERE entity_type = 'offer' AND entity_id = p_offer_id 
        GROUP BY 1
        UNION ALL
        SELECT date_trunc('day', sc.clicked_at)::date as day, 0, 0, count(*) 
        FROM share_clicks_unified sc
        JOIN share_events se ON sc.share_event_id = se.id
        WHERE se.entity_type = 'offer' AND se.entity_id = p_offer_id
        GROUP BY 1
    ),
    aggregated_daily AS (
        SELECT day, sum(views) as views, sum(shares) as shares, sum(clicks) as clicks 
        FROM daily_counts GROUP BY day ORDER BY day
    )
    SELECT jsonb_agg(jsonb_build_object(
        'date', day,
        'views', views,
        'shares', shares,
        'clicks', clicks
    )) INTO v_daily_stats FROM aggregated_daily;

    -- Calculate Share Channels
    SELECT jsonb_object_agg(share_method, count) INTO v_share_channels
    FROM (
        SELECT share_method, count(*) as count 
        FROM share_events 
        WHERE entity_type = 'offer' AND entity_id = p_offer_id 
        GROUP BY 1
    ) t;

    -- Update offer_analytics
    INSERT INTO offer_analytics (
        offer_id, business_id, total_views, unique_viewers, 
        total_shares, total_clicks, daily_stats, share_channels, updated_at
    ) VALUES (
        p_offer_id, v_business_id, v_total_views, v_unique_views, 
        v_total_shares, v_total_clicks, COALESCE(v_daily_stats, '[]'::jsonb), COALESCE(v_share_channels, '{}'::jsonb), NOW()
    )
    ON CONFLICT (offer_id) DO UPDATE SET
        total_views = EXCLUDED.total_views,
        unique_viewers = EXCLUDED.unique_viewers,
        total_shares = EXCLUDED.total_shares,
        total_clicks = EXCLUDED.total_clicks,
        daily_stats = EXCLUDED.daily_stats,
        share_channels = EXCLUDED.share_channels,
        updated_at = NOW();

    -- Update offers table cache (for quick listing access)
    UPDATE offers SET
        view_count = v_total_views,
        share_count = v_total_shares,
        click_count = v_total_clicks
    WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers
-- View Trigger
CREATE OR REPLACE FUNCTION trigger_refresh_analytics_view() RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_offer_analytics(NEW.offer_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_offer_view_insert ON offer_views;
CREATE TRIGGER on_offer_view_insert AFTER INSERT ON offer_views
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics_view();

-- Share Trigger (Unified)
CREATE OR REPLACE FUNCTION trigger_refresh_analytics_share_unified() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entity_type = 'offer' THEN
        -- entity_id is already UUID in share_events
        PERFORM refresh_offer_analytics(NEW.entity_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_share_event_insert_offer ON share_events;
CREATE TRIGGER on_share_event_insert_offer AFTER INSERT ON share_events
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics_share_unified();

-- Click Trigger (Unified)
CREATE OR REPLACE FUNCTION trigger_refresh_analytics_click_unified() RETURNS TRIGGER AS $$
DECLARE
    v_entity_type TEXT;
    v_entity_id UUID; -- Changed from TEXT to UUID
BEGIN
    SELECT entity_type, entity_id INTO v_entity_type, v_entity_id
    FROM share_events WHERE id = NEW.share_event_id;
    
    IF v_entity_type = 'offer' THEN
        PERFORM refresh_offer_analytics(v_entity_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_share_click_insert_offer ON share_clicks_unified;
CREATE TRIGGER on_share_click_insert_offer AFTER INSERT ON share_clicks_unified
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics_click_unified();

-- 5. Helper RPC to track view from Client
CREATE OR REPLACE FUNCTION track_offer_view(p_offer_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO offer_views (offer_id, viewer_id, created_at)
    VALUES (p_offer_id, auth.uid(), NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
