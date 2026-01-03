-- STORY 8.1.2: Messaging RLS Implementation
-- Enables RLS and defines policies for all core messaging tables.

-- Phase 1: Enable RLS on all messaging tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;


-- Phase 2: Conversations RLS Policies

-- Users can view only conversations they participate in
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = ANY (participants)
);

-- Users can create direct conversations only with friends and not blocked
CREATE POLICY "Users can create direct conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'direct'
  AND array_length(participants, 1) = 2
  AND auth.uid() = ANY (participants)
  AND EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE (
      f.user1_id = auth.uid()
      AND f.user2_id = ANY (participants)
    )
    OR (
      f.user2_id = auth.uid()
      AND f.user1_id = ANY (participants)
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.blocked_users b
    WHERE (
      b.blocker_id = auth.uid()
      AND b.blocked_id = ANY (participants)
    )
    OR (
      b.blocker_id = ANY (participants)
      AND b.blocked_id = auth.uid()
    )
  )
);

-- Users can update settings for conversations they are in
CREATE POLICY "Users can update conversation settings"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = ANY (participants)
)
WITH CHECK (
  auth.uid() = ANY (participants)
);


-- Phase 3: Messages RLS Policies

-- Users can view messages in their conversations, excluding senders they have blocked
CREATE POLICY "Users can view conversation messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY (c.participants)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.blocked_users b
    WHERE b.blocker_id = auth.uid()
      AND b.blocked_id = messages.sender_id
  )
);

-- Users can send messages only in conversations they participate in,
-- and only if no other participant has blocked them
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY (c.participants)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.blocked_users b
    JOIN public.conversations c
      ON c.id = messages.conversation_id
    WHERE b.blocker_id = ANY (c.participants)
      AND b.blocker_id <> auth.uid()
      AND b.blocked_id = auth.uid()
  )
);

-- Users can edit their own non-deleted messages within 15 minutes
CREATE POLICY "Users can edit their own recent messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  AND is_deleted = false
  AND created_at > now() - INTERVAL '15 minutes'
)
WITH CHECK (
  sender_id = auth.uid()
  AND is_deleted = false
);

-- Users can soft-delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
)
WITH CHECK (
  sender_id = auth.uid()
);


-- Phase 4: Read Receipts RLS Policies

-- Senders can view read receipts for their messages
CREATE POLICY "Senders can view read receipts"
ON public.message_read_receipts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.sender_id = auth.uid()
  )
);

-- Users can create read receipts for themselves
CREATE POLICY "Users can create their own read receipts"
ON public.message_read_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Users can update their own read receipts
CREATE POLICY "Users can update their own read receipts"
ON public.message_read_receipts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);


-- Phase 5: Conversation Participants RLS Policies

-- Participants in a conversation can view all participants
CREATE POLICY "Participants can view conversation participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY (c.participants)
  )
);

-- Users can insert their own participation row for conversations they are in
CREATE POLICY "Users can join conversations they are part of"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY (c.participants)
  )
);

-- Users can update their own participation settings (mute, archive, etc.)
CREATE POLICY "Users can manage their own participation settings"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Users can leave conversations by deleting their own participant row
CREATE POLICY "Users can leave conversations"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);


-- Phase 6: Message Edits RLS Policies

-- Users can view edits only for messages they sent
CREATE POLICY "Users can view their own message edits"
ON public.message_edits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.sender_id = auth.uid()
  )
);

-- Users can log edits only for their own messages
CREATE POLICY "Users can log edits for their own messages"
ON public.message_edits
FOR INSERT
TO authenticated
WITH CHECK (
  edited_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.sender_id = auth.uid()
  )
);


-- Phase 7: Typing Indicators RLS Policies

-- Conversation participants can view typing indicators
CREATE POLICY "Conversation participants can view typing indicators"
ON public.typing_indicators
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY (c.participants)
  )
);

-- Users can publish their own typing indicators
CREATE POLICY "Users can publish their own typing indicator"
ON public.typing_indicators
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY (c.participants)
  )
);

-- Users can clear their own typing indicators
CREATE POLICY "Users can clear their own typing indicator"
ON public.typing_indicators
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);


-- Phase 8: Blocked Users RLS Policies

-- Users can see blocks where they are either the blocker or the blocked
CREATE POLICY "Users can view blocks involving themselves"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (
  blocker_id = auth.uid()
  OR blocked_id = auth.uid()
);

-- Users can create blocks where they are the blocker
CREATE POLICY "Users can create blocks against others"
ON public.blocked_users
FOR INSERT
TO authenticated
WITH CHECK (
  blocker_id = auth.uid()
);

-- Users can update blocks where they are the blocker
CREATE POLICY "Users can update their own blocks"
ON public.blocked_users
FOR UPDATE
TO authenticated
USING (
  blocker_id = auth.uid()
)
WITH CHECK (
  blocker_id = auth.uid()
);

-- Users can remove blocks where they are the blocker
CREATE POLICY "Users can remove their own blocks"
ON public.blocked_users
FOR DELETE
TO authenticated
USING (
  blocker_id = auth.uid()
);
