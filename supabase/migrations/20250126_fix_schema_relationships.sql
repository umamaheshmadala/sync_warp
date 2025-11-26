-- Add username column to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN 
        ALTER TABLE profiles ADD COLUMN username text UNIQUE; 
    END IF; 
END $$;

-- Add foreign keys to friendships linking to profiles
DO $$ 
BEGIN 
    -- Drop existing constraints if they point to auth.users (to avoid conflicts or confusion, though we can keep them if names differ)
    -- But we want to ensure these specific names point to profiles for PostgREST
    
    -- Check and add friendships_user_id_fkey
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'friendships_user_id_fkey') THEN 
        ALTER TABLE friendships 
        ADD CONSTRAINT friendships_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES profiles(id) ON DELETE CASCADE; 
    END IF;

    -- Check and add friendships_friend_id_fkey
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'friendships_friend_id_fkey') THEN 
        ALTER TABLE friendships 
        ADD CONSTRAINT friendships_friend_id_fkey 
        FOREIGN KEY (friend_id) 
        REFERENCES profiles(id) ON DELETE CASCADE; 
    END IF;
END $$;

-- Add foreign keys to friend_requests linking to profiles
DO $$ 
BEGIN 
    -- Check and add friend_requests_requester_id_fkey
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'friend_requests_requester_id_fkey') THEN 
        ALTER TABLE friend_requests 
        ADD CONSTRAINT friend_requests_requester_id_fkey 
        FOREIGN KEY (requester_id) 
        REFERENCES profiles(id) ON DELETE CASCADE; 
    END IF;

    -- Check and add friend_requests_receiver_id_fkey
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'friend_requests_receiver_id_fkey') THEN 
        ALTER TABLE friend_requests 
        ADD CONSTRAINT friend_requests_receiver_id_fkey 
        FOREIGN KEY (receiver_id) 
        REFERENCES profiles(id) ON DELETE CASCADE; 
    END IF;
END $$;
