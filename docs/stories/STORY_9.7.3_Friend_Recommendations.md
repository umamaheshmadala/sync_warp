# Story 9.7.3: Friend-Based Deal Recommendations

**Epic:** [EPIC 9.7: Friends & Deal Sharing Integration](../epics/EPIC_9.7_Friends_Deal_Sharing.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 1 day  
**MCP Usage:** 🛢 Supabase MCP (Heavy)  
**Dependencies:** Epic 9.3 (Friends Module), Epic 9.4 (Deal Services)  
**Status:** ✅ Complete  
**Completion Date:** 2025-11-27

---

## 📋 Story Description

Show a "Deals your friends liked" section on the home page, displaying deals that have been liked or saved by the user's friends in the last 7 days. This creates social proof and helps users discover deals through their network.

---

## ✅ Acceptance Criteria

### UI Components
- [ ] "Deals Your Friends Liked" section on home page
- [ ] Deal cards with friend avatars overlay
- [ ] Tooltip showing which friends liked the deal
- [ ] Sort by number of friends who liked
- [ ] Empty state when no friend-liked deals
- [ ] Loading skeleton while fetching

### Functionality
- [ ] Algorithm: friends' likes/saves from last 7 days
- [ ] Display up to 3 friend avatars per deal
- [ ] Show "+X more" if more than 3 friends liked
- [ ] Real-time updates when friends like deals
- [ ] Filter out expired deals
- [ ] Minimum 2 friends must have liked for inclusion

### Performance
- [ ] Efficient database query (< 200ms)
- [ ] Caching strategy for recommendations
- [ ] Pagination support

---

## 🎨 Component Implementation

### File: `src/components/deals/FriendLikedDealsSection.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { DealCard } from './DealCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { getDealsLikedByFriends } from '@/services/dealRecommendationService';

export function FriendLikedDealsSection() {
  const { data: deals, isLoading } = useQuery({
    queryKey: ['friend-liked-deals'],
    queryFn: getDealsLikedByFriends,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Deals Your Friends Liked</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No friend recommendations yet</h3>
        <p className="text-muted-foreground">
          When your friends like deals, you'll see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Deals Your Friends Liked</h2>
        <span className="text-sm text-muted-foreground">
          {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => (
          <div key={deal.id} className="relative">
            <DealCard deal={deal} />
            
            {/* Friend Avatars Overlay */}
            <div className="absolute top-2 right-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex -space-x-2">
                      {deal.friend_avatars?.slice(0, 3).map((avatar, index) => (
                        <Avatar
                          key={index}
                          className="h-8 w-8 border-2 border-white"
                        >
                          <AvatarImage src={avatar} />
                          <AvatarFallback>F</AvatarFallback>
                        </Avatar>
                      ))}
                      {deal.likes_by_friends > 3 && (
                        <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium border-2 border-white">
                          +{deal.likes_by_friends - 3}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">
                      Liked by {deal.friend_names?.slice(0, 3).join(', ')}
                      {deal.likes_by_friends > 3 && ` and ${deal.likes_by_friends - 3} more`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🛢 Database Implementation

### File: `supabase/migrations/20250126_friend_deal_recommendations.sql`

```sql
-- Function: Get deals liked by friends
CREATE OR REPLACE FUNCTION get_deals_liked_by_friends(
  current_user_id UUID,
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL,
  original_price DECIMAL,
  image_url TEXT,
  store_name TEXT,
  expires_at TIMESTAMPTZ,
  likes_by_friends BIGINT,
  friend_avatars TEXT[],
  friend_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.description,
    d.price,
    d.original_price,
    d.image_url,
    d.store_name,
    d.expires_at,
    COUNT(DISTINCT ul.user_id)::BIGINT as likes_by_friends,
    ARRAY_AGG(DISTINCT p.avatar_url) FILTER (WHERE p.avatar_url IS NOT NULL) as friend_avatars,
    ARRAY_AGG(DISTINCT COALESCE(p.full_name, p.username)) as friend_names
  FROM deals d
  JOIN user_likes ul ON ul.deal_id = d.id
  JOIN friendships f ON (
    (f.friend_id = ul.user_id AND f.user_id = current_user_id) OR
    (f.user_id = ul.user_id AND f.friend_id = current_user_id)
  ) AND f.status = 'active'
  JOIN profiles p ON p.id = ul.user_id
  WHERE ul.created_at > NOW() - INTERVAL '7 days'
    AND d.status = 'active'
    AND d.expires_at > NOW()
    AND ul.user_id != current_user_id  -- Exclude current user's own likes
  GROUP BY d.id, d.title, d.description, d.price, d.original_price, d.image_url, d.store_name, d.expires_at
  HAVING COUNT(DISTINCT ul.user_id) >= 2  -- At least 2 friends liked
  ORDER BY likes_by_friends DESC, d.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_deals_liked_by_friends TO authenticated;
```

---

## 🔧 Service Implementation

### File: `src/services/dealRecommendationService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface FriendLikedDeal {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price: number;
  image_url: string;
  store_name: string;
  expires_at: string;
  likes_by_friends: number;
  friend_avatars: string[];
  friend_names: string[];
}

export async function getDealsLikedByFriends(
  limit: number = 20
): Promise<FriendLikedDeal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_deals_liked_by_friends', {
    current_user_id: user.id,
    limit_count: limit,
  });

  if (error) throw error;
  return data || [];
}
```

---

## 🧪 Testing Plan

### Manual Testing
1. **View Recommendations**
   - Navigate to home page
   - Verify "Deals Your Friends Liked" section appears
   - Check deal cards display correctly

2. **Friend Avatars**
   - Hover over avatar stack
   - Verify tooltip shows friend names
   - Check "+X more" for > 3 friends

3. **Real-time Updates**
   - Have friend like a deal
   - Verify deal appears in recommendations
   - Check sorting by friend count

4. **Empty State**
   - Test with no friend-liked deals
   - Verify empty state message

### Performance Testing
- [ ] Query execution time < 200ms
- [ ] Test with 100+ friends
- [ ] Test with 1000+ deals
- [ ] Verify pagination works

---

## 🎯 MCP Integration

### Supabase MCP Usage

```typescript
// Deploy function using Supabase MCP
mcp4_execute_sql({
  project_id: "ysxmgbblljoyebvugrfo",
  query: `<SQL from migration file>`
});
```

---

## ✅ Definition of Done

- [ ] Component implemented and styled
- [ ] Database function created and tested
- [ ] Service layer implemented
- [ ] Real-time updates working
- [ ] Performance benchmarks met
- [ ] Empty state handled
- [ ] Manual testing completed
- [ ] Responsive design verified

---

**Next Story:** [Story 9.7.4: Friend Leaderboard](./STORY_9.7.4_Friend_Leaderboard.md)
