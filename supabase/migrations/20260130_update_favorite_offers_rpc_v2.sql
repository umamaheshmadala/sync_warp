-- Migration: Update get_user_favorite_offers to include category, offer type info AND audit_code
-- Created: 2026-01-30
-- Description: Updates the RPC to return category_name, offer_type_name, and audit_code for UI consistency

DROP FUNCTION IF EXISTS get_user_favorite_offers(UUID);

CREATE OR REPLACE FUNCTION get_user_favorite_offers(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  offer_code TEXT,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  business_id UUID,
  business_name TEXT,
  business_logo TEXT,
  icon_image_url TEXT,
  favorited_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER,
  share_count INTEGER,
  offer_type_name TEXT,
  category_name TEXT,
  audit_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.title,
    o.description,
    o.offer_code::TEXT,
    o.valid_from,
    o.valid_until,
    o.business_id,
    b.business_name::TEXT, -- Cast to TEXT
    b.logo_url as business_logo,
    o.icon_image_url,
    f.created_at as favorited_at,
    o.view_count,
    o.share_count,
    ot.offer_name::TEXT as offer_type_name,
    oc.name::TEXT as category_name,
    o.audit_code::TEXT
  FROM user_favorites f
  JOIN offers o ON o.id = f.item_id
  JOIN businesses b ON b.id = o.business_id
  LEFT JOIN offer_types ot ON ot.id = o.offer_type_id
  LEFT JOIN offer_categories oc ON oc.id = ot.category_id
  WHERE f.user_id = p_user_id 
    AND f.item_type = 'offer'
    AND o.status = 'active'
    AND o.valid_until > NOW()
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_favorite_offers TO authenticated;
