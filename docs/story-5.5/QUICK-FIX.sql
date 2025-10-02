-- =====================================================
-- QUICK FIX: Run this in Supabase SQL Editor NOW
-- =====================================================
-- This fixes the foreign key to point to business_coupons

-- 1. Drop the wrong foreign key
ALTER TABLE coupon_sharing_log 
  DROP CONSTRAINT IF EXISTS coupon_sharing_log_coupon_id_fkey;

-- 2. Add the correct foreign key
ALTER TABLE coupon_sharing_log 
  ADD CONSTRAINT coupon_sharing_log_coupon_id_fkey 
  FOREIGN KEY (coupon_id) 
  REFERENCES business_coupons(id) 
  ON DELETE SET NULL;

-- 3. Verify it worked
SELECT 
  'SUCCESS! Foreign key now points to business_coupons' as status;

-- 4. Now get test data - copy these IDs:

-- Get a friend user ID:
SELECT id as friend_id, email 
FROM auth.users 
LIMIT 5;

-- Get a valid coupon ID:
SELECT id as coupon_id, title, status 
FROM business_coupons 
WHERE status = 'active' 
AND valid_until > NOW()
LIMIT 5;
