-- 011_story_4_4_enhancements_simple.sql
-- Story 4.4: Search & Discovery + Favorites/Wishlist Management - Database Enhancements (Simplified Version)
-- This version doesn't rely on pg_trgm extension

-- Function to find nearby businesses using simple distance calculation
CREATE OR REPLACE FUNCTION nearby_businesses(
    lat DECIMAL,
    lng DECIMAL,
    radius_km INTEGER DEFAULT 10,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    phone TEXT,
    website TEXT,
    operating_hours JSONB,
    tags TEXT[],
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.description,
        b.category,
        b.logo_url,
        b.cover_image_url,
        b.address,
        b.city,
        b.state,
        b.latitude,
        b.longitude,
        b.phone,
        b.website,
        b.operating_hours,
        b.tags,
        b.status,
        b.created_at,
        b.updated_at,
        -- Simple haversine distance calculation
        ROUND(
            (6371 * acos(
                cos(radians(lat)) * cos(radians(b.latitude)) * 
                cos(radians(b.longitude) - radians(lng)) + 
                sin(radians(lat)) * sin(radians(b.latitude))
            ))::DECIMAL, 
            2
        ) AS distance_km
    FROM businesses b
    WHERE 
        b.status = 'active'
        AND b.latitude IS NOT NULL 
        AND b.longitude IS NOT NULL
        -- Simple bounding box filter for performance
        AND b.latitude BETWEEN (lat - (radius_km / 111.0)) AND (lat + (radius_km / 111.0))
        AND b.longitude BETWEEN (lng - (radius_km / (111.0 * cos(radians(lat))))) AND (lng + (radius_km / (111.0 * cos(radians(lat)))))
    ORDER BY distance_km ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Add basic indexes for better search performance (no trigram dependency)
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_category_status ON businesses(category, status);
CREATE INDEX IF NOT EXISTS idx_businesses_name_text ON businesses(name);
CREATE INDEX IF NOT EXISTS idx_businesses_description_text ON businesses(description);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- Add search analytics indexes (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_analytics') THEN
        CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_search_analytics_term ON search_analytics(search_term);
        CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id, created_at DESC);
    END IF;
END $$;

-- Add coupon search indexes (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
        CREATE INDEX IF NOT EXISTS idx_coupons_status_validity ON coupons(status, valid_until) WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS idx_coupons_usage_trending ON coupons(used_count DESC, created_at DESC) WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS idx_coupons_business_status ON coupons(business_id, status);
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_coupons') THEN
        CREATE INDEX IF NOT EXISTS idx_business_coupons_status_validity ON business_coupons(status, valid_until) WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS idx_business_coupons_usage_trending ON business_coupons(usage_count DESC, created_at DESC) WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS idx_business_coupons_business_status ON business_coupons(business_id, status);
    END IF;
END $$;

-- Function to get trending search terms
CREATE OR REPLACE FUNCTION get_trending_search_terms(
    days_back INTEGER DEFAULT 7,
    term_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    search_term TEXT,
    search_count BIGINT,
    avg_results_count DECIMAL,
    last_searched TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if search_analytics table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_analytics') THEN
        -- Return empty result if table doesn't exist
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        sa.search_term,
        COUNT(*) as search_count,
        AVG(sa.results_count)::DECIMAL as avg_results_count,
        MAX(sa.created_at) as last_searched
    FROM search_analytics sa
    WHERE 
        sa.created_at >= NOW() - (days_back || ' days')::INTERVAL
        AND sa.search_term IS NOT NULL
        AND LENGTH(TRIM(sa.search_term)) > 0
    GROUP BY sa.search_term
    HAVING COUNT(*) > 1
    ORDER BY search_count DESC, last_searched DESC
    LIMIT term_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get business search suggestions (simplified)
CREATE OR REPLACE FUNCTION get_business_search_suggestions(
    search_input TEXT,
    suggestion_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    suggestion_type TEXT,
    suggestion_text TEXT,
    match_count INTEGER,
    category TEXT
) AS $$
BEGIN
    -- Validate input
    IF search_input IS NULL OR LENGTH(TRIM(search_input)) = 0 THEN
        RETURN;
    END IF;

    -- Return business name suggestions
    RETURN QUERY
    SELECT 
        'business'::TEXT as suggestion_type,
        b.name as suggestion_text,
        1 as match_count,
        COALESCE(b.category, '') as category
    FROM businesses b
    WHERE 
        b.status = 'active'
        AND b.name IS NOT NULL
        AND b.name ILIKE '%' || search_input || '%'
    ORDER BY 
        CASE 
            WHEN LOWER(b.name) LIKE LOWER(search_input) || '%' THEN 1
            WHEN LOWER(b.name) LIKE '%' || LOWER(search_input) || '%' THEN 2
            ELSE 3
        END,
        LENGTH(b.name)
    LIMIT suggestion_limit;

    -- Return category suggestions from businesses table
    RETURN QUERY
    SELECT 
        'category'::TEXT as suggestion_type,
        b.category as suggestion_text,
        COUNT(*)::INTEGER as match_count,
        b.category as category
    FROM businesses b
    WHERE 
        b.status = 'active'
        AND b.category IS NOT NULL
        AND b.category ILIKE '%' || search_input || '%'
    GROUP BY b.category
    ORDER BY 
        CASE 
            WHEN LOWER(b.category) LIKE LOWER(search_input) || '%' THEN 1
            ELSE 2
        END,
        COUNT(*) DESC,
        LENGTH(b.category)
    LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a view for business search with computed fields
CREATE OR REPLACE VIEW business_search_view AS
SELECT 
    b.*,
    -- Computed rating from reviews (if reviews table exists)
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_reviews') THEN
            COALESCE(
                (SELECT AVG(rating)::DECIMAL(3,1) FROM business_reviews br WHERE br.business_id = b.id),
                0
            )
        ELSE 0
    END as avg_rating,
    -- Review count (if reviews table exists)
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_reviews') THEN
            COALESCE(
                (SELECT COUNT(*) FROM business_reviews br WHERE br.business_id = b.id),
                0
            )
        ELSE 0
    END as review_count,
    -- Active offers count (check both possible coupon table names)
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
            COALESCE(
                (SELECT COUNT(*) FROM coupons c WHERE c.business_id = b.id AND c.status = 'active' AND c.valid_until > NOW()),
                0
            )
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_coupons') THEN
            COALESCE(
                (SELECT COUNT(*) FROM business_coupons c WHERE c.business_id = b.id AND c.status = 'active' AND c.valid_until > NOW()),
                0
            )
        ELSE 0
    END as active_offers_count,
    -- Is currently open (simplified - assumes Monday to Sunday)
    CASE 
        WHEN b.operating_hours IS NOT NULL THEN
            CASE EXTRACT(dow FROM NOW())
                WHEN 0 THEN COALESCE((b.operating_hours->>'sunday'->>'isOpen')::BOOLEAN, false)
                WHEN 1 THEN COALESCE((b.operating_hours->>'monday'->>'isOpen')::BOOLEAN, false)
                WHEN 2 THEN COALESCE((b.operating_hours->>'tuesday'->>'isOpen')::BOOLEAN, false)
                WHEN 3 THEN COALESCE((b.operating_hours->>'wednesday'->>'isOpen')::BOOLEAN, false)
                WHEN 4 THEN COALESCE((b.operating_hours->>'thursday'->>'isOpen')::BOOLEAN, false)
                WHEN 5 THEN COALESCE((b.operating_hours->>'friday'->>'isOpen')::BOOLEAN, false)
                WHEN 6 THEN COALESCE((b.operating_hours->>'saturday'->>'isOpen')::BOOLEAN, false)
                ELSE false
            END
        ELSE false
    END as is_open_now
FROM businesses b
WHERE b.status = 'active';

-- Add comments for documentation
COMMENT ON FUNCTION nearby_businesses IS 'Find businesses within a specified radius using haversine distance calculation';
COMMENT ON FUNCTION get_trending_search_terms IS 'Get trending search terms based on search analytics data (if table exists)';
COMMENT ON FUNCTION get_business_search_suggestions IS 'Get search suggestions for businesses and categories';
COMMENT ON VIEW business_search_view IS 'Enhanced business view with computed search-relevant fields';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION nearby_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_search_terms TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_business_search_suggestions TO authenticated, anon;
GRANT SELECT ON business_search_view TO authenticated, anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Story 4.4 database enhancements applied successfully!';
    RAISE NOTICE 'Functions created: nearby_businesses, get_trending_search_terms, get_business_search_suggestions';
    RAISE NOTICE 'View created: business_search_view';
    RAISE NOTICE 'Indexes created for optimal search performance';
END $$;