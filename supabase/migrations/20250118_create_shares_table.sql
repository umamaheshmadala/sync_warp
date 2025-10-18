-- Migration: Create shares table and tracking function
-- Story 4.9 - Social Sharing Actions
-- Date: 2025-01-18

-- ============================================================================
-- Table: shares
-- ============================================================================
-- Tracks share events for storefronts, products, offers, and coupons
-- Supports multiple share methods: native, copy, WhatsApp, Facebook, Twitter, Email

CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('storefront', 'product', 'offer', 'coupon')),
  entity_id UUID NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('web_share', 'copy', 'whatsapp', 'facebook', 'twitter', 'email')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Optimize queries filtering by entity
CREATE INDEX IF NOT EXISTS idx_shares_entity 
  ON public.shares(entity_id, type);

-- Optimize queries filtering by user
CREATE INDEX IF NOT EXISTS idx_shares_user 
  ON public.shares(user_id)
  WHERE user_id IS NOT NULL;

-- Optimize time-based queries (most recent shares)
CREATE INDEX IF NOT EXISTS idx_shares_created 
  ON public.shares(created_at DESC);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_shares_entity_method 
  ON public.shares(entity_id, type, method);

-- ============================================================================
-- RPC Function: track_share
-- ============================================================================
-- Securely insert share events from the frontend

CREATE OR REPLACE FUNCTION public.track_share(
  p_user_id UUID,
  p_type TEXT,
  p_entity_id UUID,
  p_method TEXT
) RETURNS UUID AS $$
DECLARE
  v_share_id UUID;
BEGIN
  -- Validate inputs
  IF p_type NOT IN ('storefront', 'product', 'offer', 'coupon') THEN
    RAISE EXCEPTION 'Invalid share type: %', p_type;
  END IF;

  IF p_method NOT IN ('web_share', 'copy', 'whatsapp', 'facebook', 'twitter', 'email') THEN
    RAISE EXCEPTION 'Invalid share method: %', p_method;
  END IF;

  -- Insert share record
  INSERT INTO public.shares (user_id, type, entity_id, method)
  VALUES (p_user_id, p_type, p_entity_id, p_method)
  RETURNING id INTO v_share_id;
  
  RETURN v_share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can track shares (authenticated or anonymous)
-- This allows share tracking without requiring login
CREATE POLICY "Anyone can track shares"
  ON public.shares 
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Users can view their own shares
CREATE POLICY "Users can view own shares"
  ON public.shares 
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Business owners can view shares for their storefronts
CREATE POLICY "Business owners can view storefront shares"
  ON public.shares 
  FOR SELECT
  USING (
    type = 'storefront' AND
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = shares.entity_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Policy 4: Business owners can view shares for their products
CREATE POLICY "Business owners can view product shares"
  ON public.shares 
  FOR SELECT
  USING (
    type = 'product' AND
    EXISTS (
      SELECT 1 
      FROM public.products
      INNER JOIN public.businesses ON products.business_id = businesses.id
      WHERE products.id = shares.entity_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Policy 5: Business owners can view shares for their offers
CREATE POLICY "Business owners can view offer shares"
  ON public.shares 
  FOR SELECT
  USING (
    type = 'offer' AND
    EXISTS (
      SELECT 1 
      FROM public.offers
      INNER JOIN public.businesses ON offers.business_id = businesses.id
      WHERE offers.id = shares.entity_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Policy 6: Business owners can view shares for their coupons
CREATE POLICY "Business owners can view coupon shares"
  ON public.shares 
  FOR SELECT
  USING (
    type = 'coupon' AND
    EXISTS (
      SELECT 1 
      FROM public.coupons
      INNER JOIN public.businesses ON coupons.business_id = businesses.id
      WHERE coupons.id = shares.entity_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.shares IS 
  'Tracks share events for storefronts, products, offers, and coupons across multiple platforms';

COMMENT ON COLUMN public.shares.user_id IS 
  'User who initiated the share (NULL for anonymous shares)';

COMMENT ON COLUMN public.shares.type IS 
  'Type of entity being shared: storefront, product, offer, or coupon';

COMMENT ON COLUMN public.shares.entity_id IS 
  'UUID of the entity being shared';

COMMENT ON COLUMN public.shares.method IS 
  'Share method used: web_share (native), copy, whatsapp, facebook, twitter, or email';

COMMENT ON FUNCTION public.track_share IS 
  'Securely track a share event. Returns the created share ID.';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Allow authenticated users to call track_share
GRANT EXECUTE ON FUNCTION public.track_share TO authenticated;

-- Allow anonymous users to call track_share (for guest sharing)
GRANT EXECUTE ON FUNCTION public.track_share TO anon;
