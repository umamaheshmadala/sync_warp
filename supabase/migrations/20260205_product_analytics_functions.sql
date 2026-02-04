-- =====================================================================================
-- Migration: Product Analytics System
-- Description: Adds product_views tracking table and RPCs for the business dashboard.
-- Story: 12.14
-- =====================================================================================

-- 1. Create product_views table
CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for anonymous
  session_id TEXT, -- For anonymous tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent excessive row bloat if needed, but for now we keep logs.
  -- Add simple validation
  CONSTRAINT valid_session_or_user CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_date ON product_views(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_product_views_business ON product_views(product_id) INCLUDE (created_at); -- Helper for business aggregation if joining

-- Dedupe views from same user/session within 1 hour
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_views_unique 
ON product_views(product_id, COALESCE(user_id::text, session_id), date_trunc('hour', created_at AT TIME ZONE 'UTC'));

-- Enable RLS
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon/authenticated) to insert views
CREATE POLICY "Anyone can insert product views" ON product_views
  FOR INSERT
  WITH CHECK (true);

-- Allow business owners to read views for their products
-- This is complex via RLS, usually better handled via Business Owner RPCs or Service Role.
-- But for direct aggregation, we might rely on the RPCs below.

-- 2. RPC: Get Top Products by View Count
CREATE OR REPLACE FUNCTION get_top_products_by_views(
  p_business_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  view_count BIGINT,
  like_count INTEGER,
  comment_count INTEGER,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COUNT(pv.id) as view_count,
    p.like_count,
    p.comment_count,
    -- Get first image from JSONB array safely
    (p.images->0->>'url')::TEXT as image_url
  FROM products p
  LEFT JOIN product_views pv ON p.id = pv.product_id
  WHERE p.business_id = p_business_id
    AND p.status = 'published'
  GROUP BY p.id, p.name, p.like_count, p.comment_count, p.images
  ORDER BY view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. RPC: Get Top Products by Engagement (Likes + Comments + Shares)
CREATE OR REPLACE FUNCTION get_top_products_by_engagement(
  p_business_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  engagement_score BIGINT,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    (COALESCE(p.like_count, 0) + COALESCE(p.comment_count, 0) + COALESCE(p.share_count, 0))::BIGINT as engagement_score,
    p.like_count,
    p.comment_count,
    p.share_count,
    (p.images->0->>'url')::TEXT as image_url
  FROM products p
  WHERE p.business_id = p_business_id
    AND p.status = 'published'
  ORDER BY engagement_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Get Analytics Overview (Totals for last X days)
-- Optimised to single query
CREATE OR REPLACE FUNCTION get_product_analytics_summary(
  p_business_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_views BIGINT,
  total_likes BIGINT,
  total_comments BIGINT,
  total_shares BIGINT,
  period_start TIMESTAMPTZ
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := NOW() - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH business_products AS (
      SELECT id FROM products WHERE business_id = p_business_id
  )
  SELECT 
    -- Count views created in period
    (SELECT COUNT(*) FROM product_views pv 
     WHERE pv.product_id IN (SELECT id FROM business_products) 
     AND pv.created_at >= v_start_date
    ) as total_views,
    
    -- Sum current counts (Approximation: total lifetime counts matching UI expectation,
    -- or if we had history tables we'd filter by date. 
    -- For MVP, we often show "Total Engagement" vs "Views in Period". 
    -- Let's stick to Totals as per schema limits unless we have event logs for likes.)
    (SELECT COALESCE(SUM(like_count), 0)::BIGINT FROM products WHERE business_id = p_business_id) as total_likes,
    (SELECT COALESCE(SUM(comment_count), 0)::BIGINT FROM products WHERE business_id = p_business_id) as total_comments,
    (SELECT COALESCE(SUM(share_count), 0)::BIGINT FROM products WHERE business_id = p_business_id) as total_shares,
    
    v_start_date as period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
