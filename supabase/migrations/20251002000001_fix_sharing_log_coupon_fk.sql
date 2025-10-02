-- =====================================================
-- Story 5.5: Fix Foreign Key Reference
-- Migration: Update coupon_sharing_log to reference business_coupons instead of coupons
-- Date: October 2, 2025
-- =====================================================

-- Drop the existing foreign key constraint
ALTER TABLE coupon_sharing_log 
  DROP CONSTRAINT IF EXISTS coupon_sharing_log_coupon_id_fkey;

-- Add the correct foreign key constraint pointing to business_coupons
ALTER TABLE coupon_sharing_log 
  ADD CONSTRAINT coupon_sharing_log_coupon_id_fkey 
  FOREIGN KEY (coupon_id) 
  REFERENCES business_coupons(id) 
  ON DELETE SET NULL;

-- Verify the constraint was added
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'coupon_sharing_log_coupon_id_fkey'
      AND table_name = 'coupon_sharing_log'
  ), 'Foreign key constraint should exist on coupon_sharing_log.coupon_id';
  
  RAISE NOTICE 'Story 5.5: Foreign key fix completed successfully - now references business_coupons';
END $$;
