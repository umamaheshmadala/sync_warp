-- Create Enhanced Favorites System Tables
-- This migration creates the essential tables needed for the enhanced favorites functionality

-- Create enhanced_favorites table
CREATE TABLE IF NOT EXISTS enhanced_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('business', 'coupon', 'event', 'product', 'service')),
    item_id UUID NOT NULL,
    item_data JSONB NOT NULL DEFAULT '{}',
    category_id UUID NULL,
    custom_name TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),
    is_public BOOLEAN DEFAULT false,
    reminder_date TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create favorite_categories table
CREATE TABLE IF NOT EXISTS favorite_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'heart',
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Create favorite_shares table
CREATE TABLE IF NOT EXISTS favorite_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    favorite_id UUID REFERENCES enhanced_favorites(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    shared_with_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    message TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(favorite_id, shared_with_id)
);

-- Create favorite_notifications table
CREATE TABLE IF NOT EXISTS favorite_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('reminder', 'share_received', 'share_accepted', 'item_updated')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Create favorite_stats table (for analytics)
CREATE TABLE IF NOT EXISTS favorite_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_favorites INTEGER DEFAULT 0,
    favorites_added INTEGER DEFAULT 0,
    favorites_removed INTEGER DEFAULT 0,
    categories_used INTEGER DEFAULT 0,
    shares_sent INTEGER DEFAULT 0,
    shares_received INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_user_id ON enhanced_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_item_type_id ON enhanced_favorites(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_category_id ON enhanced_favorites(category_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_updated_at ON enhanced_favorites(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_favorites_priority ON enhanced_favorites(priority DESC);

CREATE INDEX IF NOT EXISTS idx_favorite_categories_user_id ON favorite_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_categories_sort_order ON favorite_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_favorite_shares_favorite_id ON favorite_shares(favorite_id);
CREATE INDEX IF NOT EXISTS idx_favorite_shares_owner_id ON favorite_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_favorite_shares_shared_with_id ON favorite_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_favorite_shares_status ON favorite_shares(status);

CREATE INDEX IF NOT EXISTS idx_favorite_notifications_user_id ON favorite_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_notifications_is_read ON favorite_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_favorite_notifications_created_at ON favorite_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorite_stats_user_id ON favorite_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_stats_date ON favorite_stats(date DESC);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enhanced_favorites_updated_at
    BEFORE UPDATE ON enhanced_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_favorite_categories_updated_at
    BEFORE UPDATE ON favorite_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_favorite_shares_updated_at
    BEFORE UPDATE ON favorite_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_favorite_stats_updated_at
    BEFORE UPDATE ON favorite_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for existing users
INSERT INTO favorite_categories (user_id, name, description, color, icon, is_default, sort_order)
SELECT 
    id,
    'General',
    'Default category for favorites',
    '#6366f1',
    'heart',
    true,
    0
FROM profiles
WHERE NOT EXISTS (
    SELECT 1 FROM favorite_categories WHERE user_id = profiles.id AND name = 'General'
);

-- Create RLS policies
ALTER TABLE enhanced_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_stats ENABLE ROW LEVEL SECURITY;

-- Policies for enhanced_favorites
CREATE POLICY "Users can view their own favorites" ON enhanced_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON enhanced_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON enhanced_favorites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON enhanced_favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for favorite_categories
CREATE POLICY "Users can view their own categories" ON favorite_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON favorite_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON favorite_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON favorite_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for favorite_shares
CREATE POLICY "Users can view shares they own or received" ON favorite_shares
    FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can insert shares for their own favorites" ON favorite_shares
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update shares they own or received" ON favorite_shares
    FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can delete shares they own" ON favorite_shares
    FOR DELETE USING (auth.uid() = owner_id);

-- Policies for favorite_notifications
CREATE POLICY "Users can view their own notifications" ON favorite_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON favorite_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON favorite_notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for favorite_stats
CREATE POLICY "Users can view their own stats" ON favorite_stats
    FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON enhanced_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON favorite_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON favorite_shares TO authenticated;
GRANT SELECT, UPDATE, DELETE ON favorite_notifications TO authenticated;
GRANT SELECT ON favorite_stats TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced favorites system tables created successfully!';
    RAISE NOTICE 'Tables: enhanced_favorites, favorite_categories, favorite_shares, favorite_notifications, favorite_stats';
    RAISE NOTICE 'RLS policies and indexes have been applied';
END $$;