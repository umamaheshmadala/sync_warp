-- Fix deal_shares table to reference offers instead of deals
-- The current migration references a non-existent deals table

-- First, check if there's a foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'deal_shares'
  AND tc.constraint_type = 'FOREIGN KEY';

-- If there's a constraint on deal_id referencing deals table, drop it
-- ALTER TABLE deal_shares DROP CONSTRAINT IF EXISTS deal_shares_deal_id_fkey;

-- Add proper foreign key to offers table
-- ALTER TABLE deal_shares 
-- ADD CONSTRAINT deal_shares_deal_id_fkey 
-- FOREIGN KEY (deal_id) REFERENCES offers(id) ON DELETE CASCADE;
