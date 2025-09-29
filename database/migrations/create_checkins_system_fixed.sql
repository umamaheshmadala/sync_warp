-- Migration: Create check-ins system tables and functions (Fixed Version)
-- Created: 2025-01-29

-- Create business_checkins table
CREATE TABLE IF NOT EXISTS public.business_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_latitude DOUBLE PRECISION NOT NULL,
    user_longitude DOUBLE PRECISION NOT NULL,
    distance_from_business DOUBLE PRECISION NOT NULL, -- distance in meters
    verified BOOLEAN DEFAULT FALSE,
    verification_method TEXT DEFAULT 'gps' CHECK (verification_method IN ('gps', 'manual', 'qr_code')),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_checkins_user_id ON public.business_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_business_checkins_business_id ON public.business_checkins(business_id);
CREATE INDEX IF NOT EXISTS idx_business_checkins_checked_in_at ON public.business_checkins(checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_checkins_user_business ON public.business_checkins(user_id, business_id);

-- Create composite index for recent checkins by user
CREATE INDEX IF NOT EXISTS idx_business_checkins_user_recent 
ON public.business_checkins(user_id, checked_in_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.business_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own check-ins" ON public.business_checkins;
DROP POLICY IF EXISTS "Users can create own check-ins" ON public.business_checkins;
DROP POLICY IF EXISTS "Users can update own check-ins" ON public.business_checkins;
DROP POLICY IF EXISTS "Business owners can view checkins" ON public.business_checkins;

-- RLS Policies for business_checkins
-- Users can only see their own check-ins
CREATE POLICY "Users can view own check-ins" ON public.business_checkins
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own check-ins
CREATE POLICY "Users can create own check-ins" ON public.business_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own check-ins
CREATE POLICY "Users can update own check-ins" ON public.business_checkins
    FOR UPDATE USING (auth.uid() = user_id);

-- Business owners can see check-ins for their businesses
CREATE POLICY "Business owners can view checkins" ON public.business_checkins
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM public.businesses WHERE user_id = auth.uid()
        )
    );

-- Create function to find nearby businesses
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
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
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
        b.business_name,
        b.business_type,
        b.address,
        b.latitude,
        b.longitude,
        -- Calculate distance using Haversine formula (returns meters)
        (
            6371000 * acos(
                cos(radians(user_lat)) * 
                cos(radians(b.latitude)) * 
                cos(radians(b.longitude) - radians(user_lng)) + 
                sin(radians(user_lat)) * 
                sin(radians(b.latitude))
            )
        ) as distance,
        b.logo_url,
        b.cover_image_url,
        b.phone,
        b.website,
        COALESCE(checkin_counts.total_checkins, 0) as total_checkins,
        COALESCE(b.status, 'active') as status
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
                cos(radians(user_lat)) * 
                cos(radians(b.latitude)) * 
                cos(radians(b.longitude) - radians(user_lng)) + 
                sin(radians(user_lat)) * 
                sin(radians(b.latitude))
            )
        ) <= (radius_km * 1000)
    ORDER BY distance ASC
    LIMIT result_limit;
END;
$$;

-- Create function to get business check-in analytics
CREATE OR REPLACE FUNCTION public.get_business_checkin_analytics(
    target_business_id UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    business_owner UUID;
    days_interval TEXT;
BEGIN
    -- Check if the current user owns this business
    SELECT user_id INTO business_owner 
    FROM public.businesses 
    WHERE id = target_business_id;
    
    -- Only allow business owners to see analytics
    IF business_owner != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: You can only view analytics for your own businesses';
    END IF;
    
    -- Prepare interval string
    days_interval := days_back || ' days';
    
    -- Generate analytics
    WITH daily_checkins AS (
        SELECT 
            DATE(checked_in_at) as checkin_date,
            COUNT(*) as daily_count,
            COUNT(DISTINCT user_id) as unique_users
        FROM public.business_checkins 
        WHERE business_id = target_business_id 
        AND checked_in_at >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY DATE(checked_in_at)
        ORDER BY checkin_date DESC
    ),
    hourly_checkins AS (
        SELECT 
            EXTRACT(HOUR FROM checked_in_at) as hour,
            COUNT(*) as hourly_count
        FROM public.business_checkins 
        WHERE business_id = target_business_id 
        AND checked_in_at >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY EXTRACT(HOUR FROM checked_in_at)
        ORDER BY hourly_count DESC
        LIMIT 10
    ),
    current_period AS (
        SELECT COUNT(*) as current_count
        FROM public.business_checkins 
        WHERE business_id = target_business_id 
        AND checked_in_at >= NOW() - INTERVAL '1 day' * days_back
    ),
    previous_period AS (
        SELECT COUNT(*) as previous_count
        FROM public.business_checkins 
        WHERE business_id = target_business_id 
        AND checked_in_at >= NOW() - INTERVAL '1 day' * (days_back * 2)
        AND checked_in_at < NOW() - INTERVAL '1 day' * days_back
    )
    SELECT json_build_object(
        'totalCheckins', (
            SELECT COUNT(*) 
            FROM public.business_checkins 
            WHERE business_id = target_business_id 
            AND checked_in_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'uniqueVisitors', (
            SELECT COUNT(DISTINCT user_id) 
            FROM public.business_checkins 
            WHERE business_id = target_business_id 
            AND checked_in_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'avgCheckinsPerDay', (
            SELECT COALESCE(AVG(daily_count), 0) 
            FROM daily_checkins
        ),
        'verifiedPercentage', (
            SELECT COALESCE(
                (COUNT(*) FILTER (WHERE verified = true) * 100.0 / NULLIF(COUNT(*), 0)),
                0
            )
            FROM public.business_checkins 
            WHERE business_id = target_business_id 
            AND checked_in_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'dailyBreakdown', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'date', checkin_date,
                    'count', daily_count,
                    'uniqueUsers', unique_users
                )
            ), '[]'::json)
            FROM daily_checkins
        ),
        'peakHours', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'hour', hour,
                    'count', hourly_count
                )
            ), '[]'::json)
            FROM hourly_checkins
        ),
        'growthRate', (
            -- Calculate growth rate compared to previous period
            SELECT CASE 
                WHEN previous_count = 0 THEN 100.0
                ELSE ((current_count - previous_count) * 100.0 / previous_count)
            END
            FROM current_period, previous_period
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Create function to validate check-in (distance verification)
CREATE OR REPLACE FUNCTION public.validate_checkin_distance(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    target_business_id UUID,
    max_distance_meters DOUBLE PRECISION DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    business_lat DOUBLE PRECISION;
    business_lng DOUBLE PRECISION;
    calculated_distance DOUBLE PRECISION;
    result JSON;
BEGIN
    -- Get business coordinates
    SELECT latitude, longitude 
    INTO business_lat, business_lng
    FROM public.businesses 
    WHERE id = target_business_id AND COALESCE(status, 'active') = 'active';
    
    -- Check if business exists and has coordinates
    IF business_lat IS NULL OR business_lng IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'reason', 'Business not found or location not available',
            'distance', null
        );
    END IF;
    
    -- Calculate distance using Haversine formula
    calculated_distance := (
        6371000 * acos(
            cos(radians(user_lat)) * 
            cos(radians(business_lat)) * 
            cos(radians(business_lng) - radians(user_lng)) + 
            sin(radians(user_lat)) * 
            sin(radians(business_lat))
        )
    );
    
    -- Return validation result
    RETURN json_build_object(
        'valid', calculated_distance <= max_distance_meters,
        'distance', calculated_distance,
        'maxDistance', max_distance_meters,
        'reason', CASE 
            WHEN calculated_distance <= max_distance_meters THEN 'Within valid range'
            ELSE format('Too far away (%.1fm > %.0fm)', calculated_distance, max_distance_meters)
        END
    );
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_business_checkins_updated_at ON public.business_checkins;
CREATE TRIGGER update_business_checkins_updated_at
    BEFORE UPDATE ON public.business_checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_checkins TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_checkin_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_checkin_distance TO authenticated;

-- Create some sample data for testing (optional)
-- This will only run if there are existing businesses
DO $$
DECLARE
    sample_business_id UUID;
    sample_user_id UUID;
BEGIN
    -- Get a sample business ID for testing
    SELECT id INTO sample_business_id FROM public.businesses LIMIT 1;
    
    -- Get current user ID
    SELECT auth.uid() INTO sample_user_id;
    
    -- Only create sample data if we have both business and user
    IF sample_business_id IS NOT NULL AND sample_user_id IS NOT NULL THEN
        -- Check if sample data already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.business_checkins 
            WHERE user_id = sample_user_id AND business_id = sample_business_id
        ) THEN
            -- Insert a few sample check-ins for testing
            INSERT INTO public.business_checkins (
                user_id, 
                business_id, 
                user_latitude, 
                user_longitude, 
                distance_from_business, 
                verified, 
                verification_method,
                checked_in_at
            ) VALUES 
            (
                sample_user_id,
                sample_business_id,
                16.4710657,  -- Sample coordinates (your location)
                80.6146415,
                45.2, -- 45.2 meters away
                true,
                'gps',
                NOW() - INTERVAL '1 hour'
            ),
            (
                sample_user_id,
                sample_business_id,
                16.4712657,  -- Slightly different coordinates
                80.6148415,
                78.5, -- 78.5 meters away
                true,
                'gps',
                NOW() - INTERVAL '2 days'
            );
        END IF;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE public.business_checkins IS 'Stores user check-ins at businesses with GPS verification';
COMMENT ON FUNCTION public.nearby_businesses IS 'Finds businesses within specified radius using GPS coordinates';
COMMENT ON FUNCTION public.get_business_checkin_analytics IS 'Returns analytics data for business check-ins';
COMMENT ON FUNCTION public.validate_checkin_distance IS 'Validates if user is close enough to business for check-in';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Check-in system migration completed successfully!';
    RAISE NOTICE 'Table created: business_checkins';
    RAISE NOTICE 'Functions created: nearby_businesses, get_business_checkin_analytics, validate_checkin_distance';
    RAISE NOTICE 'RLS policies enabled for security';
END $$;