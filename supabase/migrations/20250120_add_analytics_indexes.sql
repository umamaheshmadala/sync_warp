-- Add indexes to improve follower analytics performance
-- These indexes optimize queries in useFollowerAnalytics hook

-- Drop existing indexes if they exist (for idempotent migration)
DROP INDEX IF EXISTS idx_business_followers_business_active;
DROP INDEX IF EXISTS idx_business_followers_followed_at;
DROP INDEX IF EXISTS idx_business_followers_notification_prefs;
DROP INDEX IF EXISTS idx_profiles_demographics;

-- Index for fetching active followers by business
CREATE INDEX idx_business_followers_business_active 
  ON business_followers(business_id, is_active) 
  WHERE is_active = true;

-- Index for date-based queries (new followers this week/month)
CREATE INDEX idx_business_followers_followed_at 
  ON business_followers(business_id, followed_at DESC) 
  WHERE is_active = true;

-- Index for notification preferences queries
CREATE INDEX idx_business_followers_notification_prefs 
  ON business_followers(business_id, notification_preferences) 
  WHERE is_active = true;

-- Index for profiles demographics lookup (city, interests, date_of_birth)
CREATE INDEX idx_profiles_demographics 
  ON profiles(id, city, date_of_birth, interests);

-- Add comment
COMMENT ON INDEX idx_business_followers_business_active IS 'Optimizes fetching active followers per business';
COMMENT ON INDEX idx_business_followers_followed_at IS 'Optimizes date-based follower growth queries';
COMMENT ON INDEX idx_profiles_demographics IS 'Optimizes demographic data lookups for analytics';
