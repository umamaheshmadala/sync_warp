-- Check and fix contact_hashes table RLS policies

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contact_hashes';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own contact hashes" ON contact_hashes;
DROP POLICY IF EXISTS "Users can insert their own contact hashes" ON contact_hashes;
DROP POLICY IF EXISTS "Users can delete their own contact hashes" ON contact_hashes;
DROP POLICY IF EXISTS "Users can update their own contact hashes" ON contact_hashes;

-- Create proper RLS policies
CREATE POLICY "Users can view their own contact hashes"
    ON contact_hashes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact hashes"
    ON contact_hashes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact hashes"
    ON contact_hashes FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact hashes"
    ON contact_hashes FOR UPDATE
    USING (auth.uid() = user_id);

-- Also add a policy for the SECURITY DEFINER function
CREATE POLICY "Service role can manage all contact hashes"
    ON contact_hashes FOR ALL
    USING (true)
    WITH CHECK (true);
