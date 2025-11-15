# 📋 STORY 9.1.3: Friend Requests with Auto-Expiry

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 2 days  
**Priority:** 🔴 Critical  
**Status:** 📋 To Do  
**Dependencies:** Story 9.1.2 (Bidirectional Friendships)

---

## 🎯 **Story Goal**

Implement a complete friend request workflow with **pending/accepted/rejected/cancelled states** and **auto-expiry after 30 days** to prevent stale requests cluttering the database.

---

## ✅ **Acceptance Criteria**

- [ ] **AC1:** `friend_requests` table created with status workflow
  - Status states: 'pending', 'accepted', 'rejected', 'cancelled'
  - Optional message field for personalized requests (max 200 chars)
  - `expires_at` timestamp set to 30 days from creation
  
- [ ] **AC2:** Database function `accept_friend_request()` atomically:
  - Creates bidirectional friendship (2 rows in friendships table)
  - Updates request status to 'accepted'
  - Sends notification to request sender
  - Returns success/error response
  
- [ ] **AC3:** Database function `reject_friend_request()` implemented
  - Updates request status to 'rejected'
  - Does NOT create friendship
  - Sends optional notification to sender
  
- [ ] **AC4:** Unique constraint prevents duplicate pending requests
  - Cannot send multiple pending requests to same user
  - Can resend after rejection/cancellation
  
- [ ] **AC5:** RLS policies enforce request privacy
  - Only sender and receiver see the request
  - Expired requests auto-hidden from queries
  
- [ ] **AC6:** Realtime subscription for instant notifications
  - Receiver gets instant notification when request arrives
  - Sender gets instant notification on acceptance/rejection
  
- [ ] **AC7:** Frontend UI integration test passes
  - Send friend request button works
  - Pending requests list displays correctly
  - Accept/reject buttons work
  - Real-time updates work (< 2 seconds)

---

## 🔧 **Implementation Steps**

### **Step 1: Create Friend Requests Schema** (4 hours)

**File:** `supabase/migrations/20250118_friend_requests.sql`

```sql
-- ============================================
-- MIGRATION: Friend Requests with Auto-Expiry
-- Date: 2025-01-18
-- Story: 9.1.3
-- ============================================

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  
  -- Optional personalized message
  message TEXT CHECK (LENGTH(message) <= 200),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL,
  
  -- Constraints
  CONSTRAINT friend_requests_different_users 
    CHECK (sender_id != receiver_id),
  
  -- Unique constraint: only one pending request per pair
  CONSTRAINT friend_requests_unique_pending 
    UNIQUE (sender_id, receiver_id) 
    WHERE (status = 'pending')
);

COMMENT ON TABLE friend_requests IS 'Friend request workflow with auto-expiry after 30 days';

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================

-- Index: Pending requests by receiver (for "Received" tab)
CREATE INDEX idx_friend_requests_receiver_pending
  ON friend_requests(receiver_id, created_at DESC)
  WHERE status = 'pending';

-- Index: Pending requests by sender (for "Sent" tab)
CREATE INDEX idx_friend_requests_sender_pending
  ON friend_requests(sender_id, created_at DESC)
  WHERE status = 'pending';

-- Index: Expired requests for cleanup job
CREATE INDEX idx_friend_requests_expired
  ON friend_requests(expires_at)
  WHERE status = 'pending' AND expires_at < NOW();

-- Index: Request history by user
CREATE INDEX idx_friend_requests_user_history
  ON friend_requests(sender_id, receiver_id, updated_at DESC);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_friend_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_request_timestamp
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_request_timestamp();

-- ============================================
-- FUNCTION: Send Friend Request
-- ============================================

CREATE OR REPLACE FUNCTION send_friend_request(
  p_receiver_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_request_id UUID;
BEGIN
  -- Validation: Cannot send to self
  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot send friend request to yourself'
    );
  END IF;
  
  -- Validation: Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = v_sender_id AND blocked_id = p_receiver_id)
       OR (blocker_id = p_receiver_id AND blocked_id = v_sender_id)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot send request to blocked user'
    );
  END IF;
  
  -- Validation: Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = v_sender_id 
      AND friend_id = p_receiver_id 
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already friends with this user'
    );
  END IF;
  
  -- Insert friend request
  INSERT INTO friend_requests (sender_id, receiver_id, message)
  VALUES (v_sender_id, p_receiver_id, p_message)
  RETURNING id INTO v_request_id;
  
  -- Send notification to receiver
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_receiver_id,
    'friend_request',
    'New friend request',
    (SELECT full_name FROM profiles WHERE id = v_sender_id) || ' sent you a friend request',
    jsonb_build_object(
      'request_id', v_request_id,
      'sender_id', v_sender_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_friend_request IS 'Send friend request with validation and notification';

-- ============================================
-- FUNCTION: Accept Friend Request
-- ============================================

CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_receiver_id UUID := auth.uid();
BEGIN
  -- Get request details
  SELECT * INTO v_request
  FROM friend_requests
  WHERE id = p_request_id 
    AND receiver_id = v_receiver_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;
  
  -- Check if expired
  IF v_request.expires_at < NOW() THEN
    UPDATE friend_requests SET status = 'expired' WHERE id = p_request_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request has expired'
    );
  END IF;
  
  -- Create bidirectional friendship (trigger will create reverse)
  INSERT INTO friendships (user_id, friend_id, created_at)
  VALUES (v_request.sender_id, v_request.receiver_id, NOW());
  
  -- Update request status
  UPDATE friend_requests 
  SET status = 'accepted' 
  WHERE id = p_request_id;
  
  -- Send notification to sender
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_request.sender_id,
    'friend_accepted',
    'Friend request accepted',
    (SELECT full_name FROM profiles WHERE id = v_receiver_id) || ' accepted your friend request',
    jsonb_build_object(
      'request_id', p_request_id,
      'accepter_id', v_receiver_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'friendship_created', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_friend_request IS 'Accept friend request and create bidirectional friendship';

-- ============================================
-- FUNCTION: Reject Friend Request
-- ============================================

CREATE OR REPLACE FUNCTION reject_friend_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_receiver_id UUID := auth.uid();
BEGIN
  -- Update request status
  UPDATE friend_requests
  SET status = 'rejected'
  WHERE id = p_request_id
    AND receiver_id = v_receiver_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Cancel Friend Request (Sender)
-- ============================================

CREATE OR REPLACE FUNCTION cancel_friend_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_sender_id UUID := auth.uid();
BEGIN
  UPDATE friend_requests
  SET status = 'cancelled'
  WHERE id = p_request_id
    AND sender_id = v_sender_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Policy: View requests (sender or receiver only)
CREATE POLICY "Users view their requests"
  ON friend_requests FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
  );

-- Policy: Insert requests (sender only)
CREATE POLICY "Users send requests"
  ON friend_requests FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id != receiver_id
  );

-- Policy: Update requests (receiver or sender only)
CREATE POLICY "Users update requests"
  ON friend_requests FOR UPDATE
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
  );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;

-- ============================================
-- CLEANUP: Auto-Expire Old Requests (Cron Job)
-- ============================================

-- Create function to expire old requests
CREATE OR REPLACE FUNCTION expire_old_friend_requests()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE friend_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RAISE NOTICE 'Expired % friend requests', v_expired_count;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (if available) or Edge Function
-- Run daily at 2 AM UTC
-- SELECT cron.schedule('expire_friend_requests', '0 2 * * *', 'SELECT expire_old_friend_requests()');
```

**MCP Command:**
```bash
warp mcp run supabase "apply_migration 20250118_friend_requests"
warp mcp run supabase "execute_sql SELECT * FROM friend_requests LIMIT 5"
```

---

### **Step 2: Test Request Workflow** (3 hours)

**Test Script:**

```sql
-- Test 1: Send friend request
SELECT send_friend_request(
  p_receiver_id := (SELECT id FROM auth.users WHERE email = 'userB@test.com'),
  p_message := 'Hey! Let''s be friends!'
);

-- Test 2: Accept friend request
SELECT accept_friend_request('request-uuid-here');

-- Test 3: Verify bidirectional friendship created
SELECT COUNT(*) FROM friendships 
WHERE (user_id = 'userA' AND friend_id = 'userB')
   OR (user_id = 'userB' AND friend_id = 'userA');
-- Should return 2

-- Test 4: Reject friend request
SELECT reject_friend_request('request-uuid-here');

-- Test 5: Test duplicate prevention
SELECT send_friend_request('same-user-id');
-- Should fail with unique constraint error

-- Test 6: Test expiry
UPDATE friend_requests SET expires_at = NOW() - INTERVAL '1 day' WHERE id = 'uuid';
SELECT accept_friend_request('uuid');
-- Should fail with "expired" error
```

**MCP Commands:**
```bash
warp mcp run supabase "execute_sql [test script]"
warp mcp run supabase "get_advisors security"
```

---

## 🚀 **Frontend Integration**

### **Step 3: Update Friend Service** (4 hours)

**File:** `src/services/friendRequestService.ts`

```typescript
// src/services/friendRequestService.ts
import { supabase } from '../lib/supabase';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  created_at: string;
  expires_at: string;
  sender?: Profile;
  receiver?: Profile;
}

/**
 * Send friend request
 */
export async function sendFriendRequest(
  userId: string,
  message?: string
): Promise<{ success: boolean; request_id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('send_friend_request', {
    p_receiver_id: userId,
    p_message: message || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Get pending requests (received)
 */
export async function getReceivedRequests() {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,
      sender_id,
      message,
      created_at,
      expires_at,
      sender:profiles!friend_requests_sender_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get sent requests
 */
export async function getSentRequests() {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,
      receiver_id,
      message,
      status,
      created_at,
      expires_at,
      receiver:profiles!friend_requests_receiver_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Accept friend request
 */
export async function acceptFriendRequest(requestId: string) {
  const { data, error } = await supabase.rpc('accept_friend_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data;
}

/**
 * Reject friend request
 */
export async function rejectFriendRequest(requestId: string) {
  const { data, error } = await supabase.rpc('reject_friend_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data;
}

/**
 * Cancel friend request (sender)
 */
export async function cancelFriendRequest(requestId: string) {
  const { data, error } = await supabase.rpc('cancel_friend_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data;
}
```

---

### **Step 4: Create React Hooks** (3 hours)

**File:** `src/hooks/useFriendRequests.ts`

```typescript
// src/hooks/useFriendRequests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getReceivedRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from '../services/friendRequestService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function useFriendRequests() {
  const queryClient = useQueryClient();

  // Query: Received requests
  const {
    data: receivedRequests = [],
    isLoading: isLoadingReceived,
  } = useQuery({
    queryKey: ['friend-requests', 'received'],
    queryFn: getReceivedRequests,
  });

  // Query: Sent requests
  const {
    data: sentRequests = [],
    isLoading: isLoadingSent,
  } = useQuery({
    queryKey: ['friend-requests', 'sent'],
    queryFn: getSentRequests,
  });

  // Mutation: Send request
  const sendRequest = useMutation({
    mutationFn: ({ userId, message }: { userId: string; message?: string }) =>
      sendFriendRequest(userId, message),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Friend request sent!');
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      } else {
        toast.error(data.error || 'Failed to send request');
      }
    },
  });

  // Mutation: Accept request
  const acceptRequest = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Friend request accepted!');
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
        queryClient.invalidateQueries({ queryKey: ['friends'] });
      } else {
        toast.error(data.error || 'Failed to accept request');
      }
    },
  });

  // Mutation: Reject request
  const rejectRequest = useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: () => {
      toast.success('Friend request rejected');
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('friend_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        (payload) => {
          console.log('Friend request change:', payload);
          queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    receivedRequests,
    sentRequests,
    isLoading: isLoadingReceived || isLoadingSent,
    sendRequest: sendRequest.mutate,
    acceptRequest: acceptRequest.mutate,
    rejectRequest: rejectRequest.mutate,
    isSending: sendRequest.isPending,
    isAccepting: acceptRequest.isPending,
  };
}
```

---

### **Step 5: Build UI Components** (4 hours)

**File:** `src/components/FriendRequestCard.tsx`

```typescript
// src/components/FriendRequestCard.tsx
import { FriendRequest } from '../services/friendRequestService';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isAccepting?: boolean;
}

export function FriendRequestCard({ request, onAccept, onReject, isAccepting }: Props) {
  const timeAgo = formatDistanceToNow(new Date(request.created_at), {
    addSuffix: true,
  });

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar src={request.sender?.avatar_url} alt={request.sender?.full_name} />
        <div>
          <p className="font-medium">{request.sender?.full_name}</p>
          <p className="text-sm text-muted-foreground">@{request.sender?.username}</p>
          {request.message && (
            <p className="text-sm mt-1 italic">"{request.message}"</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => onAccept(request.id)}
          disabled={isAccepting}
        >
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReject(request.id)}
          disabled={isAccepting}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
```

---

### **Step 6: Frontend Testing** (2 hours)

**Manual Test:**
1. Navigate to `/friends/requests`
2. Send friend request to another user
3. Switch accounts - verify request appears instantly
4. Accept request - verify both users become friends
5. Check friends list updates in real-time

**E2E Test:**
```bash
warp mcp run puppeteer "test friend request flow:
1. Login as User A
2. Search for User B
3. Send friend request with message
4. Login as User B
5. Verify request appears in notifications
6. Accept request
7. Verify both users are now friends"
```

---

## 📦 **Deliverables**

- [ ] `supabase/migrations/20250118_friend_requests.sql`
- [ ] `src/services/friendRequestService.ts`
- [ ] `src/hooks/useFriendRequests.ts`
- [ ] `src/components/FriendRequestCard.tsx`
- [ ] E2E test script

---

## 🎯 **MCP Integration Summary**

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql`, `get_advisors` |
| 🧠 **Context7** | Medium | `analyze`, `find usage` |
| 🤖 **Puppeteer** | Medium | E2E test for request workflow |

---

## ✅ **Definition of Done**

- [ ] Migration applied successfully
- [ ] All database functions tested
- [ ] RLS policies tested with multiple users
- [ ] Frontend displays requests correctly
- [ ] Accept/reject buttons work
- [ ] Real-time updates work (< 2 seconds)
- [ ] Auto-expiry tested (30 days)
- [ ] Code reviewed and approved

---

**Next Story:** [STORY 9.1.4 - Follow System](./STORY_9.1.4_Follow_System.md)
