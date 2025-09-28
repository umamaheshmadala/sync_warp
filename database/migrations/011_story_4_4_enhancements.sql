-- 011_story_4_4_enhancements.sql
-- Story 4.4: Search & Discovery + Favorites/Wishlist Management - Database Enhancements

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

-- Enable trigram extension for better text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_category_status ON businesses(category, status);

-- Add trigram indexes only if the extension is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        -- Create trigram indexes for better text search
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_name_trgm') THEN
            CREATE INDEX idx_businesses_name_trgm ON businesses USING gin(name gin_trgm_ops);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_description_trgm') THEN
            CREATE INDEX idx_businesses_description_trgm ON businesses USING gin(description gin_trgm_ops);
        END IF;
    ELSE
        -- Fallback to regular indexes if trigram extension is not available
        CREATE INDEX IF NOT EXISTS idx_businesses_name_text ON businesses(name);
        CREATE INDEX IF NOT EXISTS idx_businesses_description_text ON businesses(description);
    END IF;
END $$;

-- Add search analytics indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_term ON search_analytics(search_term);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id, created_at DESC);

-- Add coupon search indexes
CREATE INDEX IF NOT EXISTS idx_coupons_status_validity ON coupons(status, valid_until) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_coupons_usage_trending ON coupons(used_count DESC, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_coupons_business_status ON coupons(business_id, status);

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

-- Function to get business search suggestions
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

    -- Return category suggestions if business_categories table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_categories') THEN
        RETURN QUERY
        SELECT 
            'category'::TEXT as suggestion_type,
            bc.name as suggestion_text,
            COUNT(b.id)::INTEGER as match_count,
            bc.name as category
        FROM business_categories bc
        LEFT JOIN businesses b ON b.category = bc.name AND b.status = 'active'
        WHERE bc.name ILIKE '%' || search_input || '%'
        GROUP BY bc.name
        ORDER BY 
            CASE 
                WHEN LOWER(bc.name) LIKE LOWER(search_input) || '%' THEN 1
                ELSE 2
            END,
            COUNT(b.id) DESC,
            LENGTH(bc.name)
        LIMIT suggestion_limit;
    ELSE
        -- Fallback: return distinct categories from businesses table
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
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update business categories with more detailed information if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_categories') THEN
        -- Add description and icon columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_categories' AND column_name = 'description') THEN
            ALTER TABLE business_categories ADD COLUMN description TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_categories' AND column_name = 'icon') THEN
            ALTER TABLE business_categories ADD COLUMN icon TEXT;
        END IF;

        -- Update existing categories with descriptions
        UPDATE business_categories SET 
            description = CASE 
                WHEN name = 'Restaurants' THEN 'Food and dining establishments'
                WHEN name = 'Retail' THEN 'Shops and stores for goods'
                WHEN name = 'Services' THEN 'Professional and personal services'
                WHEN name = 'Entertainment' THEN 'Fun activities and venues'
                WHEN name = 'Health & Medical' THEN 'Healthcare and wellness services'
                WHEN name = 'Education' THEN 'Schools and learning centers'
                WHEN name = 'Automotive' THEN 'Car services and dealerships'
                WHEN name = 'Home & Garden' THEN 'Home improvement and gardening'
                WHEN name = 'Technology' THEN 'Tech services and electronics'
                WHEN name = 'Beauty & Wellness' THEN 'Beauty salons and wellness centers'
                ELSE 'Business category'
            END,
            icon = CASE 
                WHEN name = 'Restaurants' THEN 'utensils'
                WHEN name = 'Retail' THEN 'shopping-bag'
                WHEN name = 'Services' THEN 'briefcase'
                WHEN name = 'Entertainment' THEN 'music'
                WHEN name = 'Health & Medical' THEN 'heart'
                WHEN name = 'Education' THEN 'graduation-cap'
                WHEN name = 'Automotive' THEN 'car'
                WHEN name = 'Home & Garden' THEN 'home'
                WHEN name = 'Technology' THEN 'smartphone'
                WHEN name = 'Beauty & Wellness' THEN 'sparkles'
                ELSE 'building'
            END
        WHERE description IS NULL OR icon IS NULL;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION nearby_businesses IS 'Find businesses within a specified radius using haversine distance calculation';
COMMENT ON FUNCTION get_trending_search_terms IS 'Get trending search terms based on search analytics data';
COMMENT ON FUNCTION get_business_search_suggestions IS 'Get search suggestions for businesses and categories';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION nearby_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_search_terms TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_search_suggestions TO authenticated;

-- Create a view for business search with computed fields
CREATE OR REPLACE VIEW business_search_view AS
SELECT 
    b.*,
    -- Computed rating from reviews
    COALESCE(
        (SELECT AVG(rating)::DECIMAL(3,1) FROM business_reviews br WHERE br.business_id = b.id),
        0
    ) as avg_rating,
    -- Review count
    COALESCE(
        (SELECT COUNT(*) FROM business_reviews br WHERE br.business_id = b.id),
        0
    ) as review_count,
    -- Active offers count
    COALESCE(
        (SELECT COUNT(*) FROM coupons c WHERE c.business_id = b.id AND c.status = 'active' AND c.valid_until > NOW()),
        0
    ) as active_offers_count,
    -- Is currently open (simplified - assumes Monday to Sunday)
    CASE 
        WHEN b.operating_hours IS NOT NULL THEN
            CASE EXTRACT(dow FROM NOW())
                WHEN 0 THEN (b.operating_hours->>'sunday'->>'isOpen')::BOOLEAN
                WHEN 1 THEN (b.operating_hours->>'monday'->>'isOpen')::BOOLEAN
                WHEN 2 THEN (b.operating_hours->>'tuesday'->>'isOpen')::BOOLEAN
                WHEN 3 THEN (b.operating_hours->>'wednesday'->>'isOpen')::BOOLEAN
                WHEN 4 THEN (b.operating_hours->>'thursday'->>'isOpen')::BOOLEAN
                WHEN 5 THEN (b.operating_hours->>'friday'->>'isOpen')::BOOLEAN
                WHEN 6 THEN (b.operating_hours->>'saturday'->>'isOpen')::BOOLEAN
                ELSE false
            END
        ELSE false
    END as is_open_now
FROM businesses b
WHERE b.status = 'active';

COMMENT ON VIEW business_search_view IS 'Enhanced business view with computed search-relevant fields';

-- Grant access to the view
GRANT SELECT ON business_search_view TO authenticated;