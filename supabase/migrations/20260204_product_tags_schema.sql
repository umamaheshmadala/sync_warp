-- Migration to add tags support to products table
-- Created: 2026-02-04

-- Add tags column (Array of text)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS new_arrival_expires_at timestamptz DEFAULT (now() + interval '7 days');

-- Add GIN index for faster array operations/searching
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN (tags);

-- Comment on columns
COMMENT ON COLUMN public.products.tags IS 'Array of manual tags like "sale", "best_seller"';
COMMENT ON COLUMN public.products.new_arrival_expires_at IS 'Timestamp when the "New Arrival" virtual tag should expire';
