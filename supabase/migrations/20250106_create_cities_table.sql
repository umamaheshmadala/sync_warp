-- Migration: Create Indian Cities Table
-- Description: Stores 50 major Indian cities with tier classification
-- Author: SynC Development Team
-- Date: 2025-01-06

-- Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Metro', 'Major', 'Growing')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  population BIGINT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(name, state)
);

-- Create index for faster tier-based queries
CREATE INDEX IF NOT EXISTS idx_cities_tier ON public.cities(tier);
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_active ON public.cities(is_active);

-- Enable Row Level Security
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cities
CREATE POLICY "Cities are viewable by all authenticated users" ON public.cities
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Only admins can insert/update/delete cities
CREATE POLICY "Only admins can modify cities" ON public.cities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert 50 Indian Cities (Metro: 8, Major: 18, Growing: 24)
INSERT INTO public.cities (name, state, tier, latitude, longitude, population) VALUES
  -- Metro Cities (Tier 1) - 8 cities
  ('Mumbai', 'Maharashtra', 'Metro', 19.0760, 72.8777, 20961000),
  ('Delhi', 'Delhi', 'Metro', 28.7041, 77.1025, 30291000),
  ('Bangalore', 'Karnataka', 'Metro', 12.9716, 77.5946, 12327000),
  ('Hyderabad', 'Telangana', 'Metro', 17.3850, 78.4867, 10494000),
  ('Chennai', 'Tamil Nadu', 'Metro', 13.0827, 80.2707, 10971000),
  ('Kolkata', 'West Bengal', 'Metro', 22.5726, 88.3639, 14850000),
  ('Pune', 'Maharashtra', 'Metro', 18.5204, 73.8567, 6630000),
  ('Ahmedabad', 'Gujarat', 'Metro', 23.0225, 72.5714, 7681000),

  -- Major Cities (Tier 2) - 18 cities
  ('Jaipur', 'Rajasthan', 'Major', 26.9124, 75.7873, 3073000),
  ('Surat', 'Gujarat', 'Major', 21.1702, 72.8311, 6081000),
  ('Lucknow', 'Uttar Pradesh', 'Major', 26.8467, 80.9462, 3382000),
  ('Kanpur', 'Uttar Pradesh', 'Major', 26.4499, 80.3319, 3067000),
  ('Nagpur', 'Maharashtra', 'Major', 21.1458, 79.0882, 2497000),
  ('Indore', 'Madhya Pradesh', 'Major', 22.7196, 75.8577, 2201000),
  ('Thane', 'Maharashtra', 'Major', 19.2183, 72.9781, 1841000),
  ('Bhopal', 'Madhya Pradesh', 'Major', 23.2599, 77.4126, 1883000),
  ('Visakhapatnam', 'Andhra Pradesh', 'Major', 17.6868, 83.2185, 1730000),
  ('Patna', 'Bihar', 'Major', 25.5941, 85.1376, 2046000),
  ('Vadodara', 'Gujarat', 'Major', 22.3072, 73.1812, 1817000),
  ('Ludhiana', 'Punjab', 'Major', 30.9010, 75.8573, 1618000),
  ('Agra', 'Uttar Pradesh', 'Major', 27.1767, 78.0081, 1585000),
  ('Nashik', 'Maharashtra', 'Major', 19.9975, 73.7898, 1486000),
  ('Faridabad', 'Haryana', 'Major', 28.4089, 77.3178, 1394000),
  ('Meerut', 'Uttar Pradesh', 'Major', 28.9845, 77.7064, 1305000),
  ('Rajkot', 'Gujarat', 'Major', 22.3039, 70.8022, 1286000),
  ('Varanasi', 'Uttar Pradesh', 'Major', 25.3176, 82.9739, 1201000),

  -- Growing Cities (Tier 3) - 24 cities
  ('Ghaziabad', 'Uttar Pradesh', 'Growing', 28.6692, 77.4538, 1199000),
  ('Amritsar', 'Punjab', 'Growing', 31.6340, 74.8723, 1132000),
  ('Allahabad', 'Uttar Pradesh', 'Growing', 25.4358, 81.8463, 1117000),
  ('Ranchi', 'Jharkhand', 'Growing', 23.3441, 85.3096, 1073000),
  ('Jabalpur', 'Madhya Pradesh', 'Growing', 23.1815, 79.9864, 1055000),
  ('Coimbatore', 'Tamil Nadu', 'Growing', 11.0168, 76.9558, 1050000),
  ('Gwalior', 'Madhya Pradesh', 'Growing', 26.2183, 78.1828, 1053000),
  ('Vijayawada', 'Andhra Pradesh', 'Growing', 16.5062, 80.6480, 1048000),
  ('Jodhpur', 'Rajasthan', 'Growing', 26.2389, 73.0243, 1033000),
  ('Madurai', 'Tamil Nadu', 'Growing', 9.9252, 78.1198, 1017000),
  ('Raipur', 'Chhattisgarh', 'Growing', 21.2514, 81.6296, 1010000),
  ('Kota', 'Rajasthan', 'Growing', 25.2138, 75.8648, 1001000),
  ('Chandigarh', 'Chandigarh', 'Growing', 30.7333, 76.7794, 1055000),
  ('Mysore', 'Karnataka', 'Growing', 12.2958, 76.6394, 920000),
  ('Bareilly', 'Uttar Pradesh', 'Growing', 28.3670, 79.4304, 903000),
  ('Gurgaon', 'Haryana', 'Growing', 28.4595, 77.0266, 876000),
  ('Aligarh', 'Uttar Pradesh', 'Growing', 27.8974, 78.0880, 872000),
  ('Jalandhar', 'Punjab', 'Growing', 31.3260, 75.5762, 862000),
  ('Bhubaneswar', 'Odisha', 'Growing', 20.2961, 85.8245, 837000),
  ('Salem', 'Tamil Nadu', 'Growing', 11.6643, 78.1460, 831000),
  ('Warangal', 'Telangana', 'Growing', 17.9689, 79.5941, 811000),
  ('Tiruchirappalli', 'Tamil Nadu', 'Growing', 10.7905, 78.7047, 847000),
  ('Kochi', 'Kerala', 'Growing', 9.9312, 76.2673, 677000),
  ('Dehradun', 'Uttarakhand', 'Growing', 30.3165, 78.0322, 714000);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER cities_updated_at_trigger
  BEFORE UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cities_updated_at();

-- Grant permissions
GRANT SELECT ON public.cities TO authenticated;
GRANT SELECT ON public.cities TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Cities table created successfully with 50 Indian cities';
  RAISE NOTICE '   - Metro cities: 8';
  RAISE NOTICE '   - Major cities: 18';
  RAISE NOTICE '   - Growing cities: 24';
END $$;
