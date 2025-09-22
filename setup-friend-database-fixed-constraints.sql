-- Friend Management Database Setup - FIXED for NOT NULL constraints
-- Run this in your Supabase SQL Editor AFTER creating the 3 new test users

-- STEP 1: Drop existing friend-related tables (clean slate)
DROP TABLE IF EXISTS public.friend_activities CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;  
DROP TABLE IF EXISTS public.friendships CASCADE;

-- STEP 2: Create friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT friendships_user1_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT friendships_user2_fkey FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT friendships_unique UNIQUE(user1_id, user2_id),
  CONSTRAINT friendships_no_self CHECK (user1_id != user2_id)
);

-- STEP 3: Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT friend_requests_requester_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT friend_requests_receiver_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT friend_requests_unique UNIQUE(requester_id, receiver_id),
  CONSTRAINT friend_requests_no_self CHECK (requester_id != receiver_id)
);

-- STEP 4: Create friend_activities table
CREATE TABLE public.friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('deal_save', 'deal_share', 'deal_purchase', 'deal_view', 'friend_add', 'profile_update')),
  deal_id UUID,
  deal_title VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT friend_activities_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- STEP 5: Add missing columns to profiles table (with safe defaults for NOT NULL constraints)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Check if city column exists and if it has NOT NULL constraint
-- If it has NOT NULL, we need to provide a default value
DO $$
BEGIN
    -- Check if city column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'city'
    ) THEN
        -- Add city column without NOT NULL constraint
        ALTER TABLE public.profiles ADD COLUMN city TEXT;
        RAISE NOTICE 'Added city column without NOT NULL constraint';
    ELSE
        RAISE NOTICE 'City column already exists';
    END IF;
END $$;

-- STEP 6: Update existing profiles for test users with safe values for NOT NULL constraints
UPDATE public.profiles 
SET 
    full_name = CASE 
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser1@gmail.com') THEN 'Test User 1'
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser2@gmail.com') THEN 'Test User 2'
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser3@gmail.com') THEN 'Test User 3'
        ELSE COALESCE(full_name, 'User')
    END,
    is_online = CASE 
        WHEN id IN (SELECT id FROM auth.users WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com')) THEN TRUE
        ELSE FALSE
    END,
    last_active = CASE 
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser1@gmail.com') THEN NOW()
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser2@gmail.com') THEN NOW() - INTERVAL '5 minutes'
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser3@gmail.com') THEN NOW() - INTERVAL '1 hour'
        ELSE COALESCE(last_active, NOW())
    END,
    -- Handle city with safe default if NOT NULL constraint exists
    city = CASE 
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser1@gmail.com') THEN COALESCE(city, 'Test City 1')
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser2@gmail.com') THEN COALESCE(city, 'Test City 2')
        WHEN id IN (SELECT id FROM auth.users WHERE email = 'testuser3@gmail.com') THEN COALESCE(city, 'Test City 3')
        ELSE COALESCE(city, 'Unknown City')
    END,
    interests = COALESCE(interests, '{}'),
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
);

-- STEP 7: Insert profiles for any test users that don't have profiles yet
-- This handles the case where profiles weren't created during signup
INSERT INTO public.profiles (id, email, full_name, city, is_online, last_active, interests)
SELECT 
    u.id,
    u.email,
    CASE 
        WHEN u.email = 'testuser1@gmail.com' THEN 'Test User 1'
        WHEN u.email = 'testuser2@gmail.com' THEN 'Test User 2'  
        WHEN u.email = 'testuser3@gmail.com' THEN 'Test User 3'
        ELSE COALESCE(SPLIT_PART(u.email, '@', 1), 'User')
    END as full_name,
    CASE 
        WHEN u.email = 'testuser1@gmail.com' THEN 'Test City 1'
        WHEN u.email = 'testuser2@gmail.com' THEN 'Test City 2'  
        WHEN u.email = 'testuser3@gmail.com' THEN 'Test City 3'
        ELSE 'Unknown City'
    END as city,
    CASE 
        WHEN u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com') THEN TRUE
        ELSE FALSE
    END as is_online,
    CASE 
        WHEN u.email = 'testuser1@gmail.com' THEN NOW()
        WHEN u.email = 'testuser2@gmail.com' THEN NOW() - INTERVAL '5 minutes'
        WHEN u.email = 'testuser3@gmail.com' THEN NOW() - INTERVAL '1 hour'
        ELSE NOW()
    END as last_active,
    '{}' as interests
FROM auth.users u
WHERE u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- STEP 8: Create sample friend activities
INSERT INTO public.friend_activities (user_id, type, deal_title, message)
SELECT 
  u.id,
  'deal_save',
  'Sample Deal: 50% Off Electronics',
  'Found a great deal!'
FROM auth.users u 
WHERE u.email = 'testuser1@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.friend_activities (user_id, type, deal_title, message)
SELECT 
  u.id,
  'deal_share',
  'Sample Deal: Buy One Get One Free',
  'Sharing this amazing offer'
FROM auth.users u 
WHERE u.email = 'testuser2@gmail.com'
ON CONFLICT DO NOTHING;

-- STEP 9: Enable Row Level Security (RLS)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_activities ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create RLS policies for friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;
CREATE POLICY "Users can delete their own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- STEP 11: Create RLS policies for friend_requests
DROP POLICY IF EXISTS "Users can view friend requests" ON public.friend_requests;
CREATE POLICY "Users can view friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;
CREATE POLICY "Users can create friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update friend requests" ON public.friend_requests;
CREATE POLICY "Users can update friend requests" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

-- STEP 12: Create RLS policies for friend_activities
DROP POLICY IF EXISTS "Users can view friend activities" ON public.friend_activities;
CREATE POLICY "Users can view friend activities" ON public.friend_activities
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.friendships 
      WHERE (user1_id = auth.uid() AND user2_id = friend_activities.user_id) 
         OR (user2_id = auth.uid() AND user1_id = friend_activities.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can create their own activities" ON public.friend_activities;
CREATE POLICY "Users can create their own activities" ON public.friend_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STEP 13: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_activities_user ON public.friend_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_created ON public.friend_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- STEP 14: Final verification
SELECT '🎉 Friend Management Database Setup Complete!' as status;

-- Verify test users are set up with CORRECT gmail.com emails
SELECT 
    'Test users ready for friend search:' as info,
    u.email,
    p.full_name,
    p.city,
    p.is_online,
    p.last_active
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
ORDER BY u.email;

-- Check if any users were found
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '⚠️ No test users found! Please check the email addresses.'
        WHEN COUNT(*) < 3 THEN CONCAT('⚠️ Only ', COUNT(*)::text, ' test users found. Need 3 total.')
        ELSE '✅ All 3 test users ready!'
    END as user_status
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com');

-- Verify friend tables exist
SELECT 
    'Friend tables created:' as info,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('friendships', 'friend_requests', 'friend_activities');

SELECT '✅ Ready to test! Sign in as testuser1@gmail.com and search for friends.' as final_status;