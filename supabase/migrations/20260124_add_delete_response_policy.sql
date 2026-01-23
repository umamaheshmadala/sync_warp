
-- ============================================
-- Migration: Allow Business Owners to Delete Responses
-- Story: US-11.2.4.3
-- ============================================

-- Enable RLS (ensure it's on)
ALTER TABLE business_review_responses ENABLE ROW LEVEL SECURITY;

-- 1. Policy for Deletion
-- Business owners can delete their own responses (where responder_id matches auth.uid)
CREATE POLICY "Business owners can delete their responses"
ON business_review_responses
FOR DELETE
TO authenticated
USING (auth.uid() = responder_id);

-- 2. Verify existing policies for Select/Insert/Update (Optional/Good Practice to document)
-- (Assuming they exist from previous stories)
