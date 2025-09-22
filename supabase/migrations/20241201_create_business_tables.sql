-- Migration: Create business-related tables
-- Created: 2024-12-01
-- Description: Creates all tables and functions needed for Epic 4: Business Features

-- Business Categories Table (for standardized categories)
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_name VARCHAR(50), -- For UI icons
    parent_category_id UUID REFERENCES business_categories(id),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Profiles Table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic Business Information
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL, -- Restaurant, Retail, Service, etc.
    description TEXT,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    
    -- Location Information
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Operating Hours (JSON format)
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "18:00", "closed": false},
        "saturday": {"open": "09:00", "close": "18:00", "closed": false},
        "sunday": {"open": "09:00", "close": "18:00", "closed": true}
    }',
    
    -- Holiday Schedules
    holidays JSONB DEFAULT '[]', -- Array of holiday objects with dates and closed status
    
    -- Business Categories and Tags
    categories TEXT[] DEFAULT '{}', -- Array of business categories
    tags TEXT[] DEFAULT '{}', -- Array of searchable tags
    
    -- Visual Assets
    logo_url TEXT,
    cover_image_url TEXT,
    gallery_images TEXT[] DEFAULT '{}', -- Array of image URLs
    
    -- Business Status and Verification
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Social and Contact Information
    website_url TEXT,
    social_media JSONB DEFAULT '{}', -- Facebook, Instagram, Twitter URLs
    
    -- Business Metrics
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Products/Services Table
CREATE TABLE IF NOT EXISTS business_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    -- Product Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Pricing
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',
    price_type VARCHAR(20) DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'starting_from', 'range', 'contact')),
    
    -- Product Status
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- For trending/featured products
    display_order INTEGER DEFAULT 0,
    
    -- Media
    image_urls TEXT[] DEFAULT '{}',
    video_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Verification Documents Table
CREATE TABLE IF NOT EXISTS business_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    -- Document Information
    document_type VARCHAR(50) NOT NULL, -- GST, License, PAN, etc.
    document_number VARCHAR(100),
    document_url TEXT NOT NULL, -- File storage URL
    
    -- Verification Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    verified_by UUID REFERENCES auth.users(id), -- Admin who verified
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Business Reviews Table (Binary System as per project brief)
CREATE TABLE IF NOT EXISTS business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Review Content (Binary System)
    recommendation BOOLEAN NOT NULL, -- true = recommend (👍), false = don't recommend (👎)
    review_text TEXT CHECK (char_length(review_text) <= 90), -- 30 words ≈ 90 characters max
    
    -- Review Metadata
    checkin_verified BOOLEAN DEFAULT false, -- GPS check-in required
    checkin_id UUID, -- Reference to check-in record
    
    -- Moderation
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'hidden', 'deleted')),
    flagged_reason TEXT,
    moderated_by UUID REFERENCES auth.users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(business_id, user_id) -- One review per user per business
);

-- Business Check-ins Table (for GPS verification)
CREATE TABLE IF NOT EXISTS business_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Location Data
    user_latitude DECIMAL(10, 8) NOT NULL,
    user_longitude DECIMAL(11, 8) NOT NULL,
    distance_from_business DECIMAL(8,2), -- Distance in meters
    
    -- Check-in Status
    verified BOOLEAN DEFAULT false,
    verification_method VARCHAR(20) DEFAULT 'gps' CHECK (verification_method IN ('gps', 'qr_code', 'manual')),
    
    -- Metadata
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_categories ON businesses USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_business_products_business_id ON business_products(business_id);
CREATE INDEX IF NOT EXISTS idx_business_products_featured ON business_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_user_id ON business_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_business_checkins_business_id ON business_checkins(business_id);
CREATE INDEX IF NOT EXISTS idx_business_checkins_user_id ON business_checkins(user_id);

-- Row Level Security (RLS) Policies

-- Businesses table policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their own businesses
CREATE POLICY "Business owners can manage own businesses" ON businesses
    FOR ALL USING (auth.uid() = user_id);

-- Anyone can read active/verified businesses
CREATE POLICY "Anyone can read active businesses" ON businesses
    FOR SELECT USING (status = 'active');

-- Business Products policies
ALTER TABLE business_products ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their products
CREATE POLICY "Business owners can manage products" ON business_products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_products.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- Anyone can read available products from active businesses
CREATE POLICY "Anyone can read available products" ON business_products
    FOR SELECT USING (
        is_available = true AND 
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_products.business_id 
            AND businesses.status = 'active'
        )
    );

-- Business Reviews policies
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reviews
CREATE POLICY "Users can manage own reviews" ON business_reviews
    FOR ALL USING (auth.uid() = user_id);

-- Anyone can read active reviews
CREATE POLICY "Anyone can read active reviews" ON business_reviews
    FOR SELECT USING (status = 'active');

-- Business Check-ins policies
ALTER TABLE business_checkins ENABLE ROW LEVEL SECURITY;

-- Users can manage their own check-ins
CREATE POLICY "Users can manage own checkins" ON business_checkins
    FOR ALL USING (auth.uid() = user_id);

-- Business owners can read check-ins for their businesses
CREATE POLICY "Business owners can read checkins" ON business_checkins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_checkins.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- Insert default business categories
INSERT INTO business_categories (name, display_name, description, icon_name, sort_order) VALUES
    ('restaurant', 'Restaurants', 'Food and dining establishments', 'utensils', 1),
    ('retail', 'Retail & Shopping', 'Stores and shopping outlets', 'shopping-bag', 2),
    ('services', 'Services', 'Professional and personal services', 'briefcase', 3),
    ('healthcare', 'Healthcare', 'Medical and wellness services', 'heart', 4),
    ('beauty', 'Beauty & Wellness', 'Salons, spas, and beauty services', 'sparkles', 5),
    ('fitness', 'Fitness & Sports', 'Gyms, sports facilities, and fitness centers', 'dumbbell', 6),
    ('education', 'Education', 'Schools, coaching centers, and educational services', 'graduation-cap', 7),
    ('automotive', 'Automotive', 'Vehicle services and automotive businesses', 'car', 8),
    ('entertainment', 'Entertainment', 'Movies, games, and entertainment venues', 'film', 9),
    ('travel', 'Travel & Tourism', 'Hotels, travel agencies, and tourism services', 'map-pin', 10)
ON CONFLICT (name) DO NOTHING;

-- Functions for business operations

-- Function to update business updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for businesses
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

-- Create trigger for business_products
CREATE TRIGGER update_business_products_updated_at
    BEFORE UPDATE ON business_products
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

-- Function to calculate distance between two points (for check-in verification)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    -- Haversine formula to calculate distance in meters
    RETURN 6371000 * acos(
        cos(radians(lat1)) * cos(radians(lat2)) * 
        cos(radians(lon2) - radians(lon1)) + 
        sin(radians(lat1)) * sin(radians(lat2))
    );
END;
$$ LANGUAGE plpgsql;

-- Function to verify check-in distance
CREATE OR REPLACE FUNCTION verify_checkin_distance(
    checkin_id_param UUID,
    max_distance DECIMAL DEFAULT 100 -- 100 meters default
) RETURNS BOOLEAN AS $$
DECLARE
    checkin_distance DECIMAL;
BEGIN
    SELECT c.distance_from_business INTO checkin_distance
    FROM business_checkins c
    WHERE c.id = checkin_id_param;
    
    RETURN checkin_distance <= max_distance;
END;
$$ LANGUAGE plpgsql;