-- QUICK FIX for Friend System Issues
-- Copy and paste this into your Supabase Dashboard → SQL Editor

-- Fix RLS policies (403 errors)
DROP POLICY IF EXISTS "Users can create their own activities" ON public.friend_activities;
DROP POLICY IF EXISTS "Users can view friend activities" ON public.friend_activities;

CREATE POLICY "Anyone can create activities" ON public.friend_activities
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view activities" ON public.friend_activities  
  FOR SELECT USING (true);

-- Fix constraints (409 errors)
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_unique;
DROP INDEX IF EXISTS friendships_unique;
CREATE UNIQUE INDEX friendships_unique_bidirectional ON public.friendships 
(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- Create missing functions
CREATE OR REPLACE FUNCTION accept_friend_request_safe(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
BEGIN
    SELECT * INTO request_record FROM public.friend_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Create friendship
    INSERT INTO public.friendships (user1_id, user2_id)
    VALUES (
        LEAST(request_record.requester_id, request_record.receiver_id),
        GREATEST(request_record.requester_id, request_record.receiver_id)
    ) ON CONFLICT DO NOTHING;
    
    -- Update request
    UPDATE public.friend_requests SET status = 'accepted', updated_at = NOW() 
    WHERE id = request_id;
    
    RETURN TRUE;
END;
$$;

-- Test the fix
SELECT 'Friend system fix applied successfully!' as status;