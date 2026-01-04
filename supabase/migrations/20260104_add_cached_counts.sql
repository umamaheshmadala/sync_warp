-- Migration: Add cached counts for high-performance sorting
-- Created: 2026-01-04
-- Purpose: Add share_count, favorite_count, view_count to main tables to enable sorting by engagement

-- 1. Update Coupons Table
ALTER TABLE public.business_coupons 
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- 2. Update Business Products Table
ALTER TABLE public.business_products
ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 3. Create/Update Triggers for Shares
-- Function to update share counts
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
      UPDATE public.business_products
      SET share_count = share_count + 1
      WHERE id = NEW.entity_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for shares table
DROP TRIGGER IF EXISTS on_share_created ON public.shares;
CREATE TRIGGER on_share_created
AFTER INSERT ON public.shares
FOR EACH ROW
EXECUTE FUNCTION public.update_share_counts();


-- 4. Create/Update Triggers for Favorites (Products)
-- Function to update favorite counts
CREATE OR REPLACE FUNCTION public.update_favorite_product_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.business_products
    SET favorite_count = favorite_count + 1
    WHERE id = NEW.product_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.business_products
    SET favorite_count = GREATEST(0, favorite_count - 1)
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for favorite_products table
DROP TRIGGER IF EXISTS on_favorite_product_change ON public.favorite_products;
CREATE TRIGGER on_favorite_product_change
AFTER INSERT OR DELETE ON public.favorite_products
FOR EACH ROW
EXECUTE FUNCTION public.update_favorite_product_counts();


-- 5. Backfill existing counts
-- Backfill Product Favorites
UPDATE public.business_products p
SET favorite_count = (
  SELECT COUNT(*)
  FROM public.favorite_products fp
  WHERE fp.product_id = p.id
);

-- Backfill Offer Shares
UPDATE public.offers o
SET share_count = (
  SELECT COUNT(*)
  FROM public.shares s
  WHERE s.entity_id = o.id AND s.type = 'offer'
);

-- Backfill Coupon Shares
UPDATE public.business_coupons c
SET share_count = (
  SELECT COUNT(*)
  FROM public.shares s
  WHERE s.entity_id = c.id AND s.type = 'coupon'
);

UPDATE public.business_products p
SET share_count = (
  SELECT COUNT(*)
  FROM public.shares s
  WHERE s.entity_id = p.id AND s.type = 'product'
);
