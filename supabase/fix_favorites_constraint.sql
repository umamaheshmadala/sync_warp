-- Fix: Drop the old constraint that doesn't include 'offer'
-- There are two constraints - we need to drop the old one

-- First, let's see what constraints exist
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE 'favorites_entity_type%';

-- Drop ALL existing entity_type check constraints
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_entity_type_check;
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_entity_type_check1;

-- Add the correct constraint
ALTER TABLE favorites ADD CONSTRAINT favorites_entity_type_check 
  CHECK (entity_type IN ('product', 'coupon', 'event', 'offer'));

-- Verify only one constraint exists now
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE 'favorites_entity_type%';
