-- Migration to remove price and category columns from products table
-- Epic 12: Contact-for-price refinement
-- Story 12.18: Deprecate Price Field

-- Drop trigger if it exists (though not expected to be linked to these specific columns in a way that blocks dropping, better safe)
-- (No specific triggers identified that depend SOLELY on price/category for existence, but logic might need update if triggers use them. 
--  Assuming 'products' table triggers are general 'updated_at' etc.)

BEGIN;

-- Remove columns if they exist
ALTER TABLE products 
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS category;

-- Optionally, we could clean up any other legacy columns if strictly required, 
-- but this migration focuses on price/category deprecation.

COMMIT;
