-- Fix the nearby_businesses function data type mismatch
-- The error indicates column 2 (business_name) has a type mismatch

-- Drop and recreate the function with corrected data types
DROP FUNCTION IF EXISTS public.nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION public.nearby_businesses(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 2.0,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    business_name VARCHAR(255), -- Match the actual column type
    business_type VARCHAR(255), -- Match the actual column type
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    logo_url TEXT,
    cover_image_url TEXT,
    phone VARCHAR(50),
    website TEXT,
    total_checkins BIGINT,
    status VARCHAR(50) -- Match the actual column type
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.business_name,
        b.business_type,
        b.address,
        b.latitude,
        b.longitude,
        -- Calculate distance using Haversine formula (returns meters)
        (
            6371000 * acos(
                GREATEST(-1, LEAST(1,
                    cos(radians(user_lat)) * 
                    cos(radians(b.latitude)) * 
                    cos(radians(b.longitude) - radians(user_lng)) + 
                    sin(radians(user_lat)) * 
                    sin(radians(b.latitude))
                ))
            )
        ) as distance,
        b.logo_url,
        b.cover_image_url,
        b.phone,
        b.website,
        COALESCE(checkin_counts.total_checkins, 0) as total_checkins,
        COALESCE(b.status::VARCHAR(50), 'active') as status
    FROM public.businesses b
    LEFT JOIN (
        SELECT 
            business_id, 
            COUNT(*) as total_checkins
        FROM public.business_checkins 
        GROUP BY business_id
    ) checkin_counts ON b.id = checkin_counts.business_id
    WHERE 
        b.latitude IS NOT NULL 
        AND b.longitude IS NOT NULL
        AND COALESCE(b.status, 'active') = 'active'
        -- Filter by distance (convert km to meters for comparison)
        AND (
            6371000 * acos(
                GREATEST(-1, LEAST(1,
                    cos(radians(user_lat)) * 
                    cos(radians(b.latitude)) * 
                    cos(radians(b.longitude) - radians(user_lng)) + 
                    sin(radians(user_lat)) * 
                    sin(radians(b.latitude))
                ))
            )
        ) <= (radius_km * 1000)
    ORDER BY distance ASC
    LIMIT result_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.nearby_businesses TO authenticated;

-- Test the function with your coordinates
SELECT * FROM public.nearby_businesses(16.4710657, 80.6146415, 2.0, 10);