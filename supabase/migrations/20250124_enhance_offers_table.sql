-- Migration: Enhance Offers Table for Story 4.12
-- Date: 2025-01-24
-- Description: Add columns for offer status, codes, analytics, and lifecycle tracking

-- Add new columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' 
  CHECK (status IN ('draft', 'active', 'paused', 'expired', 'archived'));

ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50) UNIQUE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS icon_image_url TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE offers ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Generate offer codes for existing offers (if any)
UPDATE offers 
SET offer_code = 'OFFER-' || UPPER(SUBSTR(MD5(id::text), 1, 8)) 
WHERE offer_code IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_offer_code ON offers(offer_code);
CREATE INDEX IF NOT EXISTS idx_offers_business_status ON offers(business_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_by ON offers(created_by);

-- Add table comment
COMMENT ON TABLE offers IS 'Business promotional offers - static informational announcements viewable on storefront';

-- Enable RLS (if not already enabled)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;
DROP POLICY IF EXISTS "Business owners can manage own offers" ON offers;

-- RLS Policy: Anyone can view active offers
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (status = 'active');

-- RLS Policy: Business owners can manage their own offers
CREATE POLICY "Business owners can manage own offers" ON offers
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- Add column comment
COMMENT ON COLUMN offers.status IS 'Offer lifecycle status: draft, active, paused, expired, archived';
COMMENT ON COLUMN offers.offer_code IS 'Unique code for shareable links (e.g., OFFER-A1B2C3D4)';
COMMENT ON COLUMN offers.icon_image_url IS 'URL to offer icon/image (max 2MB)';
COMMENT ON COLUMN offers.view_count IS 'Total number of times offer was viewed';
COMMENT ON COLUMN offers.share_count IS 'Total number of times offer was shared';
COMMENT ON COLUMN offers.click_count IS 'Total number of clicks on shared links';
