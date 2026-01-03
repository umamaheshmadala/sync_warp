-- Add 'offer' as a valid entity_type to favorites table
-- This enables users to favorite offers (deals) from businesses

-- Drop the existing check constraint
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_entity_type_check;

-- Add new check constraint that includes 'offer'
ALTER TABLE favorites ADD CONSTRAINT favorites_entity_type_check 
  CHECK (entity_type IN ('product', 'coupon', 'event', 'offer'));

-- Add comment explaining the entity types
COMMENT ON COLUMN favorites.entity_type IS 'Type of entity being favorited: product, coupon, event, or offer';
