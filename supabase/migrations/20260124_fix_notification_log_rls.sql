-- ============================================
-- MIGRATION: Fix Notification Log RLS
-- Purpose: Allow authenticated users to insert into notification_log
-- (Required for business owners to send response notifications)
-- ============================================

-- 1. Grant INSERT permission to authenticated role
GRANT INSERT ON notification_log TO authenticated;

-- 2. Drop existing policy if it exists (might have wrong conditions)
DROP POLICY IF EXISTS "Users can insert notification logs" ON notification_log;

-- 3. Create correct RLS policy for inserting notifications
-- WITH CHECK (true) allows ANY authenticated user to insert a row
CREATE POLICY "Users can insert notification logs" ON notification_log
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);
