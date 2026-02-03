-- Fix 'business_products' references to 'products'
-- The table 'business_products' does not exist, it should be 'products'.

-- 1. Fix get_user_favorite_products function (from 20260109_user_favorites.sql)
CREATE OR REPLACE FUNCTION get_user_favorite_products(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_urls TEXT[],
  business_id UUID,
  business_name TEXT,
  is_available BOOLEAN,
  is_featured BOOLEAN,
  favorited_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    p.description::TEXT,
    p.price,
    p.image_urls,
    p.business_id,
    b.business_name::TEXT,
    p.is_available,
    p.is_featured,
    f.created_at as favorited_at
  FROM user_favorites f
  JOIN products p ON p.id = f.item_id  -- Changed from 'business_products' to 'products'
  JOIN businesses b ON b.id = p.business_id
  WHERE f.user_id = p_user_id 
    AND f.item_type = 'product'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Fix update_share_counts function (from 20260104_add_cached_counts.sql)
CREATE OR REPLACE FUNCTION public.update_share_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.type = 'offer') THEN
      UPDATE public.offers
      SET share_count = share_count + 1
      WHERE id = NEW.entity_id;
    ELSIF (NEW.type = 'coupon') THEN
      UPDATE public.business_coupons
      SET share_count = share_count + 1
      WHERE id = NEW.entity_id;
    ELSIF (NEW.type = 'product') THEN
      UPDATE public.products -- Changed from business_products
      SET share_count = share_count + 1
      WHERE id = NEW.entity_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Fix update_favorite_product_counts function (from 20260104_add_cached_counts.sql)
CREATE OR REPLACE FUNCTION public.update_favorite_product_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.products -- Changed from business_products
    SET favorite_count = favorite_count + 1
    WHERE id = NEW.product_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.products -- Changed from business_products
    SET favorite_count = GREATEST(0, favorite_count - 1)
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Fix "Business owners can view entity shares" Policy on share_events (from 20260115_remaining_steps.sql)
DROP POLICY IF EXISTS "Business owners can view entity shares" ON share_events;
CREATE POLICY "Business owners can view entity shares" ON share_events FOR SELECT USING (
  (entity_type = 'storefront' AND EXISTS (SELECT 1 FROM businesses b WHERE b.id = entity_id AND b.owner_id = auth.uid()))
  OR (entity_type = 'product' AND EXISTS (SELECT 1 FROM products p JOIN businesses b ON p.business_id = b.id WHERE p.id = entity_id AND b.owner_id = auth.uid()))
  OR (entity_type = 'offer' AND EXISTS (SELECT 1 FROM offers o JOIN businesses b ON o.business_id = b.id WHERE o.id = entity_id AND b.owner_id = auth.uid()))
  OR (entity_type = 'profile' AND entity_id = auth.uid())
);
