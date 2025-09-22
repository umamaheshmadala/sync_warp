-- Friend Management Database Setup for Test Users
-- Run this in your Supabase SQL Editor

-- 1. Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- 2. Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id),
  CHECK (requester_id != receiver_id)
);

-- 3. Create friend_activities table
CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('deal_save', 'deal_share', 'deal_purchase', 'deal_view', 'friend_add', 'profile_update')),
  deal_id UUID,
  deal_title VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Extend profiles table (add columns if they don't exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Update existing profiles with sample data for your test users
UPDATE profiles 
SET 
  is_online = CASE 
    WHEN email = 'testuser1@gmail.com' THEN TRUE
    WHEN email = 'testuser2@gmail.com' THEN TRUE
    WHEN email = 'testuser3@gmail.com' THEN FALSE
    ELSE is_online
  END,
  last_active = CASE 
    WHEN email = 'testuser1@gmail.com' THEN NOW()
    WHEN email = 'testuser2@gmail.com' THEN NOW() - INTERVAL '5 minutes'
    WHEN email = 'testuser3@gmail.com' THEN NOW() - INTERVAL '1 hour'
    ELSE last_active
  END,
  full_name = CASE 
    WHEN email = 'testuser1@gmail.com' THEN 'Test User 1'
    WHEN email = 'testuser2@gmail.com' THEN 'Test User 2'
    WHEN email = 'testuser3@gmail.com' THEN 'Test User 3'
    ELSE full_name
  END
WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com');

-- 6. Create some sample friend activities
INSERT INTO friend_activities (user_id, type, deal_title, message)
SELECT 
  p.user_id,
  'deal_save',
  'Sample Deal: 50% Off Electronics',
  'Found a great deal!'
FROM profiles p 
WHERE p.email = 'testuser1@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO friend_activities (user_id, type, deal_title, message)
SELECT 
  p.user_id,
  'deal_share',
  'Sample Deal: Buy One Get One Free',
  'Sharing this amazing offer'
FROM profiles p 
WHERE p.email = 'testuser2@gmail.com'
ON CONFLICT DO NOTHING;

-- 7. Enable Row Level Security (RLS) if not already enabled
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for friendships
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can delete their own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 9. Create RLS policies for friend_requests
CREATE POLICY "Users can view friend requests" ON friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests" ON friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

-- 10. Create RLS policies for friend_activities
CREATE POLICY "Users can view friend activities" ON friend_activities
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE (user1_id = auth.uid() AND user2_id = friend_activities.user_id) 
         OR (user2_id = auth.uid() AND user1_id = friend_activities.user_id)
    )
  );

CREATE POLICY "Users can create their own activities" ON friend_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_user ON friend_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_created ON friend_activities(created_at DESC);

-- Verification queries (optional - run these to check setup)
/*
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('friendships', 'friend_requests', 'friend_activities');

-- Check profiles data
SELECT user_id, email, full_name, is_online, last_active 
FROM profiles 
WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com');

-- Check activities
SELECT * FROM friend_activities;
*/