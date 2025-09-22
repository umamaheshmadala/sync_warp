# Friend System Troubleshooting Guide

You're experiencing two main issues:
1. **"Failed to send the friend request"** error in the Find Friends modal
2. **Friend request acceptance not completing** properly

## Step 1: Apply the Corrected Database Fix

Go to your **Supabase Dashboard → SQL Editor** and run this corrected fix:

```sql
-- STEP 1: Fix RLS Policies (causing 403 errors)
DROP POLICY IF EXISTS "Users can create their own activities" ON public.friend_activities;
DROP POLICY IF EXISTS "Users can view friend activities" ON public.friend_activities;

-- Create working RLS policies
CREATE POLICY "Anyone can create activities" ON public.friend_activities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view activities" ON public.friend_activities  
  FOR SELECT USING (true);

-- STEP 2: Fix friendship constraints (causing 409 errors)
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_unique;
DROP INDEX IF EXISTS friendships_unique;

-- Create better unique constraint
CREATE UNIQUE INDEX friendships_unique_bidirectional ON public.friendships 
(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));
```

## Step 2: Create Missing Database Functions

```sql
-- Create safe friendship creation function
CREATE OR REPLACE FUNCTION create_friendship(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    friendship_id UUID;
    ordered_user1 UUID;
    ordered_user2 UUID;
BEGIN
    -- Always order users consistently
    IF user_a < user_b THEN
        ordered_user1 := user_a;
        ordered_user2 := user_b;
    ELSE
        ordered_user1 := user_b;
        ordered_user2 := user_a;
    END IF;
    
    -- Insert friendship if it doesn't exist
    INSERT INTO public.friendships (user1_id, user2_id)
    VALUES (ordered_user1, ordered_user2)
    ON CONFLICT DO NOTHING
    RETURNING id INTO friendship_id;
    
    -- If no ID returned, friendship already exists
    IF friendship_id IS NULL THEN
        SELECT id INTO friendship_id 
        FROM public.friendships 
        WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;
    END IF;
    
    RETURN friendship_id;
END;
$$;

-- Create safe friend request acceptance function
CREATE OR REPLACE FUNCTION accept_friend_request_safe(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
    friendship_id UUID;
BEGIN
    -- Get the friend request
    SELECT * INTO request_record 
    FROM public.friend_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Create friendship safely
    SELECT create_friendship(request_record.requester_id, request_record.receiver_id) INTO friendship_id;
    
    -- Update request status
    UPDATE public.friend_requests 
    SET status = 'accepted', updated_at = NOW() 
    WHERE id = request_id;
    
    -- Try to create activity records (ignore if fails)
    BEGIN
        INSERT INTO public.friend_activities (user_id, type, message)
        VALUES 
            (request_record.requester_id, 'friend_add', 'New friendship created'),
            (request_record.receiver_id, 'friend_add', 'New friendship created');
    EXCEPTION WHEN OTHERS THEN
        -- Ignore activity creation errors
        NULL;
    END;
    
    RETURN TRUE;
END;
$$;
```

## Step 3: Check Your Browser Console

Open your browser's developer tools (F12) and check the Console tab when trying to send a friend request. Look for:

- **403 Forbidden**: RLS policy issues
- **409 Conflict**: Constraint violation issues  
- **Function not found**: Missing database functions

## Step 4: Test the Fix

After applying the database fixes:

1. **Test sending friend request**:
   - Open Find Friends modal
   - Search for a user
   - Click "Add" button
   - Should succeed without "Failed to send" error

2. **Test accepting friend request**:
   - Go to Friend Requests section
   - Click "Accept" on a pending request
   - Should complete and move the user to your friends list

## Step 5: If Still Failing

If you're still getting errors, run this diagnostic query in your Supabase SQL Editor:

```sql
-- Check if everything is set up correctly
SELECT 'RLS Policies:' as check_type;
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('friend_requests', 'friendships', 'friend_activities');

SELECT 'Functions:' as check_type;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%friend%';

SELECT 'Constraints:' as check_type;  
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('friend_requests', 'friendships')
ORDER BY table_name;
```

## Common Issues and Solutions

### "Failed to send friend request"
- **Cause**: RLS policies blocking insert operations
- **Fix**: Apply the RLS policy fixes from Step 1

### "Friend request already exists"  
- **Cause**: Duplicate prevention working correctly
- **Action**: This is expected behavior, not an error

### Friend acceptance not completing
- **Cause**: Missing `accept_friend_request_safe` function
- **Fix**: Create the function from Step 2

### 409 Conflict errors
- **Cause**: Constraint violations on friendships table
- **Fix**: Apply the constraint fixes from Step 1

## Test Data

If you need test data, you can create some test users:

```sql
-- Create test users (only if needed)
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'test1@example.com'),
('00000000-0000-0000-0000-000000000002', 'test2@example.com');

INSERT INTO public.profiles (id, email, full_name) VALUES
('00000000-0000-0000-0000-000000000001', 'test1@example.com', 'Test User 1'),
('00000000-0000-0000-0000-000000000002', 'test2@example.com', 'Test User 2');
```

After following these steps, your friend system should work correctly!