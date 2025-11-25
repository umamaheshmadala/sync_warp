Build an in-app notification center with a bell icon in the header, unread count badge, and dropdown list of recent notifications. Users can mark notifications as read, navigate to related content, and receive real-time updates.

---

## ✅ Acceptance Criteria

### UI Components
- [ ] Bell icon in app header with unread badge
- [ ] Dropdown notification list (last 20 notifications)
- [ ] Notification items with icon, title, message, timestamp
- [ ] Unread indicator (blue dot)
- [ ] Empty state: "No notifications"

### Functionality
- [ ] Mark notification as read on click
- [ ] "Mark all as read" button
- [ ] Click notification → navigate to relevant page
- [ ] Real-time updates via Supabase Realtime
- [ ] Unread count updates in real-time
- [ ] Infinite scroll for older notifications

### Notification Types
- [ ] Friend request received
- [ ] Friend request accepted
- [ ] Deal shared with you
- [ ] Friend activity (optional)

---

## 🎨 Component Implementation

### File: `src/components/notifications/NotificationCenter.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, UserPlus, Check, Share2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS = {
  friend_request: UserPlus,
  friend_accepted: Check,
  deal_shared: Share2,
} as const;

const NOTIFICATION_COLORS = {
  friend_request: 'text-blue-500 bg-blue-50',
  friend_accepted: 'text-green-500 bg-green-50',
  deal_shared: 'text-purple-500 bg-purple-50',
} as const;

export function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Notification[];
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Real-time updates
  useRealtimeNotifications();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    const actionUrl = notification.data?.action_url;
    if (actionUrl) {
      navigate(actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-base">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type as keyof typeof NOTIFICATION_ICONS] || Bell;
                const colorClass = NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] || 'text-gray-500 bg-gray-50';

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex items-start space-x-3 p-3 cursor-pointer focus:bg-muted',
                      !notification.read && 'bg-blue-50/50'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 🔄 Real-Time Updates Hook

### File: `src/hooks/useRealtimeNotifications.ts`

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`,
        },
        (payload) => {
          // Invalidate notifications query
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast for new notification
          const notification = payload.new as any;
          toast(notification.message, {
            icon: '🔔',
            duration: 4000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Invalidate on updates (mark as read)
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
```

---

## 📱 Integration into App Header

### Update `src/components/layout/AppLayout.tsx`:

```typescript
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo and navigation */}
          </div>

          <div className="flex items-center space-x-2">
            {/* Add Notification Center */}
            <NotificationCenter />
            
            {/* Other header items (profile menu, etc.) */}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
```

---

## 📄 Full Notifications Page

### File: `src/pages/NotificationsPage.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Notifications</h1>
        <p className="text-muted-foreground">
          View and manage all your notifications
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'p-4 rounded-lg border flex items-start justify-between',
                !notification.read && 'bg-blue-50/50 border-blue-200'
              )}
            >
              <div className="flex-1">
                <h3 className="font-medium">{notification.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteNotificationMutation.mutate(notification.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Bell icon appears in header
- [ ] Unread count badge displays correctly
- [ ] Click bell → dropdown opens
- [ ] Notifications display with correct icons and text
- [ ] Click notification → navigates to correct page
- [ ] Click notification → marks as read
- [ ] "Mark all as read" button works
- [ ] Real-time: Create notification → appears instantly
- [ ] Empty state displays when no notifications
- [ ] Full notifications page works

### Test Notification Creation

```sql
-- Create a test notification
INSERT INTO notifications (user_id, type, title, message, data)
VALUES (
  '<your-user-id>',
  'friend_request',
  'New Friend Request',
  'John Doe sent you a friend request',
  '{"action_url": "/friends/requests", "sender_id": "123"}'::jsonb
);
```

---

## ✅ Definition of Done

- [ ] `NotificationCenter` component created
- [ ] Bell icon with unread badge in header
- [ ] Dropdown notification list working
- [ ] Mark as read functionality implemented
- [ ] Mark all as read working
- [ ] Navigation from notifications working
- [ ] Real-time updates via Supabase Realtime
- [ ] Full notifications page created
- [ ] Integrated into app header
- [ ] Manual testing completed

---

**Next Story:** [STORY 9.6.5: Notification Preferences UI](./STORY_9.6.5_Notification_Preferences.md)
