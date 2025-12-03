-- Migration: Create analytics RPC functions for share tracking
-- Story: 8.3.4 - Coupon/Deal Sharing Integration
-- Created: 2025-12-03

-- ============================================================================
-- FUNCTION: get_most_shared_coupons
-- ============================================================================
-- Get top shared coupons with metadata for analytics

CREATE OR REPLACE FUNCTION get_most_shared_coupons(limit_count INT DEFAULT 10)
RETURNS TABLE (
  coupon_id UUID,
  share_count BIGINT,
  title TEXT,
  discount_value INT,
  discount_type TEXT,
  brand_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.entity_id::UUID as coupon_id,
    COUNT(*)::BIGINT as share_count,
    c.title,
    c.discount_value,
    c.type as discount_type,
    b.name as brand_name
  FROM shares s
  JOIN coupons c ON s.entity_id = c.id
  LEFT JOIN brands b ON c.brand_id = b.id
  WHERE s.type = 'coupon'
  GROUP BY s.entity_id, c.title, c.discount_value, c.type, b.name
  ORDER BY share_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_most_shared_coupons IS 'Get top shared coupons with share count and metadata';

-- ============================================================================
-- FUNCTION: get_most_shared_deals
-- ============================================================================
-- Get top shared deals/offers with metadata for analytics

CREATE OR REPLACE FUNCTION get_most_shared_deals(limit_count INT DEFAULT 10)
RETURNS TABLE (
  offer_id UUID,
  share_count BIGINT,
  title TEXT,
  price DECIMAL,
  original_price DECIMAL,
  brand_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.entity_id::UUID as offer_id,
    COUNT(*)::BIGINT as share_count,
    o.title,
    o.price,
    o.original_price,
    b.name as brand_name
  FROM shares s
  JOIN offers o ON s.entity_id = o.id
  LEFT JOIN brands b ON o.brand_id = b.id
  WHERE s.type = 'offer'
  GROUP BY s.entity_id, o.title, o.price, o.original_price, b.name
  ORDER BY share_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_most_shared_deals IS 'Get top shared deals/offers with share count and metadata';

-- ============================================================================
-- FUNCTION: get_share_analytics_by_platform
-- ============================================================================
-- Get share distribution by platform for analytics dashboard

CREATE OR REPLACE FUNCTION get_share_analytics_by_platform(
  p_entity_type TEXT DEFAULT NULL,
  p_days_back INT DEFAULT 30
)
RETURNS TABLE (
  share_platform TEXT,
  share_count BIGINT,
  percentage DECIMAL
) AS $$
DECLARE
  v_total_shares BIGINT;
BEGIN
  -- Get total shares for percentage calculation
  SELECT COUNT(*) INTO v_total_shares
  FROM shares
  WHERE (p_entity_type IS NULL OR type = p_entity_type)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  RETURN QUERY
  SELECT 
    s.share_platform,
    COUNT(*)::BIGINT as share_count,
    CASE 
      WHEN v_total_shares > 0 THEN ROUND((COUNT(*)::DECIMAL / v_total_shares) * 100, 2)
      ELSE 0
    END as percentage
  FROM shares s
  WHERE (p_entity_type IS NULL OR s.type = p_entity_type)
    AND s.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY s.share_platform
  ORDER BY share_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_share_analytics_by_platform IS 'Get share distribution by platform (web/ios/android) for analytics';

-- ============================================================================
-- FUNCTION: get_share_analytics_by_method
-- ============================================================================
-- Get share distribution by method for analytics dashboard

CREATE OR REPLACE FUNCTION get_share_analytics_by_method(
  p_entity_type TEXT DEFAULT NULL,
  p_days_back INT DEFAULT 30
)
RETURNS TABLE (
  share_method TEXT,
  share_count BIGINT,
  percentage DECIMAL
) AS $$
DECLARE
  v_total_shares BIGINT;
BEGIN
  -- Get total shares for percentage calculation
  SELECT COUNT(*) INTO v_total_shares
  FROM shares
  WHERE (p_entity_type IS NULL OR type = p_entity_type)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  RETURN QUERY
  SELECT 
    s.share_method,
    COUNT(*)::BIGINT as share_count,
    CASE 
      WHEN v_total_shares > 0 THEN ROUND((COUNT(*)::DECIMAL / v_total_shares) * 100, 2)
      ELSE 0
    END as percentage
  FROM shares s
  WHERE (p_entity_type IS NULL OR s.type = p_entity_type)
    AND s.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY s.share_method
  ORDER BY share_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_share_analytics_by_method IS 'Get share distribution by method (message/share_sheet/etc) for analytics';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================
-- Uncomment to test after migration

-- Test get_most_shared_coupons
-- SELECT * FROM get_most_shared_coupons(5);

-- Test get_most_shared_deals
-- SELECT * FROM get_most_shared_deals(5);

-- Test platform analytics
-- SELECT * FROM get_share_analytics_by_platform('coupon', 30);

-- Test method analytics
-- SELECT * FROM get_share_analytics_by_method('offer', 7);
