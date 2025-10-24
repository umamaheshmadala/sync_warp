-- ============================================================================
-- MANUAL CLEANUP SCRIPT FOR follower_notifications
-- Run this directly in Supabase SQL Editor
-- ============================================================================

-- Step 1: Delete EVERYTHING from follower_notifications
-- (We don't disable triggers to avoid system trigger conflicts)
DELETE FROM follower_notifications;

-- Step 2: Delete offer notifications from main notifications table
DELETE FROM notifications WHERE type = 'new_offer';

-- Step 4: Rebuild with ONLY the correct data (one per user per active offer)
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

-- Step 5: Sync to main notifications table
INSERT INTO notifications (
  user_id,
  sender_id,
  type,
  title,
  message,
  metadata,
  is_read,
  created_at
)
SELECT 
  fn.user_id,
  NULL,
  'new_offer'::notification_type,
  fn.title,
  fn.message,
  fn.metadata,
  fn.is_read,
  fn.created_at
FROM follower_notifications fn
WHERE fn.notification_type = 'new_offer';

-- Step 6: Create unique index to prevent future duplicates
DROP INDEX IF EXISTS idx_unique_offer_notification_per_user;
CREATE UNIQUE INDEX idx_unique_offer_notification_per_user
ON follower_notifications (user_id, (metadata->>'offer_id'))
WHERE notification_type = 'new_offer' AND metadata->>'offer_id' IS NOT NULL;

-- Step 7: Drop the problematic sync trigger if it exists
-- This trigger was creating duplicates
DROP TRIGGER IF EXISTS trigger_sync_follower_notification ON follower_notifications;

-- Step 8: Verification query
SELECT 
  'follower_notifications' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT metadata->>'offer_id') as unique_offers,
  COUNT(DISTINCT user_id) as unique_users
FROM follower_notifications
WHERE notification_type = 'new_offer'

UNION ALL

SELECT 
  'Expected' as table_name,
  COUNT(*) as expected_count,
  COUNT(DISTINCT o.id) as active_offers,
  COUNT(DISTINCT bf.user_id) as active_followers
FROM offers o
JOIN business_followers bf ON bf.business_id = o.business_id
WHERE o.status = 'active' 
  AND bf.is_active = true;

-- ============================================================================
-- After running, you should see:
-- follower_notifications: 8 rows (4 offers × 2 followers)
-- Expected: 8 rows
-- ============================================================================
