# Story 9.7.4: Friend Leaderboard

**Epic:** [EPIC 9.7: Friends & Deal Sharing Integration](../epics/EPIC_9.7_Friends_Deal_Sharing.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**MCP Usage:** 🎨 Shadcn MCP (Medium), 🛢 Supabase MCP (Light)  
**Dependencies:** Epic 9.3 (Friends Module)  
**Status:** 📋 Planning

---

## 📋 Story Description

Create a gamified "Top Deal Hunters Among Friends" leaderboard that ranks friends by the number of deals they've found. Include badges for milestones and time range filters.

---

## ✅ Acceptance Criteria

### UI Components
- [ ] Leaderboard card component
- [ ] Rank number, avatar, name, deal count
- [ ] Badge icons for milestones (10, 50, 100 deals)
- [ ] Time range filter buttons (Week, Month, All Time)
- [ ] Click to view friend's deals
- [ ] Loading skeleton
- [ ] Empty state

### Functionality
- [ ] Fetch leaderboard data by time range
- [ ] Sort by deal count (descending)
- [ ] Display badges based on deal count
- [ ] Navigate to friend profile on click
- [ ] Real-time updates when friends post deals

### Gamification
- [ ] 🥈 Hunter badge: 10+ deals
- [ ] 🥇 Expert badge: 50+ deals
- [ ] 🏆 Legend badge: 100+ deals

---

## 🎨 Component Implementation

### File: `src/components/friends/FriendLeaderboard.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getFriendLeaderboard } from '@/services/friendLeaderboardService';

type TimeRange = 'week' | 'month' | 'all';

interface Badge {
  emoji: string;
  title: string;
  color: string;
}

export function FriendLeaderboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const navigate = useNavigate();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['friend-leaderboard', timeRange],
    queryFn: () => getFriendLeaderboard(timeRange),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getBadge = (dealCount: number): Badge | null => {
    if (dealCount >= 100) {
      return { emoji: '🏆', title: 'Legend', color: 'text-yellow-500' };
    }
    if (dealCount >= 50) {
      return { emoji: '🥇', title: 'Expert', color: 'text-yellow-600' };
    }
    if (dealCount >= 10) {
      return { emoji: '🥈', title: 'Hunter', color: 'text-gray-400' };
    }
    return null;
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return 'text-yellow-500 font-bold';
    if (rank === 2) return 'text-gray-400 font-bold';
    if (rank === 3) return 'text-orange-600 font-bold';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5" />
            Top Deal Hunters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5" />
            Top Deal Hunters
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        
        {/* Time Range Filters */}
        <div className="flex space-x-2 mt-4">
          <Button
            size="sm"
            variant={timeRange === 'week' ? 'default' : 'outline'}
            onClick={() => setTimeRange('week')}
          >
            This Week
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'month' ? 'default' : 'outline'}
            onClick={() => setTimeRange('month')}
          >
            This Month
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'all' ? 'default' : 'outline'}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!leaderboard || leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No deal hunters yet</p>
            <p className="text-sm">Be the first to find deals!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((friend, index) => {
              const rank = index + 1;
              const badge = getBadge(friend.deal_count);
              
              return (
                <div
                  key={friend.user_id}
                  onClick={() => navigate(`/profile/${friend.user_id}`)}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  {/* Rank */}
                  <div className={`text-lg font-bold w-8 text-center ${getRankColor(rank)}`}>
                    {rank <= 3 ? (
                      <span className="text-2xl">
                        {rank === 1 && '🥇'}
                        {rank === 2 && '🥈'}
                        {rank === 3 && '🥉'}
                      </span>
                    ) : (
                      rank
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback>
                      {friend.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & Stats */}
                  <div className="flex-1">
                    <div className="font-medium">{friend.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {friend.deal_count} {friend.deal_count === 1 ? 'deal' : 'deals'} found
                    </div>
                  </div>

                  {/* Badge */}
                  {badge && (
                    <div className="text-right">
                      <div className="text-2xl">{badge.emoji}</div>
                      <div className={`text-xs font-medium ${badge.color}`}>
                        {badge.title}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 🛢 Database Implementation

### File: `supabase/migrations/20250126_friend_leaderboard.sql`

```sql
-- Function: Get friend leaderboard
CREATE OR REPLACE FUNCTION get_friend_leaderboard(
  current_user_id UUID,
  time_range TEXT DEFAULT 'month'
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  deal_count BIGINT
) AS $$
DECLARE
  time_filter TIMESTAMPTZ;
BEGIN
  -- Determine time filter
  time_filter := CASE time_range
    WHEN 'week' THEN NOW() - INTERVAL '7 days'
    WHEN 'month' THEN NOW() - INTERVAL '30 days'
    ELSE '1970-01-01'::TIMESTAMPTZ  -- All time
  END;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    COUNT(d.id)::BIGINT as deal_count
  FROM profiles p
  JOIN friendships f ON (
    (f.friend_id = p.id AND f.user_id = current_user_id) OR
    (f.user_id = p.id AND f.friend_id = current_user_id)
  ) AND f.status = 'active'
  LEFT JOIN deals d ON d.user_id = p.id 
    AND d.created_at >= time_filter
    AND d.status = 'active'
  GROUP BY p.id, p.full_name, p.username, p.avatar_url
  HAVING COUNT(d.id) > 0  -- Only include friends with deals
  ORDER BY deal_count DESC, p.full_name ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_friend_leaderboard TO authenticated;
```

---

## 🔧 Service Implementation

### File: `src/services/friendLeaderboardService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  deal_count: number;
}

export async function getFriendLeaderboard(
  timeRange: 'week' | 'month' | 'all' = 'month'
): Promise<LeaderboardEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_friend_leaderboard', {
    current_user_id: user.id,
    time_range: timeRange,
  });

  if (error) throw error;
  return data || [];
}
```

---

## 🧪 Testing Plan

### Manual Testing
1. **View Leaderboard**
   - Navigate to leaderboard
   - Verify friends ranked correctly
   - Check badges display

2. **Time Range Filters**
   - Click "This Week"
   - Click "This Month"
   - Click "All Time"
   - Verify data updates

3. **Click Friend**
   - Click on leaderboard entry
   - Verify navigates to profile

4. **Empty State**
   - Test with no deals
   - Verify empty state message

---

## 🎯 MCP Integration

### Shadcn MCP Usage

```bash
# Generate Card component
npx shadcn-ui@latest add card

# Generate Avatar component
npx shadcn-ui@latest add avatar
```

---

## ✅ Definition of Done

- [ ] Component implemented
- [ ] Database function created
- [ ] Service layer implemented
- [ ] Time range filters working
- [ ] Badges display correctly
- [ ] Navigation working
- [ ] Manual testing completed

---

**Next Story:** [Story 9.7.5: Integration with ShareDeal Component](./STORY_9.7.5_ShareDeal_Integration.md)
