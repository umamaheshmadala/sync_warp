-- Indian Cities Database Schema and Seed Data
-- This should be run in your Supabase SQL editor

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
  population INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read cities
CREATE POLICY "Anyone can view cities" ON cities FOR SELECT USING (is_active = true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cities_tier ON cities(tier);
CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);

-- Insert Tier 1 cities
INSERT INTO cities (name, state, tier, population) VALUES
('Mumbai', 'Maharashtra', 'Tier 1', 12442373),
('Delhi', 'Delhi', 'Tier 1', 11007835),
('Bangalore', 'Karnataka', 'Tier 1', 8443675),
('Hyderabad', 'Telangana', 'Tier 1', 6993262),
('Chennai', 'Tamil Nadu', 'Tier 1', 7088000),
('Kolkata', 'West Bengal', 'Tier 1', 4496694),
('Pune', 'Maharashtra', 'Tier 1', 3124458),
('Ahmedabad', 'Gujarat', 'Tier 1', 5633927),
('Jaipur', 'Rajasthan', 'Tier 1', 3073350),
('Surat', 'Gujarat', 'Tier 1', 4467797);

-- Insert Tier 2 cities
INSERT INTO cities (name, state, tier, population) VALUES
('Lucknow', 'Uttar Pradesh', 'Tier 2', 2901474),
('Kanpur', 'Uttar Pradesh', 'Tier 2', 2767031),
('Nagpur', 'Maharashtra', 'Tier 2', 2405421),
('Patna', 'Bihar', 'Tier 2', 1684222),
('Indore', 'Madhya Pradesh', 'Tier 2', 1994397),
('Thane', 'Maharashtra', 'Tier 2', 1841488),
('Bhopal', 'Madhya Pradesh', 'Tier 2', 1798218),
('Visakhapatnam', 'Andhra Pradesh', 'Tier 2', 1730320),
('Vadodara', 'Gujarat', 'Tier 2', 1666703),
('Firozabad', 'Uttar Pradesh', 'Tier 2', 603797),
('Ludhiana', 'Punjab', 'Tier 2', 1618879),
('Rajkot', 'Gujarat', 'Tier 2', 1390640),
('Agra', 'Uttar Pradesh', 'Tier 2', 1585704),
('Siliguri', 'West Bengal', 'Tier 2', 513264),
('Nashik', 'Maharashtra', 'Tier 2', 1486973),
('Faridabad', 'Haryana', 'Tier 2', 1404653),
('Patiala', 'Punjab', 'Tier 2', 446246),
('Ghaziabad', 'Uttar Pradesh', 'Tier 2', 1729000),
('Ludhiana', 'Punjab', 'Tier 2', 1618879),
('Amritsar', 'Punjab', 'Tier 2', 1132761),
('Meerut', 'Uttar Pradesh', 'Tier 2', 1305429),
('Rajkot', 'Gujarat', 'Tier 2', 1390640),
('Kalyan-Dombivli', 'Maharashtra', 'Tier 2', 1193512),
('Vasai-Virar', 'Maharashtra', 'Tier 2', 1221233),
('Varanasi', 'Uttar Pradesh', 'Tier 2', 1198491),
('Srinagar', 'Jammu and Kashmir', 'Tier 2', 975857),
('Aurangabad', 'Maharashtra', 'Tier 2', 1175116),
('Dhanbad', 'Jharkhand', 'Tier 2', 1161561),
('Amritsar', 'Punjab', 'Tier 2', 1132761),
('Navi Mumbai', 'Maharashtra', 'Tier 2', 1119477),
('Allahabad', 'Uttar Pradesh', 'Tier 2', 1117094),
('Ranchi', 'Jharkhand', 'Tier 2', 1073427),
('Haora', 'West Bengal', 'Tier 2', 1077075),
('Coimbatore', 'Tamil Nadu', 'Tier 2', 1061447),
('Jabalpur', 'Madhya Pradesh', 'Tier 2', 1055525),
('Gwalior', 'Madhya Pradesh', 'Tier 2', 1054420),
('Vijayawada', 'Andhra Pradesh', 'Tier 2', 1048240),
('Jodhpur', 'Rajasthan', 'Tier 2', 1033756),
('Madurai', 'Tamil Nadu', 'Tier 2', 1017865),
('Raipur', 'Chhattisgarh', 'Tier 2', 1010087),
('Kota', 'Rajasthan', 'Tier 2', 1001365);

-- Insert Tier 3 cities
INSERT INTO cities (name, state, tier, population) VALUES
('Chandigarh', 'Chandigarh', 'Tier 3', 960787),
('Guwahati', 'Assam', 'Tier 3', 957352),
('Solapur', 'Maharashtra', 'Tier 3', 951118),
('Hubli-Dharwad', 'Karnataka', 'Tier 3', 943788),
('Mysore', 'Karnataka', 'Tier 3', 920550),
('Tiruchirappalli', 'Tamil Nadu', 'Tier 3', 916857),
('Bareilly', 'Uttar Pradesh', 'Tier 3', 898167),
('Aligarh', 'Uttar Pradesh', 'Tier 3', 872575),
('Salem', 'Tamil Nadu', 'Tier 3', 831038),
('Moradabad', 'Uttar Pradesh', 'Tier 3', 889810),
('Warangal', 'Telangana', 'Tier 3', 811844),
('Guntur', 'Andhra Pradesh', 'Tier 3', 743354),
('Bhiwandi', 'Maharashtra', 'Tier 3', 709665),
('Saharanpur', 'Uttar Pradesh', 'Tier 3', 703345),
('Gorakhpur', 'Uttar Pradesh', 'Tier 3', 673446),
('Bikaner', 'Rajasthan', 'Tier 3', 647804),
('Amravati', 'Maharashtra', 'Tier 3', 647057),
('Noida', 'Uttar Pradesh', 'Tier 3', 642381),
('Jamshedpur', 'Jharkhand', 'Tier 3', 629659),
('Bhilai Nagar', 'Chhattisgarh', 'Tier 3', 625697),
('Cuttack', 'Odisha', 'Tier 3', 606007),
('Firozabad', 'Uttar Pradesh', 'Tier 3', 603797),
('Kochi', 'Kerala', 'Tier 3', 601574),
('Nellore', 'Andhra Pradesh', 'Tier 3', 558676),
('Bhavnagar', 'Gujarat', 'Tier 3', 605882),
('Dehradun', 'Uttarakhand', 'Tier 3', 596439),
('Durgapur', 'West Bengal', 'Tier 3', 581409),
('Asansol', 'West Bengal', 'Tier 3', 563917),
('Rourkela', 'Odisha', 'Tier 3', 483418),
('Nanded', 'Maharashtra', 'Tier 3', 550564),
('Kolhapur', 'Maharashtra', 'Tier 3', 549236),
('Ajmer', 'Rajasthan', 'Tier 3', 542580),
('Akola', 'Maharashtra', 'Tier 3', 498032),
('Gulbarga', 'Karnataka', 'Tier 3', 532031),
('Jamnagar', 'Gujarat', 'Tier 3', 529308),
('Ujjain', 'Madhya Pradesh', 'Tier 3', 515215),
('Loni', 'Uttar Pradesh', 'Tier 3', 512296),
('Siliguri', 'West Bengal', 'Tier 3', 513264),
('Jhansi', 'Uttar Pradesh', 'Tier 3', 507293),
('Ulhasnagar', 'Maharashtra', 'Tier 3', 506098),
('Jammu', 'Jammu and Kashmir', 'Tier 3', 502197),
('Sangli-Miraj & Kupwad', 'Maharashtra', 'Tier 3', 502697),
('Mangalore', 'Karnataka', 'Tier 3', 488968),
('Erode', 'Tamil Nadu', 'Tier 3', 498129),
('Belgaum', 'Karnataka', 'Tier 3', 488292),
('Ambattur', 'Tamil Nadu', 'Tier 3', 478134),
('Tirunelveli', 'Tamil Nadu', 'Tier 3', 474838),
('Malegaon', 'Maharashtra', 'Tier 3', 471006),
('Gaya', 'Bihar', 'Tier 3', 470839),
('Jalgaon', 'Maharashtra', 'Tier 3', 460228),
('Udaipur', 'Rajasthan', 'Tier 3', 451735),
('Maheshtala', 'West Bengal', 'Tier 3', 449423);

-- Add comment for documentation
COMMENT ON TABLE cities IS 'Indian cities organized by tier classification for better targeting and analytics';