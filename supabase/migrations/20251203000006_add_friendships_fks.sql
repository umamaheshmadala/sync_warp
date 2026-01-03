-- Drop existing constraints if they exist (to fix potential wrong references)
ALTER TABLE friendships
DROP CONSTRAINT IF EXISTS friendships_user_id_fkey;

ALTER TABLE friendships
DROP CONSTRAINT IF EXISTS friendships_friend_id_fkey;

-- Add foreign key constraints to friendships table referencing profiles
ALTER TABLE friendships
ADD CONSTRAINT friendships_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE friendships
ADD CONSTRAINT friendships_friend_id_fkey
FOREIGN KEY (friend_id)
REFERENCES profiles(id)
ON DELETE CASCADE;
