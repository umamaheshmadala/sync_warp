-- Story 5.2.4: Add review notification types
-- This migration extends the favorite_notifications table to support review notifications

-- Modify the type check constraint to include review notification types
ALTER TABLE favorite_notifications 
DROP CONSTRAINT IF EXISTS favorite_notifications_type_check;

ALTER TABLE favorite_notifications 
ADD CONSTRAINT favorite_notifications_type_check 
CHECK (type IN (
  'reminder', 
  'share_received', 
  'share_accepted', 
  'item_updated',
  'review_posted',      -- NEW: Merchant gets notified when review is posted
  'review_response',    -- NEW: User gets notified when business responds
  'review_edited',      -- NEW: Merchant gets notified when review is edited
  'checkin',            -- NEW: Merchant gets notified when user checks in
  'coupon_collected'    -- NEW: Merchant gets notified when coupon is collected
));

-- Add index for notification types
CREATE INDEX IF NOT EXISTS idx_favorite_notifications_type 
ON favorite_notifications(type);

-- Grant necessary permissions (if needed)
-- The existing RLS policies should handle access control
