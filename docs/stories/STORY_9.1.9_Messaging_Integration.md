# 📋 STORY 9.1.9: Messaging Integration (Epic 8.x)

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Owner:** Backend/Database Team  
**Effort:** 2 days | **Priority:** 🔴 Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 9.1.2 (Friendships), Story 9.1.5 (Blocking), Epic 8.1 (Messaging)

---

## 🎯 Story Goal

Integrate friends module with Epic 8.x messaging system to enforce privacy rules: only friends can message each other, blocked users cannot message, and friend/online status is visible in conversations.

---

## ✅ Acceptance Criteria

- [ ] **AC1:** RLS policy on `conversations` enforces friends-only messaging
- [ ] **AC2:** Blocked users cannot create conversations or send messages
- [ ] **AC3:** `create_or_get_direct_conversation()` validates friendship + blocking
- [ ] **AC4:** Friend/online status visible in conversation list UI
- [ ] **AC5:** Zero breaking changes to existing messaging functionality

---

## 🔧 Implementation Steps

### **STEP 1: Update Conversations RLS Policies (45 min)**

Create migration: `supabase/migrations/20250124_messaging_integration.sql`

`sql
-- ============================================================
-- STORY 9.1.9: Messaging Integration with Friends Module
-- Enforce friends-only messaging + blocking
-- ============================================================

-- Verify Epic 8 tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    RAISE EXCEPTION 'conversations table does not exist. Run Epic 8 migrations first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    RAISE EXCEPTION 'messages table does not exist. Run Epic 8 migrations first.';
  END IF;
END;
$$;

-- Drop existing conversation creation policy
DROP POLICY IF EXISTS \"Users can create direct conversations\" ON conversations;
DROP POLICY IF EXISTS \"Anyone can create conversations\" ON conversations;

-- New policy: Only friends can create direct conversations
CREATE POLICY \"Only friends can create direct conversations\"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = ANY(participants) AND
    (
      -- Allow group conversations (3+ participants)
      type = 'group' OR
      (
        -- For direct conversations, both must be friends
        type = 'direct' AND
        -- Not blocked
        NOT EXISTS (
          SELECT 1 FROM blocked_users
          WHERE (blocker_id = auth.uid() AND blocked_id = ANY(participants))
             OR (blocker_id = ANY(participants) AND blocked_id = auth.uid())
        ) AND
        -- Are friends
        EXISTS (
          SELECT 1 FROM friendships
          WHERE user_id = auth.uid() 
            AND friend_id = ANY(participants)
            AND status = 'active'
        )
      )
    )
  );

COMMENT ON POLICY \"Only friends can create direct conversations\" ON conversations 
  IS 'Enforce friends-only direct messaging, but allow group conversations';
`

**MCP Command:**
`ash
warp mcp run supabase \"apply_migration project_id=<your_project_id> name=messaging_integration query='<paste SQL>'\"
`

---

### **STEP 2: Update create_or_get_direct_conversation() Function (60 min)**

Add to same migration file:

`sql
-- ============================================================
-- Function: Create or get direct conversation (updated)
-- Now validates friendship and blocking
-- ============================================================

CREATE OR REPLACE FUNCTION create_or_get_direct_conversation(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conv_id UUID;
  v_current_user_id UUID := auth.uid();
  v_participant_array UUID[];
BEGIN
  -- Validate authentication
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_current_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot message yourself';
  END IF;
  
  -- **NEW: Check if blocked**
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = v_current_user_id AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = v_current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot message blocked user';
  END IF;
  
  -- **NEW: Check if friends**
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = v_current_user_id 
      AND friend_id = p_other_user_id 
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Can only message friends. Send them a friend request first.';
  END IF;
  
  -- Sort participant IDs to ensure consistent ordering
  v_participant_array := ARRAY[
    LEAST(v_current_user_id, p_other_user_id), 
    GREATEST(v_current_user_id, p_other_user_id)
  ];
  
  -- Try to find existing conversation
  SELECT id INTO v_conv_id 
  FROM conversations
  WHERE type = 'direct' 
    AND participants = v_participant_array 
  LIMIT 1;
  
  -- Create new conversation if doesn't exist
  IF v_conv_id IS NULL THEN
    INSERT INTO conversations (type, participants, created_by)
    VALUES ('direct', v_participant_array, v_current_user_id)
    RETURNING id INTO v_conv_id;
  END IF;
  
  RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_or_get_direct_conversation 
  IS 'Get or create direct conversation, enforcing friendship and blocking rules';
`

---

### **STEP 3: Add Message RLS Policy for Blocking (30 min)**

`sql
-- ============================================================
-- RLS: Prevent messages to/from blocked users
-- ============================================================

-- Drop existing policy if any
DROP POLICY IF EXISTS \"Users can send messages\" ON messages;

-- New policy: Users can send messages only to non-blocked friends
CREATE POLICY \"Users can send messages to non-blocked friends\"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    -- Verify conversation exists and user is participant
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND auth.uid() = ANY(c.participants)
    ) AND
    -- Verify not blocked (for direct conversations)
    NOT EXISTS (
      SELECT 1 
      FROM conversations c
      JOIN blocked_users b ON (
        (b.blocker_id = auth.uid() AND b.blocked_id = ANY(c.participants))
        OR (b.blocker_id = ANY(c.participants) AND b.blocked_id = auth.uid())
      )
      WHERE c.id = conversation_id
        AND c.type = 'direct'
    )
  );

COMMENT ON POLICY \"Users can send messages to non-blocked friends\" ON messages
  IS 'Allow messaging only to non-blocked conversation participants';
`

---

### **STEP 4: Create View for Conversations with Friend Status (45 min)**

`sql
-- ============================================================
-- View: Conversations with friend/online status
-- Makes it easy to query conversations with friend metadata
-- ============================================================

CREATE OR REPLACE VIEW conversations_with_friend_status AS
SELECT 
  c.id as conversation_id,
  c.type,
  c.participants,
  c.created_at,
  c.updated_at,
  -- For direct conversations, get friend info
  CASE 
    WHEN c.type = 'direct' THEN (
      SELECT jsonb_build_object(
        'user_id', p.id,
        'username', p.username,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'is_online', p.is_online,
        'last_active', p.last_active,
        'is_friend', EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.user_id = auth.uid()
            AND f.friend_id = p.id
            AND f.status = 'active'
        ),
        'is_blocked', EXISTS (
          SELECT 1 FROM blocked_users b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
             OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
        )
      )
      FROM profiles p
      WHERE p.id = ANY(c.participants)
        AND p.id != auth.uid()
      LIMIT 1
    )
    ELSE NULL
  END as friend_info,
  -- Latest message preview
  (
    SELECT jsonb_build_object(
      'content', m.content,
      'created_at', m.created_at,
      'sender_id', m.sender_id
    )
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) as latest_message
FROM conversations c
WHERE auth.uid() = ANY(c.participants);

COMMENT ON VIEW conversations_with_friend_status 
  IS 'Conversations enriched with friend/online status for the UI';

-- Grant access
GRANT SELECT ON conversations_with_friend_status TO authenticated;
`

---

### **STEP 5: Update Frontend Conversation Service (45 min)**

Update: `src/services/conversationService.ts`

`	ypescript
import { supabase } from '@/lib/supabase';

export interface ConversationWithFriendStatus {
  conversation_id: string;
  type: 'direct' | 'group';
  participants: string[];
  created_at: string;
  updated_at: string;
  friend_info?: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    is_online: boolean;
    last_active: string;
    is_friend: boolean;
    is_blocked: boolean;
  };
  latest_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

/**
 * Create or get direct conversation with friendship validation
 * Will throw error if not friends or if blocked
 */
export async function createOrGetDirectConversation(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_or_get_direct_conversation', {
    p_other_user_id: userId,
  });
  
  if (error) {
    // Handle specific errors with user-friendly messages
    if (error.message.includes('Can only message friends')) {
      throw new Error('You can only message your friends. Send them a friend request first!');
    } else if (error.message.includes('Cannot message blocked user')) {
      throw new Error('You cannot message this user.');
    }
    throw error;
  }
  
  return data as string;
}

/**
 * Get all conversations with friend/online status
 */
export async function getConversationsWithFriendStatus(): Promise<ConversationWithFriendStatus[]> {
  const { data, error } = await supabase
    .from('conversations_with_friend_status')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Check if user can message another user
 * Returns true if they're friends and not blocked
 */
export async function canMessageUser(userId: string): Promise<boolean> {
  try {
    await createOrGetDirectConversation(userId);
    return true;
  } catch {
    return false;
  }
}
`

---

### **STEP 6: Update Conversation List UI Component (45 min)**

Update: `src/components/ConversationList.tsx`

`	ypescript
import { useQuery } from '@tanstack/react-query';
import { getConversationsWithFriendStatus } from '@/services/conversationService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Circle } from 'lucide-react';

export function ConversationList() {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations-with-status'],
    queryFn: getConversationsWithFriendStatus,
  });
  
  if (isLoading) return <div>Loading conversations...</div>;
  
  return (
    <div className=\"space-y-2\">
      {conversations?.map((conv) => (
        <div 
          key={conv.conversation_id}
          className=\"flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer\"
        >
          {/* Avatar with online status */}
          <div className=\"relative\">
            <Avatar>
              <AvatarImage src={conv.friend_info?.avatar_url} />
              <AvatarFallback>
                {conv.friend_info?.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            {conv.friend_info?.is_online && (
              <Circle 
                className=\"absolute bottom-0 right-0 w-3 h-3 fill-green-500 stroke-white\" 
              />
            )}
          </div>
          
          {/* Conversation info */}
          <div className=\"flex-1 min-w-0\">
            <div className=\"flex items-center justify-between\">
              <p className=\"font-medium truncate\">
                {conv.friend_info?.full_name || 'Group Chat'}
              </p>
              <span className=\"text-xs text-muted-foreground\">
                {conv.latest_message && formatDistanceToNow(
                  new Date(conv.latest_message.created_at), 
                  { addSuffix: true }
                )}
              </span>
            </div>
            
            {/* Last message preview */}
            {conv.latest_message && (
              <p className=\"text-sm text-muted-foreground truncate\">
                {conv.latest_message.content}
              </p>
            )}
            
            {/* Friend status indicators */}
            {conv.friend_info?.is_blocked && (
              <p className=\"text-xs text-destructive\">Blocked</p>
            )}
            {!conv.friend_info?.is_friend && (
              <p className=\"text-xs text-warning\">Not friends</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
`

---

### **STEP 7: Add Message Button with Friendship Check (30 min)**

Create: `src/components/MessageUserButton.tsx`

`	ypescript
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { createOrGetDirectConversation } from '@/services/conversationService';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface MessageUserButtonProps {
  userId: string;
  username: string;
}

export function MessageUserButton({ userId, username }: MessageUserButtonProps) {
  const router = useRouter();
  
  const createConversationMutation = useMutation({
    mutationFn: () => createOrGetDirectConversation(userId),
    onSuccess: (conversationId) => {
      router.push(`/messages/${conversationId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Cannot send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  return (
    <Button
      onClick={() => createConversationMutation.mutate()}
      disabled={createConversationMutation.isPending}
    >
      <MessageCircle className=\"w-4 h-4 mr-2\" />
      Message {username}
    </Button>
  );
}
`

---

## 🧪 Testing & Validation

### **SQL Tests**

`sql
-- Test 1: Verify policies exist
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
  AND policyname LIKE '%friend%';

-- Test 2: Test friends can message
-- (As User A who is friends with User B)
SELECT create_or_get_direct_conversation('user_b_uuid');
-- Should succeed

-- Test 3: Test non-friends cannot message
-- (As User A who is NOT friends with User C)
SELECT create_or_get_direct_conversation('user_c_uuid');
-- Should raise exception: 'Can only message friends'

-- Test 4: Test blocked users cannot message
SELECT block_user('user_b_uuid');
SELECT create_or_get_direct_conversation('user_b_uuid');
-- Should raise exception: 'Cannot message blocked user'

-- Test 5: Verify view works
SELECT * FROM conversations_with_friend_status;
`

### **Frontend Integration Tests**

`	ypescript
// tests/integration/messaging-friends.test.ts
import { 
  createOrGetDirectConversation, 
  canMessageUser 
} from '@/services/conversationService';

describe('Messaging + Friends Integration', () => {
  it('should allow friends to create conversation', async () => {
    // Assume users are friends
    const convId = await createOrGetDirectConversation(friendUserId);
    expect(convId).toBeDefined();
  });

  it('should prevent non-friends from messaging', async () => {
    // Assume users are NOT friends
    await expect(
      createOrGetDirectConversation(nonFriendUserId)
    ).rejects.toThrow('Can only message friends');
  });

  it('should prevent blocked users from messaging', async () => {
    await blockUser(userId);
    await expect(
      createOrGetDirectConversation(userId)
    ).rejects.toThrow('Cannot message blocked user');
  });

  it('should check if can message user', async () => {
    const canMessage = await canMessageUser(friendUserId);
    expect(canMessage).toBe(true);
  });
});
`

### **E2E Test Script**

`ash
# Using Puppeteer MCP
warp mcp run puppeteer \"navigate localhost:3000 and test:
1. Login as User A
2. Navigate to User B's profile (friend)
3. Click 'Message' button
4. Verify conversation opens successfully
5. Send a message
6. Navigate to User C's profile (not friend)
7. Click 'Message' button
8. Verify error: 'Send friend request first'
9. Block User B
10. Try to message User B
11. Verify error: 'Cannot message this user'\"
`

---

## 🎯 MCP Integration Summary

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql`, `get_advisors security` |
| 🧠 **Context7** | Medium | Analyze conversationService.ts integration points |
| 🤖 **Puppeteer** | Heavy | E2E test complete messaging flow with friends |
| 🐙 **GitHub** | Light | Create issue for any breaking changes |

---

## 📋 Definition of Done

- [ ] Migration `20250124_messaging_integration.sql` applied
- [ ] RLS policies enforce friends-only messaging
- [ ] `create_or_get_direct_conversation()` validates friendship + blocking
- [ ] View `conversations_with_friend_status` created
- [ ] Frontend service layer updated
- [ ] UI components show friend/online status
- [ ] Error messages user-friendly
- [ ] Integration tests pass
- [ ] E2E test validates complete flow
- [ ] Zero breaking changes to existing Epic 8.x functionality
- [ ] Security advisors show no vulnerabilities

---

## 🔗 Related Stories

- **Previous:** [Story 9.1.8 - Notifications Integration](STORY_9.1.8_Notifications_Integration.md)
- **Next:** Epic 9.1 Complete! 🎉

---

**Status:** 📋 Ready for Implementation  
**Estimated Time:** 2 days  
**Last Updated:** 2025-01-15
