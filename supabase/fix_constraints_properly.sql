-- Remove ALL check constraints from favorites table and add the correct one
-- PostgreSQL has multiple constraints with the same name somehow

-- Get the actual constraint names from pg_constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'favorites'::regclass
  AND contype = 'c';  -- 'c' = check constraint

-- Drop constraints by querying pg_constraint directly
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'favorites'::regclass
          AND contype = 'c'
          AND conname LIKE '%entity_type%'
    LOOP
        EXECUTE format('ALTER TABLE favorites DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Now add the correct constraint
ALTER TABLE favorites ADD CONSTRAINT favorites_entity_type_check 
  CHECK (entity_type IN ('product', 'coupon', 'event', 'offer'));

-- Verify we now have only one constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'favorites'::regclass
  AND contype = 'c'
  AND conname LIKE '%entity_type%';
