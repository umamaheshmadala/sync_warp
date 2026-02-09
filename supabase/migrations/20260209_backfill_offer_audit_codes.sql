-- Backfill audit_code for existing offer activity logs
-- This migration updates business_activity_log entries where:
-- 1. The action_type starts with 'offer_'
-- 2. The metadata contains an offer_id
-- 3. The metadata does not yet have an audit_code
-- It fetches the audit_code from the offers table and adds it to the metadata

-- Update business_activity_log with audit_code from offers table
UPDATE business_activity_log bal
SET metadata = jsonb_set(
  bal.metadata,
  '{audit_code}',
  to_jsonb(o.audit_code)
)
FROM offers o
WHERE 
  bal.action_type LIKE 'offer_%'
  AND bal.metadata->>'offer_id' = o.id::text
  AND bal.metadata->>'audit_code' IS NULL
  AND o.audit_code IS NOT NULL;

-- Output the number of rows updated for verification
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % business_activity_log records with audit_code', updated_count;
END $$;
