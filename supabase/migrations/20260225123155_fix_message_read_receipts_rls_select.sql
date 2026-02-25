-- =================================================================================
-- FIX: Missing SELECT RLS policy on message_read_receipts 
-- =================================================================================
-- Explanation:
-- During Epic 19 (search_path binding on SECURITY DEFINER functions), the 
-- mark_conversation_as_read RPC was forced to evaluate INSERTS under strict RLS
-- checks even when executed as defier.
--
-- Postgres requires SELECT permission on a table to evaluate ON CONFLICT DO UPDATE
-- upserts. Because the "message_read_receipts" table ONLY had an 'r' SELECT policy
-- for "Senders can view read receipts" (m.sender_id = auth.uid()), RECIPIENTS updating
-- their own read receipts via mark_conversation_as_read silently failed with 
-- ERROR: 42501 (violates row-level security policy), freezing unread badges at 99+.
--
-- This migration explicitly grants users permission to read their own receipts.

CREATE POLICY "Users can view their own read receipts"
ON public.message_read_receipts
FOR SELECT
TO public
USING (user_id = (SELECT auth.uid()));
