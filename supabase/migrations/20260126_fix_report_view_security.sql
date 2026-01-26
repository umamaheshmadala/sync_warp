-- Fix for RLS security on review_report_counts view
-- Without security_invoker = true, the view executes with owner privileges which might not correctly apply RLS or bypass it in unexpected ways, 
-- but crucially in Supabase API, it's often needed for RLS contexts (auth.uid()) to pass through correctly if the view owner isn't the invoking role.
-- Actually, the issue is that standard views run as owner. If owner is postgres, it bypasses RLS? 
-- But if the view uses tables with RLS, and the user is an authenticated user, we want policies to apply to THAT user.
-- Wait, if view runs as postgres, RLS is bypassed -> admin sees all reports (which is what we want?).
-- Make that security_invoker TRUE so it runs as the user (Test User 1).
-- Test User 1 has RLS policy to see reports.
-- So security_invoker = TRUE ensures the RLS policy "Admins can view all reports" is evaluated against Test User 1.

CREATE OR REPLACE VIEW review_report_counts WITH (security_invoker = true) AS
SELECT 
  review_id,
  COUNT(*) as report_count,
  COUNT(*) FILTER (WHERE is_business_owner) as owner_report_count,
  array_agg(DISTINCT reason) as reasons,
  MIN(created_at) as first_reported_at
FROM review_reports
WHERE status = 'pending'
GROUP BY review_id;
