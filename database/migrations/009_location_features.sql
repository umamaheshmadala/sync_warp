-- Migration: Advanced Location Features
-- Creates tables for saved locations and location history

-- Create saved_locations table
CREATE TABLE IF NOT EXISTS saved_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    coordinates POINT NOT NULL, -- PostGIS point type for lat/lng
    type TEXT CHECK (type IN ('home', 'work', 'favorite', 'recent')) NOT NULL DEFAULT 'favorite',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create location_history table
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coordinates POINT NOT NULL, -- PostGIS point type for lat/lng
    address TEXT NOT NULL,
    search_query TEXT, -- Optional search query that led to this location
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_type ON saved_locations(type);
CREATE INDEX IF NOT EXISTS idx_saved_locations_coordinates ON saved_locations USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_saved_locations_updated_at ON saved_locations(updated_at);

CREATE INDEX IF NOT EXISTS idx_location_history_user_id ON location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_coordinates ON location_history USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_location_history_accessed_at ON location_history(accessed_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_locations_updated_at 
    BEFORE UPDATE ON saved_locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate distance between coordinates (using PostGIS)
CREATE OR REPLACE FUNCTION calculate_distance(coord1 POINT, coord2 POINT)
RETURNS FLOAT AS $$
BEGIN
    -- Convert to geometry and calculate distance in meters, then to kilometers
    RETURN ST_Distance(
        ST_GeogFromText('POINT(' || coord1[0] || ' ' || coord1[1] || ')'),
        ST_GeogFromText('POINT(' || coord2[0] || ' ' || coord2[1] || ')')
    ) / 1000.0; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql;

-- View for nearby saved locations (within specified radius)
CREATE OR REPLACE VIEW nearby_saved_locations AS
SELECT 
    sl.*,
    CASE 
        WHEN sl.type = 'home' THEN 1
        WHEN sl.type = 'work' THEN 2
        WHEN sl.type = 'favorite' THEN 3
        ELSE 4
    END as type_priority
FROM saved_locations sl
ORDER BY type_priority, sl.updated_at DESC;

-- Function to get locations within radius
CREATE OR REPLACE FUNCTION get_locations_within_radius(
    user_location POINT,
    radius_km FLOAT DEFAULT 10.0,
    location_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    address TEXT,
    coordinates POINT,
    type TEXT,
    distance_km FLOAT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.id,
        sl.user_id,
        sl.name,
        sl.address,
        sl.coordinates,
        sl.type,
        calculate_distance(user_location, sl.coordinates) as distance_km,
        sl.created_at,
        sl.updated_at
    FROM saved_locations sl
    WHERE 
        (location_user_id IS NULL OR sl.user_id = location_user_id)
        AND calculate_distance(user_location, sl.coordinates) <= radius_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old location history (keep only last 100 entries per user)
CREATE OR REPLACE FUNCTION cleanup_location_history()
RETURNS void AS $$
BEGIN
    DELETE FROM location_history 
    WHERE id IN (
        SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY accessed_at DESC) as row_num
            FROM location_history
        ) t 
        WHERE t.row_num > 100
    );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own saved locations
CREATE POLICY saved_locations_user_policy ON saved_locations
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can only access their own location history
CREATE POLICY location_history_user_policy ON location_history
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON saved_locations TO authenticated;
GRANT ALL ON location_history TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance(POINT, POINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_locations_within_radius(POINT, FLOAT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_location_history() TO authenticated;

-- Create view for location statistics per user
CREATE OR REPLACE VIEW user_location_stats AS
SELECT 
    user_id,
    COUNT(DISTINCT CASE WHEN type = 'home' THEN id END) as home_locations,
    COUNT(DISTINCT CASE WHEN type = 'work' THEN id END) as work_locations,
    COUNT(DISTINCT CASE WHEN type = 'favorite' THEN id END) as favorite_locations,
    COUNT(DISTINCT CASE WHEN type = 'recent' THEN id END) as recent_locations,
    COUNT(DISTINCT id) as total_saved_locations,
    MAX(updated_at) as last_location_update,
    (SELECT COUNT(*) FROM location_history lh WHERE lh.user_id = sl.user_id) as history_count,
    (SELECT MAX(accessed_at) FROM location_history lh WHERE lh.user_id = sl.user_id) as last_location_access
FROM saved_locations sl
GROUP BY user_id;

GRANT SELECT ON user_location_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE saved_locations IS 'User saved locations like home, work, and favorites';
COMMENT ON TABLE location_history IS 'History of locations accessed by users';
COMMENT ON FUNCTION calculate_distance(POINT, POINT) IS 'Calculate distance between two coordinates in kilometers';
COMMENT ON FUNCTION get_locations_within_radius(POINT, FLOAT, UUID) IS 'Find saved locations within specified radius';
COMMENT ON FUNCTION cleanup_location_history() IS 'Clean up old location history entries (keep last 100 per user)';
COMMENT ON VIEW user_location_stats IS 'Statistics about user location usage';

-- Sample data (optional - remove in production)
-- This is just for testing purposes
/*
INSERT INTO saved_locations (user_id, name, address, coordinates, type) VALUES
(
    (SELECT id FROM auth.users LIMIT 1), 
    'Home', 
    '123 Main St, Anytown, State 12345', 
    POINT(-74.0060, 40.7128), 
    'home'
),
(
    (SELECT id FROM auth.users LIMIT 1), 
    'Work Office', 
    '456 Business Ave, Downtown, State 12345', 
    POINT(-74.0100, 40.7200), 
    'work'
),
(
    (SELECT id FROM auth.users LIMIT 1), 
    'Favorite Restaurant', 
    '789 Food Street, Foodie District, State 12345', 
    POINT(-74.0080, 40.7150), 
    'favorite'
);
*/