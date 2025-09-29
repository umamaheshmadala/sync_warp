-- Final fix for nearby_businesses function
-- This version matches the actual database column types

-- First, let's check what the actual column types are
-- Run this to see your businesses table structure:
-- SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale
-- FROM information_schema.columns 
-- WHERE table_name = 'businesses' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

-- Create the function with correct return types that match your actual table
CREATE OR REPLACE FUNCTION public.nearby_businesses(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 2.0,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    business_name TEXT,
    business_type TEXT,
    address TEXT,
    latitude NUMERIC, -- Match actual column type
    longitude NUMERIC, -- Match actual column type
    distance DOUBLE PRECISION,
    logo_url TEXT,
    cover_image_url TEXT,
    phone TEXT,
    website TEXT,
    total_checkins BIGINT,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.business_name::TEXT,
        b.business_type::TEXT,
        b.address,
        b.latitude,
        b.longitude,
        -- Calculate distance using Haversine formula (returns meters)
        -- Cast to DOUBLE PRECISION to ensure correct type
        CAST((
            6371000 * acos(
                GREATEST(-1::DOUBLE PRECISION, LEAST(1::DOUBLE PRECISION,
                    cos(radians(user_lat)) * 
                    cos(radians(b.latitude::DOUBLE PRECISION)) * 
                    cos(radians(b.longitude::DOUBLE PRECISION) - radians(user_lng)) + 
                    sin(radians(user_lat)) * 
                    sin(radians(b.latitude::DOUBLE PRECISION))
                ))
            )
        ) AS DOUBLE PRECISION) as distance,
        b.logo_url,
        b.cover_image_url,
        b.phone::TEXT,
        b.website,
        COALESCE(checkin_counts.total_checkins, 0) as total_checkins,
        COALESCE(b.status::TEXT, 'active'::TEXT) as status
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
        AND COALESCE(b.status::TEXT, 'active') = 'active'
        -- Filter by distance (convert km to meters for comparison)
        AND CAST((
            6371000 * acos(
                GREATEST(-1::DOUBLE PRECISION, LEAST(1::DOUBLE PRECISION,
                    cos(radians(user_lat)) * 
                    cos(radians(b.latitude::DOUBLE PRECISION)) * 
                    cos(radians(b.longitude::DOUBLE PRECISION) - radians(user_lng)) + 
                    sin(radians(user_lat)) * 
                    sin(radians(b.latitude::DOUBLE PRECISION))
                ))
            )
        ) AS DOUBLE PRECISION) <= (radius_km * 1000)
    ORDER BY 
        CAST((
            6371000 * acos(
                GREATEST(-1::DOUBLE PRECISION, LEAST(1::DOUBLE PRECISION,
                    cos(radians(user_lat)) * 
                    cos(radians(b.latitude::DOUBLE PRECISION)) * 
                    cos(radians(b.longitude::DOUBLE PRECISION) - radians(user_lng)) + 
                    sin(radians(user_lat)) * 
                    sin(radians(b.latitude::DOUBLE PRECISION))
                ))
            )
        ) AS DOUBLE PRECISION) ASC
    LIMIT result_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.nearby_businesses TO authenticated;

-- Test the function
DO $$
BEGIN
    -- Test with your coordinates
    IF EXISTS (SELECT 1 FROM public.businesses LIMIT 1) THEN
        RAISE NOTICE 'Testing nearby_businesses function...';
        PERFORM * FROM public.nearby_businesses(16.4710657, 80.6146415, 50.0, 5);
        RAISE NOTICE 'Function test completed successfully!';
    ELSE
        RAISE NOTICE 'No businesses found in database for testing';
    END IF;
END $$;