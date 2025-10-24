-- Fix offer notification trigger to prevent duplicates
-- Run this in Supabase SQL Editor

-- Drop the old trigger that fires on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_notify_followers_new_offer ON offers;

-- Create new trigger that ONLY fires on INSERT when status='active'
-- This prevents notifications on every offer update (analytics, view counts, etc.)
CREATE TRIGGER trigger_notify_followers_new_offer_insert
AFTER INSERT ON offers
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION notify_followers_new_offer();

-- Create separate trigger for status changes to active
-- This only fires when status CHANGES from non-active to active
CREATE TRIGGER trigger_notify_followers_new_offer_update
AFTER UPDATE ON offers
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM 'active' AND NEW.status = 'active')
EXECUTE FUNCTION notify_followers_new_offer();

-- Verify the triggers were created
SELECT tgname, tgenabled, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'offers'::regclass 
  AND tgname LIKE '%notify%';
