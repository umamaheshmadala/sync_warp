# 🔔 EPIC 9.6: Friend Activity Feed & Notifications

**Epic Owner:** Frontend Engineering / Backend Engineering  
**Stakeholders:** Product, Mobile Engineering, QA  
**Dependencies:** Epic 9.1 (Foundation), Epic 9.4 (Services)  
**Timeline:** Week 7 (1 week, parallel with 9.5)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Build a **comprehensive activity feed and notification system** for friend events:
- Friend activity timeline (friends added, joined SynC, deal activity)
- Push notifications (FCM for Android, APNs for iOS)
- In-app notification center with unread badge
- Notification preferences (customize what you receive)
- Email notifications (optional)

This epic keeps users **engaged and informed** about their friends' activities.

---

## 📱 **Platform Support**

- **Web**: In-app notifications, email notifications
- **iOS**: Push notifications (APNs), in-app notifications
- **Android**: Push notifications (FCM), in-app notifications

---

## 🎯 **MCP Integration Strategy**

1. **🛢 Supabase MCP** (Heavy) - Edge functions for notifications
2. **🎨 Shadcn MCP** (Medium) - Activity feed UI, notification center
3. **🤖 Puppeteer MCP** (Light) - E2E notification flows

---

## ✅ **Success Criteria**

| Objective | KPI / Target |
|-----------|--------------|
| **Push Notification Delivery** | > 95% delivery rate |
| **Notification Engagement** | > 40% tap-through rate |
| **In-App Open Rate** | > 60% of users check notifications |
| **Email Opt-In** | > 30% users enable email notifications |
| **Notification Latency** | < 5s from event to delivery |

---

## 🗂️ **Stories in This Epic**

### **STORY 9.6.1: Activity Feed Database Schema** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🛢 Supabase MCP

**Description:**  
Create database schema for tracking friend activities.

**Acceptance Criteria:**
- [ ] `friend_activities` table (if not exists from Epic 9.1)
- [ ] Activity types: friend_added, friend_joined, deal_liked, deal_saved
- [ ] Database triggers for auto-logging activities
- [ ] Pagination support (cursor-based)
- [ ] Privacy filters (respect friend's privacy settings)

**Technical Spec:**
```sql
CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'friend_added',
    'friend_joined',
    'deal_liked',
    'deal_saved',
    'deal_shared'
  )),
  related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  related_deal_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_friend_activities_user_id ON friend_activities(user_id);
CREATE INDEX idx_friend_activities_created_at ON friend_activities(created_at DESC);

-- RLS: Users see only activities from their friends
CREATE POLICY "Users see friends' activities"
ON friend_activities FOR SELECT
USING (
  user_id IN (
    SELECT friend_id FROM friendships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Trigger: Log when users become friends
CREATE OR REPLACE FUNCTION log_friend_added()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO friend_activities (user_id, activity_type, related_user_id)
    VALUES (NEW.user_id, 'friend_added', NEW.friend_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_friend_added
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION log_friend_added();
```

---

### **STORY 9.6.2: Activity Feed UI Component** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🎨 Shadcn MCP

**Description:**  
Build timeline UI component for displaying friend activities.

**Acceptance Criteria:**
- [ ] Timeline component with activity cards
- [ ] Activity icons (UserPlus, Heart, Share)
- [ ] Infinite scroll with loading states
- [ ] Relative timestamps ("5 minutes ago")
- [ ] Click to view related content (deal, profile)
- [ ] Empty state: "No recent activity"

**UI Component:**
```typescript
// src/components/friends/FriendActivityFeed.tsx
import { UserPlus, Heart, Share, Tag } from 'lucide-react';

const ACTIVITY_ICONS = {
  friend_added: UserPlus,
  deal_liked: Heart,
  deal_saved: Tag,
  deal_shared: Share,
};

export function FriendActivityFeed() {
  const { data: activities, fetchNextPage, hasNextPage } = useFriendActivities();

  const getActivityText = (activity) => {
    switch (activity.activity_type) {
      case 'friend_added':
        return `${activity.user.full_name} is now friends with ${activity.related_user.full_name}`;
      case 'deal_liked':
        return `${activity.user.full_name} liked a deal`;
      case 'deal_saved':
        return `${activity.user.full_name} saved a deal`;
      case 'deal_shared':
        return `${activity.user.full_name} shared a deal`;
      default:
        return 'Activity';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Friend Activity</h2>
      
      {activities?.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No recent activity"
          description="When your friends are active, you'll see it here"
        />
      ) : (
        <div className="space-y-3">
          {activities?.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type];
            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">{getActivityText(activity)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          
          {hasNextPage && (
            <Button variant="ghost" onClick={() => fetchNextPage()}>
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### **STORY 9.6.3: Push Notifications Setup (FCM/APNs)** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Edge Functions)

**Description:**  
Setup Firebase Cloud Messaging (Android) and Apple Push Notification Service (iOS).

**Acceptance Criteria:**
- [ ] FCM setup for Android
- [ ] APNs setup for iOS
- [ ] Device token registration on app launch
- [ ] Token refresh handling
- [ ] Supabase Edge Function for sending notifications
- [ ] Notification triggers:
  - New friend request
  - Friend request accepted
  - Friend shared a deal with you
  - Friend's birthday (if enabled)

**Technical Spec:**
```typescript
// Supabase Edge Function: send_push_notification
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import admin from 'firebase-admin';

serve(async (req) => {
  const { user_id, title, body, data } = await req.json();

  // Get user's device tokens
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('token, platform')
    .eq('user_id', user_id);

  const results = await Promise.all(
    tokens.map(async ({ token, platform }) => {
      if (platform === 'android' || platform === 'ios') {
        return admin.messaging().send({
          token,
          notification: { title, body },
          data,
          apns: platform === 'ios' ? {
            payload: {
              aps: { sound: 'default' }
            }
          } : undefined,
        });
      }
    })
  );

  return new Response(JSON.stringify({ sent: results.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Database Trigger:**
```sql
-- Trigger: Send notification on friend request
CREATE OR REPLACE FUNCTION notify_friend_request_push()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send_push_notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'user_id', NEW.receiver_id,
        'title', 'New Friend Request',
        'body', (SELECT full_name FROM profiles WHERE id = NEW.sender_id) || ' sent you a friend request',
        'data', jsonb_build_object('type', 'friend_request', 'request_id', NEW.id)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_friend_request_push
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_push();
```

---

### **STORY 9.6.4: In-App Notification Center** ⏱️ 1 day
**Priority:** 🔴 Critical  
**MCP Usage:** 🎨 Shadcn MCP

**Description:**  
Build in-app notification center with bell icon and unread badge.

**Acceptance Criteria:**
- [ ] Bell icon in header with unread count badge
- [ ] Dropdown notification list (last 20)
- [ ] Mark as read on click
- [ ] Mark all as read button
- [ ] Click notification → navigate to relevant page
- [ ] Real-time updates via Supabase Realtime

**UI Component:**
```typescript
// src/components/notifications/NotificationCenter.tsx
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
        navigate('/friends/requests');
        break;
      case 'friend_accepted':
        navigate(`/friends/${notification.data.user_id}`);
        break;
      case 'deal_shared':
        navigate(`/deals/${notification.data.deal_id}`);
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications?.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={cn(
                  'flex items-start space-x-3 p-3 cursor-pointer',
                  !notif.read && 'bg-muted/50'
                )}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(notif.created_at)}
                  </p>
                </div>
                {!notif.read && (
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### **STORY 9.6.5: Notification Preferences UI** ⏱️ 1/2 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🎨 Shadcn MCP

**Description:**  
Settings page for customizing notification preferences.

**Acceptance Criteria:**
- [ ] Toggle for each notification type
- [ ] Separate controls for push/email/in-app
- [ ] "Mute all notifications" toggle
- [ ] Save preferences to database
- [ ] Real-time sync across devices

---

### **STORY 9.6.6: Email Notifications** ⏱️ 1/2 day
**Priority:** 🟢 Low  
**MCP Usage:** 🛢 Supabase MCP (Edge Function)

**Description:**  
Send email notifications for friend events using Resend or SendGrid.

**Acceptance Criteria:**
- [ ] Email templates for friend events
- [ ] Unsubscribe link in all emails
- [ ] Rate limiting (max 1 email per hour per user)
- [ ] Email preferences in settings
- [ ] Batch digest option (daily summary)

---

## 📦 **Deliverables**

### **Database:**
- `friend_activities` table
- `user_push_tokens` table
- Notification triggers

### **Edge Functions:**
- `send_push_notification` function
- `send_email_notification` function

### **Components:**
```
src/components/
├── friends/FriendActivityFeed.tsx
├── notifications/
│   ├── NotificationCenter.tsx
│   ├── NotificationItem.tsx
│   └── NotificationPreferences.tsx
```

### **Hooks:**
- `useNotifications()` - Fetch notifications with real-time updates
- `useFriendActivities()` - Fetch activity feed
- `useNotificationPreferences()` - Get/set preferences

---

## 📈 **Metrics**

- Push notification delivery rate
- Notification tap-through rate
- Most engaged notification types
- Email open rate
- Unsubscribe rate

---

**Next Epic:** [EPIC 9.7: Friends & Deal Sharing Integration](./EPIC_9.7_Friends_Deal_Sharing.md)
