-- Migration: Mark inactive users offline
-- Story 9.3.7: Online Status & Badges
-- 
-- This function automatically marks users as offline if their last_active
-- timestamp is older than 2 minutes. This handles cases where the client
-- fails to set is_online=false (e.g., browser crash, network issues).

CREATE OR REPLACE FUNCTION mark_inactive_users_offline()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET is_online = false
  WHERE is_online = true
    AND last_active < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_inactive_users_offline() TO authenticated;

-- Note: This function should be called periodically via:
-- 1. A cron job (if using pg_cron extension)
-- 2. A serverless function (e.g., Supabase Edge Function)
-- 3. Client-side polling (less reliable)
--
-- Example pg_cron setup (requires pg_cron extension):
-- SELECT cron.schedule(
--   'mark-inactive-users-offline',
--   '* * * * *', -- Every minute
--   $$SELECT mark_inactive_users_offline()$$
-- );
