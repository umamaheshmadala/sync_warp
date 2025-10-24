-- Copy this entire block and run in Supabase SQL Editor

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

-- Verify
SELECT COUNT(*) as total FROM follower_notifications;
