-- Ensure security_invoker is set (redundant but safe)
ALTER VIEW review_report_counts SET (security_invoker = true);

-- Explicitly grant permissions
GRANT SELECT ON review_report_counts TO authenticated;
GRANT SELECT ON review_report_counts TO service_role;
GRANT SELECT ON review_report_counts TO anon; -- For dev/testing if needed, though mostly authenticated used

-- Ensure underlying table permissions are also correct (though usually covered by RLS)
GRANT SELECT ON review_reports TO authenticated;
GRANT SELECT ON review_reports TO service_role;
