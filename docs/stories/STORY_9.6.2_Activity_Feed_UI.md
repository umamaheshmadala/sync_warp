# Story 9.6.2: Activity Feed UI Component

**Epic:** [EPIC 9.6: Friend Activity Feed & Notifications](../epics/EPIC_9.6_Friend_Activity_Notifications.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**MCP Usage:** None (Pure Frontend)  
**Dependencies:** Story 9.6.1 (Database Schema)

---

## 📋 Story Description

Build a timeline UI component that displays friend activities in a clean, engaging format. The component should support infinite scroll, real-time updates, and navigation to related content (deals, profiles).

---

## ✅ Acceptance Criteria

### UI Components
- [ ] `FriendActivityFeed` component with timeline layout
- [ ] Activity cards with icons, text, and timestamps
- [ ] Infinite scroll with "Load More" button
- [ ] Loading states (skeleton loaders)
- [ ] Empty state: "No recent activity"
- [ ] Error handling with retry button

### Functionality
- [ ] Fetch activities using React Query
- [ ] Display relative timestamps ("5 minutes ago")
- [ ] Click activity → navigate to related content
- [ ] Real-time updates via Supabase Realtime
- [ ] Optimistic UI updates

### Activity Types
- [ ] `friend_added` - "X is now friends with Y"
- [ ] `deal_liked` - "X liked a deal"
- [ ] `deal_saved` - "X saved a deal"
- [ ] `deal_shared` - "X shared a deal"

---

## 🎨 Component Implementation

### File: `src/components/friends/FriendActivityFeed.tsx`

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { UserPlus, Heart, Tag, Share2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface FriendActivity {
  id: string;
  user_id: string;
  user_full_name: string;
  user_avatar_url: string | null;
  activity_type: 'friend_added' | 'deal_liked' | 'deal_saved' | 'deal_shared';
  related_user_id: string | null;
  related_user_full_name: string | null;
  related_deal_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const ACTIVITY_ICONS = {
  friend_added: UserPlus,
  deal_liked: Heart,
  deal_saved: Tag,
  deal_shared: Share2,
} as const;

const ACTIVITY_COLORS = {
  friend_added: 'text-blue-500 bg-blue-50',
  deal_liked: 'text-red-500 bg-red-50',
  deal_saved: 'text-green-500 bg-green-50',
  deal_shared: 'text-purple-500 bg-purple-50',
} as const;

export function FriendActivityFeed() {
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['friend-activities'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_friend_activities', {
        page_limit: 20,
        page_offset: pageParam,
      });

      if (error) throw error;
      return data as FriendActivity[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const activities = data?.pages.flat() ?? [];

  const getActivityText = (activity: FriendActivity): string => {
    switch (activity.activity_type) {
      case 'friend_added':
        return `is now friends with ${activity.related_user_full_name}`;
      case 'deal_liked':
        return `liked ${activity.metadata.deal_title || 'a deal'}`;
      case 'deal_saved':
        return `saved ${activity.metadata.deal_title || 'a deal'}`;
      case 'deal_shared':
        return `shared ${activity.metadata.deal_title || 'a deal'}`;
      default:
        return 'had an activity';
    }
  };

  const handleActivityClick = (activity: FriendActivity) => {
    if (activity.activity_type === 'friend_added' && activity.related_user_id) {
      navigate(`/profile/${activity.related_user_id}`);
    } else if (activity.related_deal_id) {
      navigate(`/deals/${activity.related_deal_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Friend Activity</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Friend Activity</h2>
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Failed to load activities</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Friend Activity</h2>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center border rounded-lg bg-muted/20">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">No recent activity</h3>
          <p className="text-sm text-muted-foreground">
            When your friends are active, you'll see it here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type];
            const colorClass = ACTIVITY_COLORS[activity.activity_type];

            return (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleActivityClick(activity)}
              >
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_full_name}</span>{' '}
                    <span className="text-muted-foreground">
                      {getActivityText(activity)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {hasNextPage && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Real-Time Updates

### File: `src/hooks/useRealtimeActivities.ts`

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeActivities() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('friend_activities_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_activities',
        },
        (payload) => {
          // Invalidate activities query to refetch
          queryClient.invalidateQueries({ queryKey: ['friend-activities'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
```

### Update `FriendActivityFeed.tsx`:

```typescript
export function FriendActivityFeed() {
  // ... existing code ...
  
  // Add real-time updates
  useRealtimeActivities();
  
  // ... rest of component ...
}
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Navigate to `/friends` or dashboard
- [ ] Verify activity feed displays correctly
- [ ] Test infinite scroll (load more button)
- [ ] Click on activities → verify navigation works
- [ ] Test empty state (user with no friends)
- [ ] Test loading state (slow network)
- [ ] Test error state (disconnect network)
- [ ] Verify real-time updates (create activity in another tab)

### Test Page

Create `src/pages/TestActivityFeed.tsx`:

```typescript
import { FriendActivityFeed } from '@/components/friends/FriendActivityFeed';

export default function TestActivityFeed() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Activity Feed Test</h1>
      <FriendActivityFeed />
    </div>
  );
}
```

Add route in `Router.tsx`:

```typescript
{
  path: '/test/activity-feed',
  element: <TestActivityFeed />,
  protected: true,
  title: 'Activity Feed Test - SynC',
}
```

---

## 📱 Integration Points

### Dashboard Integration

Update `src/components/Dashboard.tsx`:

```typescript
import { FriendActivityFeed } from '@/components/friends/FriendActivityFeed';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Existing content */}
      
      <div className="lg:col-span-1">
        <FriendActivityFeed />
      </div>
    </div>
  );
}
```

### Friends Page Integration

Update `src/pages/Friends.tsx`:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FriendActivityFeed } from '@/components/friends/FriendActivityFeed';

export function FriendsPage() {
  return (
    <Tabs defaultValue="friends">
      <TabsList>
        <TabsTrigger value="friends">Friends</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      
      <TabsContent value="activity">
        <FriendActivityFeed />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 🎨 UI/UX Enhancements

### Activity Grouping (Optional Enhancement)

```typescript
// Group activities by date
const groupedActivities = activities.reduce((groups, activity) => {
  const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
  if (!groups[date]) groups[date] = [];
  groups[date].push(activity);
  return groups;
}, {} as Record<string, FriendActivity[]>);

// Render with date headers
{Object.entries(groupedActivities).map(([date, dateActivities]) => (
  <div key={date}>
    <h3 className="text-sm font-medium text-muted-foreground mb-2">
      {formatRelativeDate(date)}
    </h3>
    {dateActivities.map(activity => (
      // ... activity card ...
    ))}
  </div>
))}
```

---

## ✅ Definition of Done

- [ ] `FriendActivityFeed` component created and styled
- [ ] React Query integration working
- [ ] Infinite scroll implemented
- [ ] Real-time updates via Supabase Realtime
- [ ] All activity types display correctly
- [ ] Navigation to related content works
- [ ] Empty, loading, and error states implemented
- [ ] Integrated into Dashboard and Friends page
- [ ] Test page created and verified
- [ ] Manual testing completed

---

**Next Story:** [STORY 9.6.3: Push Notifications Setup](./STORY_9.6.3_Push_Notifications.md)
