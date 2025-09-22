-- FINAL CORRECTED Friend Management Database Setup
-- This version handles all schema inconsistencies and column mismatches
-- Run this in your Supabase SQL Editor

-- 1. Drop existing tables if they have wrong schema (be careful!)
-- Uncomment the next lines ONLY if you want to start completely fresh:
-- DROP TABLE IF EXISTS public.friend_activities CASCADE;
-- DROP TABLE IF EXISTS public.friend_requests CASCADE;
-- DROP TABLE IF EXISTS public.friendships CASCADE;

-- 2. Create friendships table with correct structure
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT friendships_user1_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT friendships_user2_fkey FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT friendships_unique UNIQUE(user1_id, user2_id),
  CONSTRAINT friendships_no_self CHECK (user1_id != user2_id)
);

-- 3. Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
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

-- 4. Create friend_activities table
CREATE TABLE IF NOT EXISTS public.friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('deal_save', 'deal_share', 'deal_purchase', 'deal_view', 'friend_add', 'profile_update')),
  deal_id UUID,
  deal_title VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT friend_activities_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Ensure profiles table exists and has correct columns
-- First check if profiles table exists at all
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Create profiles table if it doesn't exist
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY,
            email TEXT UNIQUE,
            full_name TEXT,
            avatar_url TEXT,
            city TEXT,
            interests TEXT[],
            is_online BOOLEAN DEFAULT FALSE,
            last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
        );
        
        -- Enable RLS on profiles
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Created profiles table';
    END IF;
END $$;

-- 6. Add missing columns to profiles table (if they don't exist)
-- Check and add each column individually
DO $$
BEGIN
    -- Check and add full_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to profiles';
    END IF;

    -- Check and add is_online column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_online'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_online column to profiles';
    END IF;

    -- Check and add last_active column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added last_active column to profiles';
    END IF;

    -- Check and add city column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'city'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN city TEXT;
        RAISE NOTICE 'Added city column to profiles';
    END IF;

    -- Check and add interests column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'interests'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
        RAISE NOTICE 'Added interests column to profiles';
    END IF;

    -- Check and add avatar_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles';
    END IF;
END $$;

-- 7. Create profiles for test users (insert or update)
-- This uses UPSERT pattern to handle existing records
INSERT INTO public.profiles (id, email, full_name, is_online, last_active)
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
        WHEN u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com') THEN TRUE
        ELSE FALSE
    END as is_online,
    CASE 
        WHEN u.email = 'testuser1@gmail.com' THEN NOW()
        WHEN u.email = 'testuser2@gmail.com' THEN NOW() - INTERVAL '5 minutes'
        WHEN u.email = 'testuser3@gmail.com' THEN NOW() - INTERVAL '1 hour'
        ELSE NOW()
    END as last_active
FROM auth.users u
WHERE u.email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_online = EXCLUDED.is_online,
    last_active = EXCLUDED.last_active,
    updated_at = NOW();

-- 8. Create some sample friend activities
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

-- 9. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 11. Create RLS policies for friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;
CREATE POLICY "Users can delete their own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 12. Create RLS policies for friend_requests
DROP POLICY IF EXISTS "Users can view friend requests" ON public.friend_requests;
CREATE POLICY "Users can view friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;
CREATE POLICY "Users can create friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update friend requests" ON public.friend_requests;
CREATE POLICY "Users can update friend requests" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

-- 13. Create RLS policies for friend_activities
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

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_activities_user ON public.friend_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_created ON public.friend_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- 15. Final verification queries
SELECT '🎉 Friend Management Database Setup Complete!' as status;

-- Check what we created
SELECT 
    'Tables created:' as info,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'friendships', 'friend_requests', 'friend_activities');

-- Show profiles table structure
SELECT 
    'Profiles table columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Show test users
SELECT 
    'Test users ready for friend search:' as info,
    u.email,
    COALESCE(p.full_name, 'No name') as full_name,
    COALESCE(p.is_online, FALSE) as is_online,
    p.last_active
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email LIKE '%testuser%@gmail.com'
ORDER BY u.email;

-- Show sample activities
SELECT 
    'Sample activities created:' as info,
    COUNT(*) as activity_count 
FROM public.friend_activities;

SELECT '✅ Setup completed successfully! You can now test friend search.' as final_status;