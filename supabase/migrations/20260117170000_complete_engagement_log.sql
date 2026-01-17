-- VERSION 5 (COMPLETE):
-- 1. Shares: Created_at
-- 2. Check-ins: Created_at
-- 3. Reviews: Recommendation + Created_at
-- 4. Redemptions: Redeemed_at
-- 5. Favorites (Offers): Joined with offers table
-- 6. Favorites (Products): Joined with business_products table

CREATE OR REPLACE FUNCTION get_business_engagement_log(
  p_business_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- 1. Shares (Storefront Only)
  SELECT 
    s.id as event_id,
    'share' as event_type,
    s.user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    concat('Shared ', s.entity_type, ' via ', s.share_method) as details,
    jsonb_build_object(
      'entity_id', s.entity_id, 
      'entity_type', s.entity_type,
      'share_method', s.share_method
    ) as metadata,
    s.created_at
  FROM share_events s
  JOIN profiles p ON p.id = s.user_id
  WHERE 
     s.entity_type = 'storefront' AND s.entity_id = p_business_id
  
  UNION ALL
  
  -- 2. Check-ins
  SELECT 
    c.id,
    'checkin',
    c.user_id,
    p.full_name,
    p.avatar_url,
    'Checked in at location' as details,
    jsonb_build_object('location', 'main') as metadata,
    c.created_at
  FROM checkins c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.business_id = p_business_id
  
  UNION ALL
  
  -- 3. Reviews
  SELECT 
    r.id,
    'review',
    r.user_id,
    p.full_name,
    p.avatar_url,
    CASE WHEN r.recommendation THEN 'Recommended business' ELSE 'Did not recommend' END as details,
    jsonb_build_object(
      'recommendation', r.recommendation, 
      'review_text', r.review_text
    ) as metadata,
    r.created_at
  FROM business_reviews r
  JOIN profiles p ON p.id = r.user_id
  WHERE r.business_id = p_business_id
  
  UNION ALL
  
  -- 4. Redemptions
  SELECT 
    cr.id,
    'redemption',
    cr.user_id,
    p.full_name,
    p.avatar_url,
    concat('Redeemed coupon (₹', cr.redemption_amount, ' saved)') as details,
    jsonb_build_object(
      'amount', cr.redemption_amount, 
      'coupon_code', cr.redemption_code,
      'original_amount', cr.original_amount
    ) as metadata,
    cr.redeemed_at as created_at
  FROM coupon_redemptions cr
  JOIN profiles p ON p.id = cr.user_id
  WHERE cr.business_id = p_business_id

  UNION ALL

  -- 5. Favorite Offers
  SELECT
    f.id,
    'favorite_offer' as event_type,
    f.user_id,
    p.full_name,
    p.avatar_url,
    concat('Favorited offer: ', o.title) as details,
    jsonb_build_object(
      'offer_id', o.id,
      'offer_title', o.title
    ) as metadata,
    f.created_at
  FROM user_favorites f
  JOIN profiles p ON p.id = f.user_id
  JOIN offers o ON f.item_id = o.id
  WHERE f.item_type = 'offer' AND o.business_id = p_business_id

  UNION ALL

  -- 6. Favorite Products
  SELECT
    f.id,
    'favorite_product' as event_type,
    f.user_id,
    p.full_name,
    p.avatar_url,
    concat('Favorited product: ', bp.name) as details,
    jsonb_build_object(
      'product_id', bp.id,
      'product_name', bp.name,
      'product_price', bp.price
    ) as metadata,
    f.created_at
  FROM user_favorites f
  JOIN profiles p ON p.id = f.user_id
  JOIN business_products bp ON f.item_id = bp.id
  WHERE f.item_type = 'product' AND bp.business_id = p_business_id
  
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
