-- Migration: Add INSERT policy for notifications table
-- Story 9.2.6: Deal Sharing Integration
-- 
-- Allows authenticated users to send notifications to other users
-- This is needed for deal sharing, friend requests, etc.

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can send notifications to others" ON notifications;

-- Create INSERT policy that allows authenticated users to send notifications to any user
CREATE POLICY "Users can send notifications to others"
ON notifications
FOR INSERT
TO public
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must be the sender of the notification
  auth.uid() = sender_id
);

-- Add helpful comment
COMMENT ON POLICY "Users can send notifications to others" ON notifications IS 
'Allows authenticated users to send notifications to other users. The sender_id must match the authenticated user ID.';
