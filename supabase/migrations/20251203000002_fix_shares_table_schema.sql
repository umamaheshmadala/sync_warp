-- Migration: Fix shares table schema and RLS policies
-- Story: 8.3.4 - Coupon/Deal Sharing Integration
-- Created: 2025-12-03
-- Purpose: Ensure all columns exist and fix RLS policies for new share tracking

-- ============================================================================
-- ENSURE METADATA COLUMN EXISTS (should already exist from original migration)
-- ============================================================================
-- This is a safety check in case the column doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shares' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE shares ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN shares.metadata IS 'Additional metadata for the share event';
  END IF;
END $$;

-- ============================================================================
-- UPDATE RLS POLICIES FOR NEW COLUMNS
-- ============================================================================
-- Drop old INSERT policy and create new one that handles new columns
DROP POLICY IF EXISTS "Anyone can create shares" ON shares;

CREATE POLICY "Anyone can create shares"
  ON shares FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated and matches user_id
    (auth.uid() = user_id) OR 
    -- Allow if user_id is null (anonymous shares)
    (user_id IS NULL) OR
    -- Allow if user is not authenticated (anonymous)
    (auth.uid() IS NULL)
  );

-- ============================================================================
-- REFRESH SCHEMA CACHE
-- ============================================================================
-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify all required columns exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY['id', 'user_id', 'type', 'entity_id', 'method', 'referral_code', 'metadata', 'created_at', 'share_platform', 'share_method', 'conversation_id', 'shared_with_user_id']) AS column_name
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shares' AND columns.column_name = expected.column_name
  );

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING 'Missing columns in shares table: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'All required columns exist in shares table';
  END IF;
END $$;
