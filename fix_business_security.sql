-- Fix Business Security and RLS Policies
-- Run this AFTER creating the business_products table

-- 1. Fix businesses table RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Business owners can manage own businesses" ON businesses;
DROP POLICY IF EXISTS "Anyone can read active businesses" ON businesses;
DROP POLICY IF EXISTS "Enable read access for all users" ON businesses;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON businesses;

-- Ensure RLS is enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their own businesses (all operations)
CREATE POLICY "Business owners can manage own businesses" ON businesses
    FOR ALL USING (auth.uid() = user_id);

-- Customers can only read active businesses for public viewing
CREATE POLICY "Customers can read active businesses" ON businesses
    FOR SELECT USING (status = 'active');

-- 2. Create user role tracking function
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    business_count INTEGER;
BEGIN
    -- Count businesses owned by user
    SELECT COUNT(*) INTO business_count
    FROM businesses
    WHERE user_id = user_uuid;
    
    -- Return role based on business ownership
    IF business_count > 0 THEN
        RETURN 'merchant';
    ELSE
        RETURN 'customer';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to check if user can access business
CREATE OR REPLACE FUNCTION user_can_access_business(user_uuid UUID, business_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    business_owner_id UUID;
    business_status TEXT;
BEGIN
    -- Get user role
    user_role := get_user_role(user_uuid);
    
    -- Get business details
    SELECT user_id, status INTO business_owner_id, business_status
    FROM businesses
    WHERE id = business_uuid;
    
    -- If business doesn't exist, return false
    IF business_owner_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Merchants can only access their own businesses
    IF user_role = 'merchant' THEN
        RETURN business_owner_id = user_uuid;
    END IF;
    
    -- Customers can only view active businesses
    IF user_role = 'customer' THEN
        RETURN business_status = 'active';
    END IF;
    
    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to check business ownership
CREATE OR REPLACE FUNCTION user_owns_business(user_uuid UUID, business_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    business_owner_id UUID;
BEGIN
    SELECT user_id INTO business_owner_id
    FROM businesses
    WHERE id = business_uuid;
    
    RETURN business_owner_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update business_products RLS policies for better security
DROP POLICY IF EXISTS "Business owners can manage products" ON business_products;
DROP POLICY IF EXISTS "Anyone can read available products" ON business_products;

-- Business owners can manage their own products
CREATE POLICY "Business owners can manage products" ON business_products
    FOR ALL USING (
        user_owns_business(auth.uid(), business_id)
    );

-- Customers can read products from active businesses
CREATE POLICY "Customers can read products" ON business_products
    FOR SELECT USING (
        is_available = true AND 
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_products.business_id 
            AND businesses.status = 'active'
        )
    );

-- 6. Create view for business with owner info (for frontend use)
CREATE OR REPLACE VIEW business_with_access AS
SELECT 
    b.*,
    (auth.uid() = b.user_id) as is_owner,
    get_user_role(auth.uid()) as user_role,
    user_can_access_business(auth.uid(), b.id) as can_access
FROM businesses b;