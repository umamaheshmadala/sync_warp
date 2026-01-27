-- Verify RLS visibility for testuser1
do $$
declare
  v_user_id uuid := 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2';
  v_count int;
begin
  -- Simulate session context (this is tricky in a DO block without proper extensions, but we can query using the policy logic directly)
  
  -- Check is_admin() logic directly
  raise notice 'is_admin check: %', (
    SELECT EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = v_user_id
        AND role = 'admin'::user_role
    )
  );
  
  -- Check row visibility using the exact logic from the policy "Admins can view all reviews"
  -- qual: ((deleted_at IS NULL) OR (auth.uid() = user_id) OR is_admin())
  
  SELECT count(*) INTO v_count
  FROM business_reviews
  WHERE moderation_status = 'pending'
  AND (
    deleted_at IS NULL 
    OR user_id = v_user_id 
    OR (
        SELECT EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = v_user_id
            AND role = 'admin'::user_role
        )
    )
  );
  
  raise notice 'Visible Pending Reviews: %', v_count;
end $$;
