-- Migration: Fix friend_requests foreign key constraints and column names
-- Story: 8.3.4 - Coupon/Deal Sharing Integration
-- Created: 2025-12-03
-- Purpose: Ensure friend_requests has sender_id column and correct FKs to profiles

-- ============================================================================
-- FIX FRIEND_REQUESTS SCHEMA
-- ============================================================================

DO $$
BEGIN
  -- 1. Ensure column is named sender_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'friend_requests' AND column_name = 'requester_id'
  ) THEN
    ALTER TABLE friend_requests RENAME COLUMN requester_id TO sender_id;
    RAISE NOTICE 'Renamed requester_id to sender_id';
  END IF;

  -- 2. Drop incorrect/old constraints
  -- Drop requester_id constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friend_requests_requester_id_fkey'
    AND table_name = 'friend_requests'
  ) THEN
    ALTER TABLE friend_requests DROP CONSTRAINT friend_requests_requester_id_fkey;
    RAISE NOTICE 'Dropped friend_requests_requester_id_fkey';
  END IF;

  -- Drop sender_id constraint if it exists (to recreate correctly)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friend_requests_sender_id_fkey'
    AND table_name = 'friend_requests'
  ) THEN
    ALTER TABLE friend_requests DROP CONSTRAINT friend_requests_sender_id_fkey;
    RAISE NOTICE 'Dropped existing friend_requests_sender_id_fkey';
  END IF;

  -- Drop receiver_id constraint if it exists (to recreate correctly)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friend_requests_receiver_id_fkey'
    AND table_name = 'friend_requests'
  ) THEN
    ALTER TABLE friend_requests DROP CONSTRAINT friend_requests_receiver_id_fkey;
    RAISE NOTICE 'Dropped existing friend_requests_receiver_id_fkey';
  END IF;

  -- 3. Add correct constraints referencing profiles
  ALTER TABLE friend_requests
    ADD CONSTRAINT friend_requests_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
  ALTER TABLE friend_requests
    ADD CONSTRAINT friend_requests_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

  RAISE NOTICE '✅ Created correct foreign key constraints referencing profiles';

END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_sender_fk_exists BOOLEAN;
  v_receiver_fk_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'friend_requests' 
      AND tc.constraint_name = 'friend_requests_sender_id_fkey'
      AND ccu.table_name = 'profiles'
  ) INTO v_sender_fk_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'friend_requests' 
      AND tc.constraint_name = 'friend_requests_receiver_id_fkey'
      AND ccu.table_name = 'profiles'
  ) INTO v_receiver_fk_exists;

  IF v_sender_fk_exists AND v_receiver_fk_exists THEN
    RAISE NOTICE '✅ Verification successful: friend_requests FKs are correct';
  ELSE
    RAISE WARNING '⚠️ Verification failed: sender_fk=%, receiver_fk=%', v_sender_fk_exists, v_receiver_fk_exists;
  END IF;
END $$;
