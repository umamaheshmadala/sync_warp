-- Fix RLS policy for business_reviews to allow inserts
-- The existing policy "Users can manage own reviews" uses FOR ALL which should work,
-- but we'll make it more explicit by separating INSERT and other operations

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage own reviews" ON business_reviews;

-- Create separate policies for better clarity
-- Allow users to insert their own reviews
CREATE POLICY "Users can insert own reviews" ON business_reviews
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
CREATE POLICY "Users can update own reviews" ON business_reviews
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reviews
CREATE POLICY "Users can delete own reviews" ON business_reviews
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Allow users to select their own reviews (in addition to the public policy)
CREATE POLICY "Users can select own reviews" ON business_reviews
    FOR SELECT
    USING (auth.uid() = user_id OR status = 'active');
