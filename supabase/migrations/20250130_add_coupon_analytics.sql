-- Migration: Add Coupon Analytics and Trending Features
-- Created: 2025-01-30
-- Purpose: Remove mock data dependency by adding real analytics tracking

-- Create coupon_analytics table
CREATE TABLE IF NOT EXISTS public.coupon_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  used_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  popularity_score NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT coupon_analytics_coupon_id_key UNIQUE (coupon_id)
);

-- Add analytics columns to coupons table
ALTER TABLE public.coupons 
  ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupon_analytics_popularity 
  ON public.coupon_analytics(popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_coupon_analytics_coupon_id 
  ON public.coupon_analytics(coupon_id);

CREATE INDEX IF NOT EXISTS idx_coupons_trending 
  ON public.coupons(is_trending, trending_score DESC) 
  WHERE is_trending = TRUE;

CREATE INDEX IF NOT EXISTS idx_coupons_used_count 
  ON public.coupons(used_count DESC);

-- Enable Row Level Security
ALTER TABLE public.coupon_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupon_analytics
-- Users can view analytics for any coupon
CREATE POLICY "Anyone can view coupon analytics" 
  ON public.coupon_analytics
  FOR SELECT 
  USING (true);

-- Only system can update analytics (via functions)
CREATE POLICY "Only authenticated users can update analytics via functions" 
  ON public.coupon_analytics
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Function to increment coupon view count
CREATE OR REPLACE FUNCTION public.increment_coupon_view(
  coupon_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update coupon table
  UPDATE public.coupons
  SET 
    view_count = COALESCE(view_count, 0) + 1,
    last_viewed_at = NOW()
  WHERE id = coupon_id_param;
  
  -- Update or insert into analytics table
  INSERT INTO public.coupon_analytics (coupon_id, view_count, last_updated)
  VALUES (coupon_id_param, 1, NOW())
  ON CONFLICT (coupon_id) 
  DO UPDATE SET 
    view_count = coupon_analytics.view_count + 1,
    last_updated = NOW();
END;
$$;

-- Function to increment coupon usage count
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(
  coupon_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update coupon table
  UPDATE public.coupons
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = coupon_id_param;
  
  -- Update or insert into analytics table
  INSERT INTO public.coupon_analytics (coupon_id, used_count, last_updated)
  VALUES (coupon_id_param, 1, NOW())
  ON CONFLICT (coupon_id) 
  DO UPDATE SET 
    used_count = coupon_analytics.used_count + 1,
    last_updated = NOW();
    
  -- Recalculate popularity score
  PERFORM public.calculate_coupon_popularity(coupon_id_param);
END;
$$;

-- Function to calculate popularity score
CREATE OR REPLACE FUNCTION public.calculate_coupon_popularity(
  coupon_id_param UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  popularity NUMERIC;
  views INTEGER;
  uses INTEGER;
  days_active INTEGER;
BEGIN
  -- Get current stats
  SELECT 
    COALESCE(view_count, 0),
    COALESCE(used_count, 0),
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 -- Days since creation
  INTO views, uses, days_active
  FROM public.coupons
  WHERE id = coupon_id_param;
  
  -- Calculate popularity score
  -- Formula: (uses * 10 + views) / (days_active + 1)
  -- Gives more weight to actual usage vs views
  -- Normalizes by age to favor newer coupons
  popularity := ((uses * 10.0) + views) / (GREATEST(days_active, 1) + 1);
  
  -- Update coupon analytics
  UPDATE public.coupon_analytics
  SET 
    popularity_score = popularity,
    last_updated = NOW()
  WHERE coupon_id = coupon_id_param;
  
  -- Update coupon table
  UPDATE public.coupons
  SET trending_score = popularity
  WHERE id = coupon_id_param;
  
  RETURN popularity;
END;
$$;

-- Function to update trending status (run periodically)
CREATE OR REPLACE FUNCTION public.update_trending_coupons()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset all trending flags
  UPDATE public.coupons
  SET is_trending = FALSE;
  
  -- Mark top 20 coupons as trending
  WITH trending_coupons AS (
    SELECT c.id
    FROM public.coupons c
    LEFT JOIN public.coupon_analytics ca ON c.id = ca.coupon_id
    WHERE 
      c.status = 'active'
      AND c.valid_until >= NOW()
      AND (c.usage_limit IS NULL OR c.used_count < c.usage_limit)
    ORDER BY 
      COALESCE(ca.popularity_score, 0) DESC,
      c.used_count DESC
    LIMIT 20
  )
  UPDATE public.coupons
  SET is_trending = TRUE
  WHERE id IN (SELECT id FROM trending_coupons);
  
END;
$$;

-- Function to get trending coupons (replaces mock data)
CREATE OR REPLACE FUNCTION public.get_trending_coupons(
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  minimum_order_value NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER,
  view_count INTEGER,
  valid_until TIMESTAMP WITH TIME ZONE,
  status TEXT,
  business_id UUID,
  business_name TEXT,
  business_logo TEXT,
  is_trending BOOLEAN,
  popularity_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.discount_type,
    c.discount_value,
    c.minimum_order_value,
    c.usage_limit,
    COALESCE(c.used_count, 0) as used_count,
    COALESCE(c.view_count, 0) as view_count,
    c.valid_until,
    c.status,
    c.business_id,
    b.business_name,
    b.logo_url as business_logo,
    COALESCE(c.is_trending, FALSE) as is_trending,
    COALESCE(ca.popularity_score, 0) as popularity_score,
    c.created_at,
    c.updated_at
  FROM public.coupons c
  INNER JOIN public.businesses b ON c.business_id = b.id
  LEFT JOIN public.coupon_analytics ca ON c.id = ca.coupon_id
  WHERE 
    c.status = 'active'
    AND c.valid_until >= NOW()
    AND (c.usage_limit IS NULL OR c.used_count < c.usage_limit)
    AND b.status = 'active'
  ORDER BY 
    COALESCE(ca.popularity_score, 0) DESC,
    c.used_count DESC,
    c.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Function to get business categories with real counts
CREATE OR REPLACE FUNCTION public.get_business_categories_with_counts()
RETURNS TABLE (
  name TEXT,
  count BIGINT,
  description TEXT,
  icon TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name::TEXT,
    COUNT(b.id) as count,
    c.description::TEXT,
    c.icon::TEXT
  FROM public.business_categories c
  LEFT JOIN public.businesses b ON b.business_type = c.name AND b.status = 'active'
  GROUP BY c.name, c.description, c.icon
  ORDER BY count DESC, c.name ASC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.increment_coupon_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_coupons(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_coupons(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_business_categories_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_categories_with_counts() TO anon;

-- Insert initial analytics for existing coupons
INSERT INTO public.coupon_analytics (coupon_id, used_count, view_count, popularity_score)
SELECT 
  id,
  COALESCE(used_count, 0),
  0,
  0
FROM public.coupons
ON CONFLICT (coupon_id) DO NOTHING;

-- Calculate initial popularity scores
DO $$
DECLARE
  coupon_record RECORD;
BEGIN
  FOR coupon_record IN SELECT id FROM public.coupons LOOP
    PERFORM public.calculate_coupon_popularity(coupon_record.id);
  END LOOP;
END $$;

-- Run initial trending update
SELECT public.update_trending_coupons();

-- Create a scheduled job to update trending status (if pg_cron is available)
-- This would typically be set up separately or via Supabase dashboard
COMMENT ON FUNCTION public.update_trending_coupons() IS 
  'Should be run periodically (e.g., every hour) to update trending coupon status';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Coupon analytics migration completed successfully!';
  RAISE NOTICE 'Trending coupons: %', (SELECT COUNT(*) FROM public.coupons WHERE is_trending = TRUE);
  RAISE NOTICE 'Total analytics records: %', (SELECT COUNT(*) FROM public.coupon_analytics);
END $$;