-- Check coupon ownership and visibility for RLS policy debugging
SELECT 
  bc.id, 
  bc.title, 
  bc.is_public, 
  bc.status, 
  b.business_name, 
  b.user_id as business_owner_id,
  CASE 
    WHEN b.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' THEN 'Test User 1 (Owner)' 
    WHEN b.user_id = '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3' THEN 'Test User 3'
    ELSE 'Other User (' || SUBSTRING(b.user_id, 1, 8) || '...)'
  END as owner,
  bc.created_at,
  bc.valid_until
FROM business_coupons bc 
JOIN businesses b ON bc.business_id = b.id 
WHERE bc.status = 'active' 
ORDER BY bc.title;

-- Also check what RLS policies exist
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('business_coupons', 'businesses')
ORDER BY tablename, policyname;