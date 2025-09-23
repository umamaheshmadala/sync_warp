-- Create business_products table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS business_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    -- Product Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Simplified pricing (no pricing section needed initially)
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Product Status
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- Featured products show in storefront
    display_order INTEGER DEFAULT 0,
    
    -- Media
    image_urls TEXT[] DEFAULT '{}',
    
    -- Auto-deletion tracking
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_products_business_id ON business_products(business_id);
CREATE INDEX IF NOT EXISTS idx_business_products_featured ON business_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_business_products_created_at ON business_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_products_last_updated ON business_products(last_updated_at);

-- Row Level Security (RLS) Policies
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

-- Function to update last_updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_products_timestamp
    BEFORE UPDATE ON business_products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_last_updated();

-- Function to auto-delete old products (run periodically)
CREATE OR REPLACE FUNCTION auto_delete_old_products()
RETURNS void AS $$
BEGIN
    -- Delete products older than 365 days since last update
    DELETE FROM business_products 
    WHERE last_updated_at < NOW() - INTERVAL '365 days';
    
    -- For each business, keep only the 100 most recent products (by created_at)
    WITH ranked_products AS (
        SELECT 
            id,
            business_id,
            ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at DESC) as rn
        FROM business_products
    )
    DELETE FROM business_products 
    WHERE id IN (
        SELECT id FROM ranked_products WHERE rn > 100
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to get featured products (for storefront)
CREATE OR REPLACE FUNCTION get_featured_products(business_uuid UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    name VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    is_available BOOLEAN,
    is_featured BOOLEAN,
    display_order INTEGER,
    image_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.business_id,
        p.name,
        p.description,
        p.category,
        p.price,
        p.currency,
        p.is_available,
        p.is_featured,
        p.display_order,
        p.image_urls,
        p.created_at,
        p.updated_at
    FROM business_products p
    WHERE p.business_id = business_uuid 
    AND p.is_available = true
    AND p.is_featured = true
    ORDER BY p.display_order ASC, p.created_at DESC
    LIMIT 4; -- Only show 4 featured products in storefront
END;
$$ LANGUAGE plpgsql;
