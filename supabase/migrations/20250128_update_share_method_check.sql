-- Migration: Update share_method check constraint
-- Story 9.7.6: Deal Sharing Analytics
-- Date: 2025-11-28

-- Drop existing check constraint
ALTER TABLE deal_shares 
DROP CONSTRAINT IF EXISTS deal_shares_share_method_check;

-- Add new check constraint with all allowed values
ALTER TABLE deal_shares 
ADD CONSTRAINT deal_shares_share_method_check 
CHECK (share_method IN ('message', 'notification', 'email', 'link'));
