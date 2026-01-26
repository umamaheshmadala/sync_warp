-- Function to check if current user is admin (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execute to everyone
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Update `review_reports` policies
DROP POLICY IF EXISTS "Admins can view all reports" ON review_reports;
CREATE POLICY "Admins can view all reports"
ON review_reports
FOR SELECT
TO authenticated
USING (
  is_admin()
);

-- Note: The existing "Admins can update reports" also needs update
DROP POLICY IF EXISTS "Admins can update reports" ON review_reports;
CREATE POLICY "Admins can update reports"
ON review_reports
FOR UPDATE
TO authenticated
USING (
  is_admin()
);

-- Update `business_reviews` policies for Admin view
DROP POLICY IF EXISTS "Admins can view all reviews" ON business_reviews;
CREATE POLICY "Admins can view all reviews"
ON business_reviews
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL) 
  OR (auth.uid() = user_id) 
  OR is_admin()
);

-- Ensure view is capable
ALTER VIEW review_report_counts SET (security_invoker = true);
