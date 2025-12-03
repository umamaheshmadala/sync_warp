-- =====================================================
-- Fix: Allow users to view coupons they have collected
-- Date: December 3, 2025
-- =====================================================

-- Add policy to business_coupons to allow users to see coupons they have collected
-- This ensures they remain visible in the wallet even if expired/paused/private
CREATE POLICY "Users can view coupons they have collected"
ON business_coupons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_coupon_collections ucc
    WHERE ucc.coupon_id = business_coupons.id
    AND ucc.user_id = auth.uid()
  )
);
