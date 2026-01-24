-- Add explicit foreign key from business_reviews.user_id to profiles.id
-- This allows PostgREST to resolve the relationship for joins like:
-- .select('*, user:profiles!user_id(*)')

DO $$ 
BEGIN
  -- Check if constraint exists effectively (or just try to add it, ignoring if exists is harder in pure SQL without checking info_schema)
  -- But usually, we can just add it. If user_id already references auth.users, that's fine.
  -- We want it to ALSO reference public.profiles to help PostgREST.
  
  -- However, if there are existing rows where user_id is NOT in profiles, this might fail.
  -- But reviews should only exist for valid users who should have profiles.
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'business_reviews_user_id_fkey_profiles'
  ) THEN
    ALTER TABLE business_reviews
    ADD CONSTRAINT business_reviews_user_id_fkey_profiles
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE; -- If profile is deleted, review is deleted (consistent with user deletion)
  END IF;
END $$;
