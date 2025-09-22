-- Fixed Friend Management Database Setup for Your Supabase Schema
-- Run this in your Supabase SQL Editor

-- First, let's check your profiles table structure
-- Run this query first to see what columns exist in your profiles table:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public';

-- 1. Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- 2. Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
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
CREATE TABLE IF NOT EXISTS public.friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('deal_save', 'deal_share', 'deal_purchase', 'deal_view', 'friend_add', 'profile_update')),
  deal_id UUID,
  deal_title VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Check if profiles table exists and what columns it has
DO $$
DECLARE
    profiles_exists BOOLEAN := FALSE;
    has_user_id BOOLEAN := FALSE;
    has_id BOOLEAN := FALSE;
BEGIN
    -- Check if profiles table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO profiles_exists;
    
    IF profiles_exists THEN
        -- Check for user_id column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
        ) INTO has_user_id;
        
        -- Check for id column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
        ) INTO has_id;
        
        RAISE NOTICE 'Profiles table exists. Has user_id: %, Has id: %', has_user_id, has_id;
    ELSE
        RAISE NOTICE 'Profiles table does not exist. Creating it...';
        
        -- Create profiles table if it doesn't exist
        CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT UNIQUE,
            full_name TEXT,
            avatar_url TEXT,
            city TEXT,
            interests TEXT[],
            is_online BOOLEAN DEFAULT FALSE,
            last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS on profiles
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy for profiles
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
            FOR SELECT USING (true);
        
        CREATE POLICY "Users can insert their own profile" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
        
        CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- 5. Add missing columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 6. Update existing test user profiles
-- First, let's insert profiles for test users if they don't exist
INSERT INTO public.profiles (id, email, full_name, is_online, last_active)
SELECT 
    u.id,
    u.email,
    CASE 
        WHEN u.email = 'testuser1@gmail.com' THEN 'Test User 1'
        WHEN u.email = 'testuser2@gmail.com' THEN 'Test User 2'
        WHEN u.email = 'testuser3@gmail.com' THEN 'Test User 3'
        ELSE u.email
    END,
    CASE 
        WHEN u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com') THEN TRUE
        ELSE FALSE
    END,
    CASE 
        WHEN u.email = 'testuser1@gmail.com' THEN NOW()
        WHEN u.email = 'testuser2@gmail.com' THEN NOW() - INTERVAL '5 minutes'
        WHEN u.email = 'testuser3@gmail.com' THEN NOW() - INTERVAL '1 hour'
        ELSE NOW()
    END
FROM auth.users u
WHERE u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Update existing profiles
UPDATE public.profiles 
SET 
  is_online = CASE 
    WHEN p.email = 'testuser1@gmail.com' THEN TRUE
    WHEN p.email = 'testuser2@gmail.com' THEN TRUE
    WHEN p.email = 'testuser3@gmail.com' THEN FALSE
    ELSE is_online
  END,
  last_active = CASE 
    WHEN p.email = 'testuser1@gmail.com' THEN NOW()
    WHEN p.email = 'testuser2@gmail.com' THEN NOW() - INTERVAL '5 minutes'
    WHEN p.email = 'testuser3@gmail.com' THEN NOW() - INTERVAL '1 hour'
    ELSE last_active
  END,
  full_name = CASE 
    WHEN p.email = 'testuser1@gmail.com' THEN 'Test User 1'
    WHEN p.email = 'testuser2@gmail.com' THEN 'Test User 2'
    WHEN p.email = 'testuser3@gmail.com' THEN 'Test User 3'
    ELSE COALESCE(full_name, p.email)
  END
FROM (
    SELECT id, email FROM public.profiles 
    WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
) p
WHERE profiles.id = p.id;

-- 7. Create some sample friend activities
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

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_activities ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;
CREATE POLICY "Users can delete their own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 10. Create RLS policies for friend_requests
DROP POLICY IF EXISTS "Users can view friend requests" ON public.friend_requests;
CREATE POLICY "Users can view friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;
CREATE POLICY "Users can create friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update friend requests" ON public.friend_requests;
CREATE POLICY "Users can update friend requests" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

-- 11. Create RLS policies for friend_activities
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

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_user ON public.friend_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_created ON public.friend_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 13. Verification queries - run these to check the setup
SELECT 'Tables created successfully' as status;

-- Check profiles structure
SELECT 'Profiles table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check test users
SELECT 'Test users in profiles:' as info;
SELECT 
    CASE 
        WHEN p.id IS NOT NULL THEN 'Found in profiles table'
        ELSE 'Found in auth.users only'
    END as profile_status,
    u.email,
    COALESCE(p.full_name, 'No name set') as full_name,
    COALESCE(p.is_online, FALSE) as is_online,
    COALESCE(p.last_active, u.created_at) as last_active
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
ORDER BY u.email;

-- Check activities
SELECT 'Sample activities created:' as info;
SELECT COUNT(*) as activity_count FROM public.friend_activities;

SELECT 'Setup completed successfully! 🎉' as final_status;