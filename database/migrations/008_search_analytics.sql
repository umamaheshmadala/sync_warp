-- Migration: Search Analytics
-- Creates tables and views for tracking and analyzing search behavior

-- Create search_analytics table for tracking individual search queries
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    search_term TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER NOT NULL DEFAULT 0,
    clicked_result_id UUID NULL,
    clicked_result_type TEXT CHECK (clicked_result_type IN ('business', 'coupon')),
    search_time_ms INTEGER DEFAULT 0,
    session_id TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for search_analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_search_term ON search_analytics(search_term);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_search_analytics_session_id ON search_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_clicked_result ON search_analytics(clicked_result_id, clicked_result_type);

-- Create materialized view for popular search terms
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_search_terms AS
SELECT 
    search_term,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(results_count)) as avg_results,
    MAX(created_at) as last_searched,
    SUM(CASE WHEN clicked_result_id IS NOT NULL THEN 1 ELSE 0 END) as click_count
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
    AND search_term != ''
GROUP BY search_term
ORDER BY search_count DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_search_terms_unique ON popular_search_terms(search_term);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_popular_search_terms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_search_terms;
END;
$$;

-- View for search analytics insights (last 30 days by default)
CREATE OR REPLACE VIEW search_insights_30d AS
SELECT 
    COUNT(*) as total_searches,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(search_time_ms)::INTEGER as avg_search_time_ms,
    AVG(results_count)::NUMERIC(5,2) as avg_results_per_search,
    COUNT(CASE WHEN results_count > 0 THEN 1 END)::NUMERIC(5,2) / COUNT(*)::NUMERIC(5,2) * 100 as success_rate_percent,
    COUNT(CASE WHEN clicked_result_id IS NOT NULL THEN 1 END)::NUMERIC(5,2) / NULLIF(COUNT(CASE WHEN results_count > 0 THEN 1 END), 0)::NUMERIC(5,2) * 100 as conversion_rate_percent
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '30 days';

-- View for hourly search distribution
CREATE OR REPLACE VIEW search_by_hour AS
SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as search_count
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- View for daily search trends
CREATE OR REPLACE VIEW search_trends_daily AS
SELECT 
    DATE(created_at) as search_date,
    COUNT(*) as searches,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(results_count) as avg_results
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY search_date;

-- View for most clicked results
CREATE OR REPLACE VIEW most_clicked_results AS
SELECT 
    clicked_result_type as result_type,
    clicked_result_id as result_id,
    COUNT(*) as click_count,
    COUNT(DISTINCT user_id) as unique_clickers,
    COUNT(DISTINCT search_term) as unique_search_terms
FROM search_analytics
WHERE clicked_result_id IS NOT NULL
    AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY clicked_result_type, clicked_result_id
ORDER BY click_count DESC;

-- View for filter usage analytics
CREATE OR REPLACE VIEW filter_usage_stats AS
WITH filter_keys AS (
    SELECT 
        jsonb_object_keys(filters) as filter_name,
        search_analytics.*
    FROM search_analytics
    WHERE created_at >= NOW() - INTERVAL '30 days'
        AND filters != '{}'::jsonb
)
SELECT 
    filter_name,
    COUNT(*) as usage_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT search_term) as unique_searches
FROM filter_keys
GROUP BY filter_name
ORDER BY usage_count DESC;

-- Row Level Security (RLS) policies
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own search analytics (admin can see all)
CREATE POLICY search_analytics_user_policy ON search_analytics
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email LIKE '%admin%'
        )
    );

-- Policy: Allow insert for authenticated and anonymous users
CREATE POLICY search_analytics_insert_policy ON search_analytics
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR 
        user_id IS NULL
    );

-- Grant permissions
GRANT SELECT ON popular_search_terms TO authenticated, anon;
GRANT SELECT ON search_insights_30d TO authenticated, anon;
GRANT SELECT ON search_by_hour TO authenticated, anon;
GRANT SELECT ON search_trends_daily TO authenticated, anon;
GRANT SELECT ON most_clicked_results TO authenticated, anon;
GRANT SELECT ON filter_usage_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_popular_search_terms() TO authenticated;

-- Create a function to clean up old analytics data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_search_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete search analytics older than 1 year
    DELETE FROM search_analytics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Refresh the materialized view after cleanup
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_search_terms;
END;
$$;

-- Comment on tables and views
COMMENT ON TABLE search_analytics IS 'Tracks individual search queries and user interactions';
COMMENT ON MATERIALIZED VIEW popular_search_terms IS 'Aggregated popular search terms from the last 30 days';
COMMENT ON VIEW search_insights_30d IS 'High-level search analytics for the last 30 days';
COMMENT ON VIEW search_by_hour IS 'Hourly distribution of searches over the last 7 days';
COMMENT ON VIEW search_trends_daily IS 'Daily search trends over the last 30 days';
COMMENT ON VIEW most_clicked_results IS 'Most clicked search results from the last 30 days';
COMMENT ON VIEW filter_usage_stats IS 'Usage statistics for search filters from the last 30 days';
COMMENT ON FUNCTION refresh_popular_search_terms() IS 'Manually refresh the popular search terms materialized view';
COMMENT ON FUNCTION cleanup_old_search_analytics() IS 'Clean up search analytics data older than 1 year';