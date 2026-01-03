-- Migration: Fix user_coupon_collections foreign key constraints
-- Story: 8.3.4 - Coupon/Deal Sharing Integration
-- Created: 2025-12-03
-- Purpose: Fix foreign key constraints to reference profiles table instead of auth.users

-- ============================================================================
-- FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Drop the incorrect foreign key constraints and recreate them correctly

-- 1. Drop existing constraints if they exist
DO $$
BEGIN
  -- Drop shared_to_user_id constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_coupon_collections_shared_to_user_id_fkey'
    AND table_name = 'user_coupon_collections'
  ) THEN
    ALTER TABLE user_coupon_collections 
    DROP CONSTRAINT user_coupon_collections_shared_to_user_id_fkey;
    RAISE NOTICE 'Dropped shared_to_user_id foreign key constraint';
  END IF;

  -- Drop original_owner_id constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_coupon_collections_original_owner_id_fkey'
    AND table_name = 'user_coupon_collections'
  ) THEN
    ALTER TABLE user_coupon_collections 
    DROP CONSTRAINT user_coupon_collections_original_owner_id_fkey;
    RAISE NOTICE 'Dropped original_owner_id foreign key constraint';
  END IF;
END $$;

-- 2. Add correct foreign key constraints referencing profiles table
ALTER TABLE user_coupon_collections
  ADD CONSTRAINT user_coupon_collections_shared_to_user_id_fkey
  FOREIGN KEY (shared_to_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE user_coupon_collections
  ADD CONSTRAINT user_coupon_collections_original_owner_id_fkey
  FOREIGN KEY (original_owner_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_shared_to_constraint_exists BOOLEAN;
  v_original_owner_constraint_exists BOOLEAN;
BEGIN
  -- Check if constraints exist and reference correct table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'user_coupon_collections'
      AND tc.constraint_name = 'user_coupon_collections_shared_to_user_id_fkey'
      AND ccu.table_name = 'profiles'
  ) INTO v_shared_to_constraint_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'user_coupon_collections'
      AND tc.constraint_name = 'user_coupon_collections_original_owner_id_fkey'
      AND ccu.table_name = 'profiles'
  ) INTO v_original_owner_constraint_exists;

  IF v_shared_to_constraint_exists AND v_original_owner_constraint_exists THEN
    RAISE NOTICE '✅ All foreign key constraints correctly reference profiles table';
  ELSE
    RAISE WARNING '⚠️ Some constraints may not be correctly configured';
  END IF;
END $$;
