-- Safe RLS policy fix for business_reviews
-- Drops ALL existing policies first, then recreates them

-- Drop all existing policies (safe - won't error if they don't exist)
DROP POLICY IF EXISTS "Users can manage own reviews" ON business_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON business_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON business_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON business_reviews;
DROP POLICY IF EXISTS "Users can select own reviews" ON business_reviews;
DROP POLICY IF EXISTS "Anyone can read active reviews" ON business_reviews;

-- Now create the correct policies
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

-- Allow users to select their own reviews AND anyone can read active reviews
CREATE POLICY "Users can select own reviews" ON business_reviews
    FOR SELECT
    USING (auth.uid() = user_id OR status = 'active');
