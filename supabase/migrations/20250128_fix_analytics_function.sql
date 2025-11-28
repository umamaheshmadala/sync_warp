-- Migration: Fix get_user_sharing_analytics function
-- Story 9.7.6: Deal Sharing Analytics
-- Date: 2025-11-28
-- Description: Fix column name reference in most_engaged_friends subquery (p.user_id -> p.id)

CREATE OR REPLACE FUNCTION get_user_sharing_analytics()
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'total_shares', 0,
      'shares_by_method', '{}'::json,
      'click_through_rate', 0,
      'conversion_rate', 0,
      'most_shared_offers', '[]'::json,
      'most_engaged_friends', '[]'::json
    );
  END IF;
  
  SELECT json_build_object(
    'total_shares', (
      SELECT COUNT(*) FROM deal_shares WHERE sender_id = current_user_id
    ),
    'shares_by_method', (
      SELECT COALESCE(json_object_agg(share_method, count), '{}'::json)
      FROM (
        SELECT share_method, COUNT(*) as count
        FROM deal_shares
        WHERE sender_id = current_user_id
        GROUP BY share_method
      ) t
    ),
    'click_through_rate', (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE clicked = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
          2
        ),
        0
      )
      FROM deal_shares
      WHERE sender_id = current_user_id
    ),
    'conversion_rate', (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE converted = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
          2
        ),
        0
      )
      FROM deal_shares
      WHERE sender_id = current_user_id
    ),
    'most_shared_offers', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT o.id, o.title, o.image_url, COUNT(*) as share_count
        FROM deal_shares ds
        JOIN offers o ON o.id = ds.deal_id
        WHERE ds.sender_id = current_user_id
        GROUP BY o.id, o.title, o.image_url
        ORDER BY share_count DESC
        LIMIT 5
      ) t
    ),
    'most_engaged_friends', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT 
          p.id as id,
          p.full_name,
          p.avatar_url,
          COUNT(*) as shares_received,
          COUNT(*) FILTER (WHERE ds.clicked = true) as clicks,
          COUNT(*) FILTER (WHERE ds.converted = true) as conversions
        FROM deal_shares ds
        JOIN profiles p ON p.id = ds.recipient_id
        WHERE ds.sender_id = current_user_id
        GROUP BY p.id, p.full_name, p.avatar_url
        ORDER BY conversions DESC, clicks DESC
        LIMIT 5
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_sharing_analytics() TO authenticated;

COMMENT ON FUNCTION get_user_sharing_analytics() IS 'Returns comprehensive sharing analytics for the current user (Fixed column reference)';
