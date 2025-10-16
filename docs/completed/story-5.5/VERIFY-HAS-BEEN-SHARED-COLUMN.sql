-- Verify that the has_been_shared column exists in user_coupon_collections table
-- This should be run to ensure the migration 20250203_add_coupon_sharing_tracking.sql has been applied

-- Check if the column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_coupon_collections'
AND column_name IN ('has_been_shared', 'deleted_at', 'shared_to_user_id')
ORDER BY column_name;

-- If the query above returns no rows, you need to apply the migration
-- Run this command in your terminal (with Docker running):
-- npx supabase db reset
-- OR manually apply the migration:
-- npx supabase db push

-- If the columns exist, verify the trigger is in place
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_has_been_shared';

-- Verify RLS policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_coupon_collections'
ORDER BY policyname;
