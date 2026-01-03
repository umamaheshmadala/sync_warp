# 📋 STORY 9.1.8: Notifications Integration

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Owner:** Backend/Database Team  
**Effort:** 1 day | **Priority:** 🟡 Medium  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 9.1.3 (Friend Requests)

---

## 🎯 Story Goal

Integrate friends module with the notifications system to automatically notify users of friend-related events (requests, acceptances, unfriending) via database triggers and realtime subscriptions.

---

## ✅ Acceptance Criteria

- [ ] **AC1:** Notification types added: `friend_request`, `friend_accepted`, `friend_removed`
- [ ] **AC2:** Database triggers auto-create notifications on friend events
- [ ] **AC3:** friend_activities table tracks all friend-related events
- [ ] **AC4:** Realtime subscription delivers notifications instantly
- [ ] **AC5:** Notification bell UI shows unread count

---

## 🔧 Implementation Steps

### **STEP 1: Add Friend Notification Types (15 min)**

Create migration: `supabase/migrations/20250123_notifications_integration.sql`

`sql
-- ============================================================
-- STORY 9.1.8: Notifications Integration
-- Auto-notify users of friend events
-- ============================================================

-- Verify notifications table exists (from previous epic)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE EXCEPTION 'notifications table does not exist. Run Epic 8 migrations first.';
  END IF;
END;
$$;

-- Add CHECK constraint for friend notification types
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'message', 'mention', 'reaction',  -- From Epic 8
    'friend_request', 'friend_accepted', 'friend_removed'  -- New
  ));
`

**MCP Command:**
`ash
warp mcp run supabase \"apply_migration project_id=<your_project_id> name=notifications_integration query='<paste SQL>'\"
`

---

### **STEP 2: Create Notification Trigger for Friend Requests (30 min)**

Add to same migration file:

`sql
-- ============================================================
-- Trigger: Auto-notify on friend request
-- ============================================================

CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, data, read)
    VALUES (
      NEW.receiver_id,
      'friend_request',
      'New friend request',
      (SELECT full_name FROM profiles WHERE id = NEW.sender_id) || ' sent you a friend request',
      jsonb_build_object(
        'request_id', NEW.id,
        'sender_id', NEW.sender_id,
        'sender_username', (SELECT username FROM profiles WHERE id = NEW.sender_id)
      ),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

COMMENT ON FUNCTION notify_friend_request IS 'Auto-notify receiver when friend request is sent';
`

---

### **STEP 3: Notification Trigger for Friend Acceptance (30 min)**

`sql
-- ============================================================
-- Trigger: Auto-notify on friend accepted
-- This is handled in accept_friend_request() function
-- ============================================================

-- Update accept_friend_request function to include notification
CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_receiver_id UUID := auth.uid();
  v_sender_id UUID;
  v_friend_exists BOOLEAN;
BEGIN
  -- Get sender_id and validate
  SELECT sender_id INTO v_sender_id
  FROM friend_requests
  WHERE id = p_request_id
    AND receiver_id = v_receiver_id
    AND status = 'pending';
  
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;
  
  -- Update request status
  UPDATE friend_requests 
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_request_id;
  
  -- Create bidirectional friendship
  INSERT INTO friendships (user_id, friend_id, status)
  VALUES 
    (v_receiver_id, v_sender_id, 'active'),
    (v_sender_id, v_receiver_id, 'active')
  ON CONFLICT (user_id, friend_id) 
  DO UPDATE SET status = 'active', unfriended_at = NULL;
  
  -- **NEW: Notify sender that request was accepted**
  INSERT INTO notifications (user_id, type, title, message, data, read)
  VALUES (
    v_sender_id,
    'friend_accepted',
    'Friend request accepted',
    (SELECT full_name FROM profiles WHERE id = v_receiver_id) || ' accepted your friend request',
    jsonb_build_object(
      'friend_id', v_receiver_id,
      'friend_username', (SELECT username FROM profiles WHERE id = v_receiver_id)
    ),
    false
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

---

### **STEP 4: Notification Trigger for Unfriending (30 min)**

`sql
-- ============================================================
-- Trigger: Auto-notify on unfriend (optional - may be too harsh)
-- Many platforms don't notify unfriending to avoid awkwardness
-- Uncomment if you want this behavior
-- ============================================================

CREATE OR REPLACE FUNCTION notify_unfriend()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unfriended' AND OLD.status = 'active' THEN
    -- Only notify the friend_id (not the user_id who initiated)
    INSERT INTO notifications (user_id, type, title, message, data, read)
    VALUES (
      NEW.friend_id,
      'friend_removed',
      'Friendship ended',
      (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' is no longer your friend',
      jsonb_build_object('user_id', NEW.user_id),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optionally create trigger (commented out by default)
-- CREATE TRIGGER trigger_notify_unfriend
--   AFTER UPDATE ON friendships
--   FOR EACH ROW
--   WHEN (OLD.status IS DISTINCT FROM NEW.status)
--   EXECUTE FUNCTION notify_unfriend();

COMMENT ON FUNCTION notify_unfriend IS 'Optionally notify user when unfriended (disabled by default)';
`

---

### **STEP 5: Create friend_activities Table (30 min)**

Add to same migration file:

`sql
-- ============================================================
-- Table: friend_activities
-- Tracks all friend-related events for activity feeds
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'sent_friend_request',
    'accepted_friend_request',
    'removed_friend',
    'started_following',
    'stopped_following',
    'blocked_user',
    'unblocked_user'
  )),
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user activity queries
CREATE INDEX idx_friend_activities_user ON friend_activities(user_id, created_at DESC);
CREATE INDEX idx_friend_activities_related_user ON friend_activities(related_user_id, created_at DESC);

-- RLS: Users see only their own activities
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own activities"
  ON friend_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activities"
  ON friend_activities FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE friend_activities IS 'Tracks all friend-related events for activity feeds and analytics';

-- Trigger: Log friend request activity
CREATE OR REPLACE FUNCTION log_friend_request_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO friend_activities (user_id, activity_type, related_user_id, metadata)
    VALUES (
      NEW.sender_id,
      'sent_friend_request',
      NEW.receiver_id,
      jsonb_build_object('request_id', NEW.id)
    );
  ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO friend_activities (user_id, activity_type, related_user_id, metadata)
    VALUES (
      NEW.receiver_id,
      'accepted_friend_request',
      NEW.sender_id,
      jsonb_build_object('request_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_friend_request_activity
  AFTER INSERT OR UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_friend_request_activity();

-- Trigger: Log friendship changes
CREATE OR REPLACE FUNCTION log_friendship_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unfriended' AND OLD.status = 'active' THEN
    INSERT INTO friend_activities (user_id, activity_type, related_user_id)
    VALUES (
      NEW.user_id,
      'removed_friend',
      NEW.friend_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_friendship_activity
  AFTER UPDATE ON friendships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_friendship_activity();

-- Trigger: Log follow activities
CREATE OR REPLACE FUNCTION log_follow_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO friend_activities (user_id, activity_type, related_user_id)
    VALUES (NEW.follower_id, 'started_following', NEW.following_id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO friend_activities (user_id, activity_type, related_user_id)
    VALUES (OLD.follower_id, 'stopped_following', OLD.following_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_follow_activity
  AFTER INSERT OR DELETE ON following
  FOR EACH ROW
  EXECUTE FUNCTION log_follow_activity();

-- Enable realtime for friend_activities
ALTER PUBLICATION supabase_realtime ADD TABLE friend_activities;
`

---

### **STEP 6: Create Notification Service Updates (30 min)**

Update: `src/services/notificationService.ts`

`	ypescript
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_accepted' | 'friend_removed' | 'message' | 'mention' | 'reaction';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

/**
 * Get all notifications for current user
 */
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  
  if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);
  
  if (error) throw error;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);
  
  if (error) throw error;
  return count || 0;
}

/**
 * Subscribe to realtime notifications
 */
export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}
`

---

### **STEP 6: Create React Hooks (30 min)**

Create: `src/hooks/useNotifications.ts`

`	ypescript
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getNotifications, 
  getUnreadCount, 
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications 
} from '@/services/notificationService';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export function useNotifications() {
  const queryClient = useQueryClient();
  
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });
  
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Subscribe to realtime notifications
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const unsubscribe = subscribeToNotifications(user.id, (notification) => {
        // Invalidate cache to show new notification
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        
        // Show toast for important notifications
        if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      });
      
      return unsubscribe;
    };
    
    const unsubscribePromise = getCurrentUser();
    
    return () => {
      unsubscribePromise.then((unsub) => unsub?.());
    };
  }, [queryClient]);
  
  return {
    notifications,
    unreadCount: unreadCount || 0,
    isLoading,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
`

---

### **STEP 7: Create Notification Bell UI Component (45 min)**

Create: `src/components/NotificationBell.tsx`

`	ypescript
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const { notifications, unreadCount, isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllRead();
  const router = useRouter();
  
  const handleNotificationClick = (notification: any) => {
    // Mark as read
    markReadMutation.mutate(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'friend_request') {
      router.push('/friends/requests');
    } else if (notification.type === 'friend_accepted') {
      router.push(`/profile/${notification.data.friend_id}`);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant=\"ghost\" size=\"icon\" className=\"relative\">
          <Bell className=\"w-5 h-5\" />
          {unreadCount > 0 && (
            <span className=\"absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center\">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align=\"end\" className=\"w-80\">
        <div className=\"flex items-center justify-between p-3 border-b\">
          <h3 className=\"font-semibold\">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant=\"ghost\" 
              size=\"sm\"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <div className=\"max-h-96 overflow-y-auto\">
          {notifications?.length === 0 ? (
            <div className=\"p-8 text-center text-muted-foreground\">
              No notifications
            </div>
          ) : (
            notifications?.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`cursor-pointer ${!notification.read ? 'bg-accent' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className=\"flex-1\">
                  <p className=\"font-medium\">{notification.title}</p>
                  <p className=\"text-sm text-muted-foreground\">{notification.message}</p>
                  <p className=\"text-xs text-muted-foreground mt-1\">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
`

---

## 🧪 Testing & Validation

### **SQL Tests**

`sql
-- Test 1: Verify notification types
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'notifications_type_check';

-- Test 2: Test friend request notification
INSERT INTO friend_requests (sender_id, receiver_id, status)
VALUES ('sender_uuid', 'receiver_uuid', 'pending');
-- Verify notification created
SELECT * FROM notifications WHERE user_id = 'receiver_uuid' AND type = 'friend_request';

-- Test 3: Test accept notification
SELECT accept_friend_request('request_uuid');
-- Verify notification created
SELECT * FROM notifications WHERE user_id = 'sender_uuid' AND type = 'friend_accepted';
`

### **Frontend Integration Tests**

`	ypescript
// tests/integration/notifications.test.ts
describe('Notifications Integration', () => {
  it('should create notification on friend request', async () => {
    // Send friend request
    // Verify notification appears in list
  });

  it('should show unread count', async () => {
    const count = await getUnreadCount();
    expect(typeof count).toBe('number');
  });

  it('should mark notification as read', async () => {
    await markNotificationRead('notification-id');
    // Verify read status updated
  });
});
`

---

## 🎯 MCP Integration Summary

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql` |
| 🧠 **Context7** | Light | Analyze notificationService.ts |
| 🤖 **Puppeteer** | Medium | E2E test notification flow |

---

## 📋 Definition of Done

- [ ] Migration `20250123_notifications_integration.sql` applied
- [ ] Notification types added for friend events
- [ ] Triggers auto-create notifications
- [ ] Realtime subscriptions working
- [ ] Notification bell component implemented
- [ ] Unread count displays correctly
- [ ] Integration tests pass
- [ ] E2E test validates full notification flow

---

## 🔗 Related Stories

- **Previous:** [Story 9.1.7 - Database Functions](STORY_9.1.7_Database_Functions.md)
- **Next:** [Story 9.1.9 - Messaging Integration](STORY_9.1.9_Messaging_Integration.md)

---

**Status:** 📋 Ready for Implementation  
**Estimated Time:** 1 day  
**Last Updated:** 2025-01-15
