-- Migration: create_trending_score_functions

-- 1. Function to get a leaderboard for a specific L2 Category
CREATE OR REPLACE FUNCTION get_trending_products_by_category(
  p_l2_category_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  image_url TEXT,
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
  business_name,
  l3_category,
  trending_score,
  RANK() OVER (ORDER BY trending_score DESC) AS rank
FROM signal_counts
ORDER BY trending_score DESC
LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- 2. Function to get a single product's trending rank
CREATE OR REPLACE FUNCTION get_product_trending_rank(p_product_id UUID)
RETURNS TABLE(rank BIGINT, l2_category_id UUID, l2_category_name TEXT) AS $$
WITH product_context AS (
  SELECT pcm_l3.parent_id AS l2_id, pcm_l2.name AS l2_name
  FROM product_categories pc
  JOIN product_category_master pcm_l3 ON pcm_l3.id = pc.category_id
  JOIN product_category_master pcm_l2 ON pcm_l2.id = pcm_l3.parent_id
  WHERE pc.product_id = p_product_id AND pc.rank = 1
  LIMIT 1
),
signal_counts AS (
  SELECT
    p.id AS product_id,
    (
      COALESCE(v.cnt, 0) * 1 +
      COALESCE(l.cnt, 0) * 3 +
      COALESCE(c.cnt, 0) * 5 +
      COALESCE(s.cnt, 0) * 7
    ) AS trending_score
  FROM products p
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
  WHERE pcm_l3.parent_id = (SELECT l2_id FROM product_context)
    AND p.status = 'published'
),
ranked_products AS (
  SELECT
    product_id,
    RANK() OVER (ORDER BY trending_score DESC) AS rank
  FROM signal_counts
)
SELECT
  rp.rank,
  pc.l2_id,
  pc.l2_name
FROM ranked_products rp
CROSS JOIN product_context pc
WHERE rp.product_id = p_product_id;
$$ LANGUAGE sql STABLE;
