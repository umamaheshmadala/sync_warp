ALTER TABLE business_followers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_business_followers_updated_at ON business_followers(updated_at);
