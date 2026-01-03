-- =====================================================
-- Fix: Break RLS recursion for coupon visibility
-- Date: December 3, 2025
-- =====================================================

-- 1. Drop the problematic policy first
DROP POLICY IF EXISTS "Users can view coupons they have collected" ON business_coupons;

-- 2. Create a SECURITY DEFINER function to check collection status
-- This bypasses RLS on user_coupon_collections to avoid infinite recursion
-- when user_coupon_collections also checks business_coupons
CREATE OR REPLACE FUNCTION check_user_collected_coupon(p_coupon_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_coupon_collections
    WHERE coupon_id = p_coupon_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the policy using the function
CREATE POLICY "Users can view coupons they have collected"
ON business_coupons
FOR SELECT
USING (
  check_user_collected_coupon(id)
);
