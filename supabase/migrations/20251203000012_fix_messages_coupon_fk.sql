-- =====================================================
-- Fix Foreign Key Reference for Messages Table
-- Migration: Update messages table to reference business_coupons instead of coupons
-- Date: December 3, 2025
-- =====================================================

-- Drop the existing foreign key constraint if it exists
ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_shared_coupon_id_fkey;

-- Add the correct foreign key constraint pointing to business_coupons
ALTER TABLE messages 
  ADD CONSTRAINT messages_shared_coupon_id_fkey 
  FOREIGN KEY (shared_coupon_id) 
  REFERENCES business_coupons(id) 
  ON DELETE SET NULL;

-- Verify the constraint was added
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_shared_coupon_id_fkey'
      AND table_name = 'messages'
  ), 'Foreign key constraint should exist on messages.shared_coupon_id';
  
  RAISE NOTICE 'Foreign key fix completed successfully - messages.shared_coupon_id now references business_coupons';
END $$;
