-- =====================================================
-- GET USER IDs FOR TESTING
-- =====================================================

-- Get all users (friends to share with):
SELECT 
  id as friend_id, 
  email,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- Or if you want to exclude yourself:
-- SELECT 
--   id as friend_id, 
--   email,
--   raw_user_meta_data->>'role' as role
-- FROM auth.users 
-- WHERE email != 'your.email@example.com'  -- Replace with your email
-- ORDER BY created_at DESC
-- LIMIT 5;
