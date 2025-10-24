-- ============================================================================
-- SIMPLE CLEANUP - Delete all follower_notifications in batches
-- Run each DELETE statement one at a time in Supabase SQL Editor
-- ============================================================================

-- Option 1: Delete all at once (fastest)
DELETE FROM follower_notifications;

-- If that's too slow or times out, use these batches instead:
-- Run each one separately, one at a time

-- Batch 1
-- DELETE FROM follower_notifications WHERE id IN (
--   SELECT id FROM follower_notifications LIMIT 100
-- );

-- Batch 2
-- DELETE FROM follower_notifications WHERE id IN (
--   SELECT id FROM follower_notifications LIMIT 100
-- );

-- Keep running the batch delete until this returns 0:
-- SELECT COUNT(*) FROM follower_notifications;

-- ============================================================================
-- After all deletions, rebuild with clean data:
-- ============================================================================

-- Rebuild with ONLY correct data (one per user per active offer)
INSERT INTO follower_notifications (
  business_id, 
  user_id, 
  notification_type, 
  title, 
  message, 
  action_url, 
  metadata,
  is_read,
  created_at
)
SELECT DISTINCT ON (o.id, bf.user_id)
  o.business_id,
  bf.user_id,
  'new_offer',
  'New Offer Available!',
  b.business_name || ' has a new offer: ' || o.title,
  '/business/' || o.business_id || '/offers?highlight=' || o.offer_code,
  jsonb_build_object(
    'offer_id', o.id,
    'offer_code', o.offer_code,
    'offerCode', o.offer_code,
    'businessId', o.business_id,
    'offer_title', o.title,
    'valid_until', o.valid_until
  ),
  false,
  NOW()
FROM offers o
JOIN businesses b ON b.id = o.business_id
JOIN business_followers bf ON bf.business_id = o.business_id
WHERE o.status = 'active'
  AND bf.is_active = true
  AND COALESCE((bf.notification_preferences->>'new_offers')::boolean, true) = true;

-- Create unique index to prevent future duplicates
DROP INDEX IF EXISTS idx_unique_offer_notification_per_user;
CREATE UNIQUE INDEX idx_unique_offer_notification_per_user
ON follower_notifications (user_id, (metadata->>'offer_id'))
WHERE notification_type = 'new_offer' AND metadata->>'offer_id' IS NOT NULL;

-- Verify the results
SELECT COUNT(*) as total_rows FROM follower_notifications;

-- Should show 8 rows (4 active offers × 2 followers)
SELECT 
  COUNT(*) as notifications,
  COUNT(DISTINCT metadata->>'offer_id') as unique_offers,
  COUNT(DISTINCT user_id) as unique_users
FROM follower_notifications
WHERE notification_type = 'new_offer';
