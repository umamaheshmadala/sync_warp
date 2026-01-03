-- Migration: Fix ALL user_coupon_collections foreign key constraints
-- Story: 8.3.4 - Coupon/Deal Sharing Integration
-- Created: 2025-12-03
-- Purpose: Fix ALL foreign key constraints to reference profiles table instead of auth.users

-- ============================================================================
-- FIX ALL FOREIGN KEY CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
  -- Drop user_id constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_coupon_collections_user_id_fkey'
    AND table_name = 'user_coupon_collections'
  ) THEN
    ALTER TABLE user_coupon_collections 
    DROP CONSTRAINT user_coupon_collections_user_id_fkey;
    RAISE NOTICE 'Dropped user_id foreign key constraint';
  END IF;

  -- Drop shared_to_user_id constraint (if not already dropped)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_coupon_collections_shared_to_user_id_fkey'
    AND table_name = 'user_coupon_collections'
  ) THEN
    ALTER TABLE user_coupon_collections 
    DROP CONSTRAINT user_coupon_collections_shared_to_user_id_fkey;
    RAISE NOTICE 'Dropped shared_to_user_id foreign key constraint';
  END IF;

  -- Drop original_owner_id constraint (if not already dropped)
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

-- Add correct foreign key constraints referencing profiles table
ALTER TABLE user_coupon_collections
  ADD CONSTRAINT user_coupon_collections_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

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
  v_user_id_ok BOOLEAN;
  v_shared_to_ok BOOLEAN;
  v_original_owner_ok BOOLEAN;
BEGIN
  -- Check all constraints
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'user_coupon_collections'
      AND tc.constraint_name = 'user_coupon_collections_user_id_fkey'
      AND ccu.table_name = 'profiles'
  ) INTO v_user_id_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'user_coupon_collections'
      AND tc.constraint_name = 'user_coupon_collections_shared_to_user_id_fkey'
      AND ccu.table_name = 'profiles'
  ) INTO v_shared_to_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'user_coupon_collections'
      AND tc.constraint_name = 'user_coupon_collections_original_owner_id_fkey'
      AND ccu.table_name = 'profiles'
  ) INTO v_original_owner_ok;

  IF v_user_id_ok AND v_shared_to_ok AND v_original_owner_ok THEN
    RAISE NOTICE '✅ All foreign key constraints correctly reference profiles table';
  ELSE
    RAISE WARNING '⚠️ Constraint status: user_id=%, shared_to=%, original_owner=%', 
      v_user_id_ok, v_shared_to_ok, v_original_owner_ok;
  END IF;
END $$;
