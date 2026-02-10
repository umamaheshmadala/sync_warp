-- Migration: Add enhanced Google Places API fields to businesses table
-- These fields are fetched during onboarding at no extra cost (bundled with session token)

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS google_user_ratings_total INTEGER,
  ADD COLUMN IF NOT EXISTS google_price_level SMALLINT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS google_business_status TEXT,
  ADD COLUMN IF NOT EXISTS google_photo_reference TEXT;

-- Add descriptive comments
COMMENT ON COLUMN businesses.google_rating IS 'Google Places rating (1.0-5.0), fetched during onboarding';
COMMENT ON COLUMN businesses.google_user_ratings_total IS 'Total number of Google user ratings';
COMMENT ON COLUMN businesses.google_price_level IS 'Google price level: 0=Free, 1=Inexpensive, 2=Moderate, 3=Expensive, 4=Very Expensive';
COMMENT ON COLUMN businesses.google_maps_url IS 'Direct URL to the business on Google Maps';
COMMENT ON COLUMN businesses.google_business_status IS 'OPERATIONAL, CLOSED_TEMPORARILY, or CLOSED_PERMANENTLY';
COMMENT ON COLUMN businesses.google_photo_reference IS 'Google Places photo reference for the primary business photo';
