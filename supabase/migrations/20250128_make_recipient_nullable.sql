-- Migration: Make recipient_id nullable in deal_shares
-- Story 9.7.6: Deal Sharing Analytics
-- Date: 2025-11-28

-- Allow recipient_id to be NULL for link/email shares where recipient is unknown
ALTER TABLE deal_shares 
ALTER COLUMN recipient_id DROP NOT NULL;

COMMENT ON COLUMN deal_shares.recipient_id IS 'Recipient user ID. Can be NULL for link/email shares where recipient is unknown.';
