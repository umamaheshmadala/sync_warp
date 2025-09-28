-- Migration: Enhanced Favorites System
-- Creates tables for advanced favorites with categorization, sharing, and notifications

-- Create favorite_categories table
CREATE TABLE IF NOT EXISTS favorite_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icon TEXT NOT NULL DEFAULT 'star',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Create enhanced_favorites table
CREATE TABLE IF NOT EXISTS enhanced_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT CHECK (item_type IN ('business', 'coupon', 'product')) NOT NULL,
    category_id UUID REFERENCES favorite_categories(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    is_wishlist BOOLEAN DEFAULT FALSE,
    reminder_date TIMESTAMP WITH TIME ZONE,
    shared_with TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id, item_type)
);

-- Create favorite_shares table
CREATE TABLE IF NOT EXISTS favorite_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    favorite_id UUID REFERENCES enhanced_favorites(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    permission TEXT CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(favorite_id, shared_with_id)
);

-- Create favorite_notifications table
CREATE TABLE IF NOT EXISTS favorite_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    favorite_id UUID REFERENCES enhanced_favorites(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('reminder', 'share_received', 'expiring_coupon', 'price_drop', 'back_in_stock')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorite_categories_user_id ON favorite_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_categories_name ON favorite_categories(name);

CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_user_id ON enhanced_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_item ON enhanced_favorites(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_category ON enhanced_favorites(category_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_tags ON enhanced_favorites USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_priority ON enhanced_favorites(priority);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_wishlist ON enhanced_favorites(is_wishlist);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_updated_at ON enhanced_favorites(updated_at);

CREATE INDEX IF NOT EXISTS idx_favorite_shares_favorite_id ON favorite_shares(favorite_id);
CREATE INDEX IF NOT EXISTS idx_favorite_shares_owner_id ON favorite_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_favorite_shares_shared_with_id ON favorite_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_favorite_shares_status ON favorite_shares(status);

CREATE INDEX IF NOT EXISTS idx_favorite_notifications_user_id ON favorite_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_notifications_favorite_id ON favorite_notifications(favorite_id);
CREATE INDEX IF NOT EXISTS idx_favorite_notifications_type ON favorite_notifications(type);
CREATE INDEX IF NOT EXISTS idx_favorite_notifications_is_read ON favorite_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_favorite_notifications_scheduled ON favorite_notifications(scheduled_for);

-- Create triggers for updated_at columns
CREATE TRIGGER update_favorite_categories_updated_at 
    BEFORE UPDATE ON favorite_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_favorites_updated_at 
    BEFORE UPDATE ON enhanced_favorites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for favorite statistics
CREATE OR REPLACE VIEW favorite_stats AS
SELECT 
    ef.user_id,
    COUNT(*) as total_favorites,
    COUNT(CASE WHEN ef.item_type = 'business' THEN 1 END) as businesses,
    COUNT(CASE WHEN ef.item_type = 'coupon' THEN 1 END) as coupons,
    COUNT(CASE WHEN ef.item_type = 'product' THEN 1 END) as products,
    COUNT(CASE WHEN ef.is_wishlist = true THEN 1 END) as wishlist_count,
    COUNT(CASE WHEN array_length(ef.shared_with, 1) > 0 THEN 1 END) as shared_count,
    COUNT(CASE WHEN ef.updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_activity,
    json_object_agg(
        COALESCE(fc.name, 'Uncategorized'),
        COUNT(ef.id) FILTER (WHERE fc.id IS NOT NULL OR fc.id IS NULL)
    ) as by_category,
    json_build_object(
        'business', COUNT(CASE WHEN ef.item_type = 'business' THEN 1 END),
        'coupon', COUNT(CASE WHEN ef.item_type = 'coupon' THEN 1 END),
        'product', COUNT(CASE WHEN ef.item_type = 'product' THEN 1 END)
    ) as by_type
FROM enhanced_favorites ef
LEFT JOIN favorite_categories fc ON ef.category_id = fc.id
GROUP BY ef.user_id;

-- Function to get favorite suggestions based on user behavior
CREATE OR REPLACE FUNCTION get_favorite_suggestions(suggestion_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    item_id TEXT,
    item_type TEXT,
    suggestion_score FLOAT,
    suggestion_reason TEXT
) AS $$
BEGIN
    -- This is a simplified suggestion algorithm
    -- In a real implementation, this would be more sophisticated
    RETURN QUERY
    WITH user_favorites AS (
        SELECT ef.item_type, ef.tags, ef.category_id
        FROM enhanced_favorites ef
        WHERE ef.user_id = auth.uid()
    ),
    popular_items AS (
        SELECT 
            ef.item_id,
            ef.item_type,
            COUNT(*) as popularity_count,
            array_agg(DISTINCT unnest(ef.tags)) as common_tags
        FROM enhanced_favorites ef
        WHERE ef.item_type IN (SELECT DISTINCT item_type FROM user_favorites)
        GROUP BY ef.item_id, ef.item_type
        ORDER BY COUNT(*) DESC
        LIMIT suggestion_limit * 3
    )
    SELECT 
        pi.item_id,
        pi.item_type,
        (pi.popularity_count::FLOAT / 10.0) as suggestion_score,
        'Popular among users with similar interests' as suggestion_reason
    FROM popular_items pi
    WHERE NOT EXISTS (
        SELECT 1 FROM enhanced_favorites ef 
        WHERE ef.user_id = auth.uid() 
        AND ef.item_id = pi.item_id 
        AND ef.item_type = pi.item_type
    )
    ORDER BY suggestion_score DESC
    LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending favorites
CREATE OR REPLACE FUNCTION get_trending_favorites(timeframe_days INTEGER DEFAULT 7)
RETURNS TABLE (
    item_id TEXT,
    item_type TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ef.item_id,
        ef.item_type,
        COUNT(*) as count
    FROM enhanced_favorites ef
    WHERE ef.created_at > NOW() - (timeframe_days || ' days')::INTERVAL
    GROUP BY ef.item_id, ef.item_type
    ORDER BY COUNT(*) DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_favorite_notifications()
RETURNS void AS $$
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM favorite_notifications 
    WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete unread notifications older than 90 days
    DELETE FROM favorite_notifications 
    WHERE is_read = false 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process scheduled notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS void AS $$
BEGIN
    -- This would typically be called by a background job
    -- Update notifications that are due to be sent
    UPDATE favorite_notifications 
    SET data = data || '{"processed": true}'::jsonb
    WHERE scheduled_for IS NOT NULL 
    AND scheduled_for <= NOW() 
    AND NOT (data ? 'processed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) policies
ALTER TABLE favorite_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own categories
CREATE POLICY favorite_categories_user_policy ON favorite_categories
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can only access their own favorites
CREATE POLICY enhanced_favorites_user_policy ON enhanced_favorites
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can see shares they own or are shared with
CREATE POLICY favorite_shares_user_policy ON favorite_shares
    FOR ALL USING (
        auth.uid() = owner_id OR 
        auth.uid() = shared_with_id
    );

-- Policy: Users can only see their own notifications
CREATE POLICY favorite_notifications_user_policy ON favorite_notifications
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON favorite_categories TO authenticated;
GRANT ALL ON enhanced_favorites TO authenticated;
GRANT ALL ON favorite_shares TO authenticated;
GRANT ALL ON favorite_notifications TO authenticated;
GRANT SELECT ON favorite_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_favorite_suggestions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_favorites(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_favorite_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_notifications() TO authenticated;

-- Insert default categories for new users (optional)
CREATE OR REPLACE FUNCTION create_default_favorite_categories()
RETURNS trigger AS $$
BEGIN
    -- Create default categories when a user signs up
    INSERT INTO favorite_categories (user_id, name, description, color, icon) VALUES
    (NEW.id, 'Restaurants', 'My favorite dining spots', '#EF4444', 'utensils'),
    (NEW.id, 'Shopping', 'Great stores and deals', '#10B981', 'shopping-bag'),
    (NEW.id, 'Services', 'Useful service providers', '#3B82F6', 'wrench'),
    (NEW.id, 'Entertainment', 'Fun activities and venues', '#8B5CF6', 'film');
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors (e.g., if categories already exist)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories for new users
CREATE TRIGGER create_default_categories_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_favorite_categories();

-- Comments for documentation
COMMENT ON TABLE favorite_categories IS 'User-defined categories for organizing favorites';
COMMENT ON TABLE enhanced_favorites IS 'Enhanced favorites with tags, notes, and categorization';
COMMENT ON TABLE favorite_shares IS 'Sharing favorites between users';
COMMENT ON TABLE favorite_notifications IS 'Notifications related to favorites and sharing';
COMMENT ON VIEW favorite_stats IS 'Statistics about user favorites';
COMMENT ON FUNCTION get_favorite_suggestions(INTEGER) IS 'Get personalized favorite suggestions';
COMMENT ON FUNCTION get_trending_favorites(INTEGER) IS 'Get trending favorites across all users';
COMMENT ON FUNCTION cleanup_favorite_notifications() IS 'Clean up old notifications';
COMMENT ON FUNCTION process_scheduled_notifications() IS 'Process notifications scheduled to be sent';

-- Sample data (optional - remove in production)
/*
-- Sample categories
INSERT INTO favorite_categories (user_id, name, description, color, icon) 
SELECT 
    u.id,
    category_name,
    category_desc,
    category_color,
    category_icon
FROM auth.users u,
(VALUES 
    ('Restaurants', 'My favorite dining spots', '#EF4444', 'utensils'),
    ('Shopping', 'Great stores and deals', '#10B981', 'shopping-bag'),
    ('Services', 'Useful service providers', '#3B82F6', 'wrench'),
    ('Wishlist', 'Items I want to get later', '#F59E0B', 'heart')
) AS categories(category_name, category_desc, category_color, category_icon)
WHERE u.email LIKE '%@example.com'
ON CONFLICT DO NOTHING;

-- Sample enhanced favorites
INSERT INTO enhanced_favorites (user_id, item_id, item_type, category_id, tags, notes, priority, is_wishlist)
SELECT 
    u.id,
    'business-' || generate_random_uuid(),
    'business',
    fc.id,
    ARRAY['local', 'recommended'],
    'Great service and atmosphere',
    'high',
    false
FROM auth.users u
JOIN favorite_categories fc ON fc.user_id = u.id AND fc.name = 'Restaurants'
WHERE u.email LIKE '%@example.com'
LIMIT 1;
*/