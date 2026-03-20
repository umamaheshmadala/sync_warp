-- Migration: add business_id to get_trending_products_by_category
-- Fixes navigation bug where business_name (TEXT) was used instead of business_id (UUID)

CREATE OR REPLACE FUNCTION get_trending_products_by_category(
  p_l2_category_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  image_url TEXT,
  business_id UUID,
  business_name TEXT,
  l3_category TEXT,
  trending_score BIGINT,
  rank BIGINT
) AS $$
WITH signal_counts AS (
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    (p.images)[1] AS image_url,
    b.id AS business_id,
    b.business_name,
    pcm_l3.name AS l3_category,
    (
      COALESCE(v.cnt, 0) * 1 +
      COALESCE(l.cnt, 0) * 3 +
      COALESCE(c.cnt, 0) * 5 +
      COALESCE(s.cnt, 0) * 7
    ) AS trending_score
  FROM products p
  JOIN businesses b ON b.id = p.business_id
  JOIN product_categories pc ON pc.product_id = p.id AND pc.rank = 1
  JOIN product_category_master pcm_l3 ON pcm_l3.id = pc.category_id
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_views
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) v ON v.product_id = p.id
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_likes
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) l ON l.product_id = p.id
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_comments
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) c ON c.product_id = p.id
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_shares
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) s ON s.product_id = p.id
  WHERE pcm_l3.parent_id = p_l2_category_id
    AND p.status = 'published'
)
SELECT
  product_id,
  product_name,
  image_url,
  business_id,
  business_name,
  l3_category,
  trending_score,
  RANK() OVER (ORDER BY trending_score DESC) AS rank
FROM signal_counts
ORDER BY trending_score DESC
LIMIT p_limit;
$$ LANGUAGE sql STABLE;
