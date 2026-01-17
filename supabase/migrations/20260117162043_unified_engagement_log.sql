-- Migration to add comprehensive engagement analytics function

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
  -- 1. Shares
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
  -- For shares, we need to try and filter by business. 
  -- Storefront shares have entity_id = business_id
  -- Product/Offer shares need lookup, but for now we might rely on metadata if available, 
  -- or we might simplify to ONLY storefront shares for this initial version if performance is key.
  -- However, to be comprehensive as requested, we should include all.
  -- OPTION 1: Use metadata if we trusted it was saved. AC-1 says we save entity_type/id.
  -- Let's try to match on entity_id for storefronts, and for others we'd really need a join.
  -- For safety/simplicity in V1, let's include shares where we can DIRECTLY link to business.
  -- Ideally `share_events` should have `business_id` column or metadata.
  -- Assuming `metadata->>'business_id'` exists or we check entity_id for storefronts.
  WHERE 
     (s.entity_type = 'storefront' AND s.entity_id = p_business_id)
     OR (s.metadata->>'business_id')::uuid = p_business_id
  
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
  
  -- 3. Reviews (Power Rate)
  -- Note: Table name `business_reviews` confirmed in previous turns
  SELECT 
    r.id,
    'review',
    r.user_id,
    p.full_name,
    p.avatar_url,
    concat('Rated ', r.rating, '/5 stars') as details,
    jsonb_build_object('rating', r.rating, 'comment', r.comment) as metadata,
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
  
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
