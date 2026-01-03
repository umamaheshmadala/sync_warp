# 🎯 STORY 9.2.2: "People You May Know" (PYMK) Recommendation Engine

**Epic:** [EPIC 9.2 - Friend Discovery & Search](../epics/EPIC_9.2_Friend_Discovery_Search.md)  
**Story ID:** 9.2.2  
**Priority:** 🔴 Critical  
**Estimate:** 4 days  
**Status:** 📋 Ready for Development  
**Dependencies:** Story 9.2.1 (Search Infrastructure)

---

## 📋 **Story Description**

As a SynC user, I want to see **intelligent friend recommendations** ("People You May Know") based on mutual friends, contact sync matches, location proximity, and shared interests, so I can easily discover and connect with relevant people.

**User Value:**  
Users discover friends they might know without actively searching, increasing network growth and engagement with minimal effort.

---

## 🎯 **Acceptance Criteria**

### Database Layer
- [ ] **AC 9.2.2.1**: `get_people_you_may_know()` function implemented with multi-factor scoring:
  - Mutual friends (50% weight)
  - Contact sync matches (25% weight)
  - Location proximity (15% weight)
  - Shared deal interests (10% weight)
- [ ] **AC 9.2.2.2**: Exclude existing friends from recommendations
- [ ] **AC 9.2.2.3**: Exclude users with pending friend requests (sent or received)
- [ ] **AC 9.2.2.4**: Exclude users who previously rejected current user's request
- [ ] **AC 9.2.2.5**: Exclude blocked users (bidirectional)
- [ ] **AC 9.2.2.6**: Generate 20 recommendations per call
- [ ] **AC 9.2.2.7**: Query performance: < 100ms
- [ ] **AC 9.2.2.8**: `dismiss_pymk_suggestion()` function to hide specific recommendations
- [ ] **AC 9.2.2.9**: Dismissed suggestions table with 90-day TTL

### Service Layer
- [ ] **AC 9.2.2.10**: `recommendationService.ts` created with:
  - `getPeopleYouMayKnow(limit)` - Get PYMK recommendations
  - `dismissSuggestion(userId)` - Hide a recommendation
  - `refreshRecommendations()` - Force refresh cache
- [ ] **AC 9.2.2.11**: TypeScript interface for `PYMKRecommendation`
- [ ] **AC 9.2.2.12**: Reason text generation ("5 mutual friends", "From contacts", etc.)

### Frontend Hooks
- [ ] **AC 9.2.2.13**: `usePYMK.ts` hook created with:
  - `usePYMK(limit)` - React Query hook
  - `useDismissSuggestion()` - Mutation hook
  - `useRefreshPYMK()` - Mutation hook
  - Auto-refresh every 24 hours
  - Optimistic updates on dismiss

### UI Components
- [ ] **AC 9.2.2.14**: `PYMKCard.tsx` component:
  - User avatar and name
  - Reason text (mutual friends, location, etc.)
  - "Add Friend" button
  - "Dismiss" button (X icon)
  - Loading/success states
- [ ] **AC 9.2.2.15**: `PYMKCarousel.tsx` (mobile):
  - Horizontal scrollable cards
  - Swipe gestures
  - Snap to card
- [ ] **AC 9.2.2.16**: `PYMKGrid.tsx` (web):
  - Responsive grid (3-4 columns)
  - Hover effects
- [ ] **AC 9.2.2.17**: `EmptyPYMKState.tsx`:
  - "No suggestions available" message
  - Encourage user to add location or sync contacts

### Testing & Metrics
- [ ] **AC 9.2.2.18**: Unit tests for recommendation scoring algorithm
- [ ] **AC 9.2.2.19**: E2E test: PYMK appears on dashboard
- [ ] **AC 9.2.2.20**: E2E test: Dismiss suggestion → removed from list
- [ ] **AC 9.2.2.21**: E2E test: Send friend request → removed from PYMK
- [ ] **AC 9.2.2.22**: Analytics tracking for:
  - PYMK impressions
  - Click-through rate
  - Friend request conversion rate
  - Dismiss rate

---

## 🛠️ **Technical Specification**

### Database Migration: `20250126_pymk_engine.sql`

```sql
-- Dismissed PYMK suggestions table
CREATE TABLE IF NOT EXISTS dismissed_pymk_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  suggested_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  CONSTRAINT unique_dismissal UNIQUE(user_id, suggested_user_id)
);

CREATE INDEX idx_dismissed_pymk_user ON dismissed_pymk_suggestions(user_id);
CREATE INDEX idx_dismissed_pymk_expires ON dismissed_pymk_suggestions(expires_at);

-- RLS policies
ALTER TABLE dismissed_pymk_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissed suggestions"
  ON dismissed_pymk_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss suggestions"
  ON dismissed_pymk_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cleanup old dismissed suggestions (scheduled job)
CREATE OR REPLACE FUNCTION cleanup_dismissed_pymk()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM dismissed_pymk_suggestions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Main PYMK recommendation function
CREATE OR REPLACE FUNCTION get_people_you_may_know(
  current_user_id UUID,
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  location TEXT,
  mutual_friends_count INT,
  from_contacts BOOLEAN,
  distance_km FLOAT,
  shared_interests_count INT,
  reason TEXT,
  score FLOAT
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_location GEOGRAPHY;
BEGIN
  -- Get current user's location
  SELECT ST_MakePoint(
    (profiles.location->>'longitude')::float,
    (profiles.location->>'latitude')::float
  )::geography
  INTO current_user_location
  FROM profiles
  WHERE id = current_user_id;

  RETURN QUERY
  WITH 
  -- Mutual friends scoring (50% weight)
  mutual_friends_score AS (
    SELECT 
      f2.friend_id as candidate_id,
      COUNT(*) as mutual_count,
      COUNT(*) * 0.5 as score
    FROM friendships f1
    JOIN friendships f2 ON f1.friend_id = f2.user_id
    WHERE f1.user_id = current_user_id 
      AND f1.is_active = true
      AND f2.is_active = true
      AND f2.friend_id != current_user_id
      -- Exclude existing friends
      AND f2.friend_id NOT IN (
        SELECT friend_id FROM friendships WHERE user_id = current_user_id AND is_active = true
      )
    GROUP BY f2.friend_id
  ),
  -- Contact sync scoring (25% weight)
  contact_sync_score AS (
    SELECT 
      cm.matched_user_id as candidate_id,
      true as from_contacts,
      0.25 as score
    FROM contact_matches cm
    WHERE cm.user_id = current_user_id
  ),
  -- Location proximity scoring (15% weight)
  location_score AS (
    SELECT 
      p.id as candidate_id,
      ST_Distance(
        current_user_location,
        ST_MakePoint(
          (p.location->>'longitude')::float,
          (p.location->>'latitude')::float
        )::geography
      ) / 1000.0 as distance,
      -- Closer = higher score
      (1.0 / (ST_Distance(
        current_user_location,
        ST_MakePoint(
          (p.location->>'longitude')::float,
          (p.location->>'latitude')::float
        )::geography
      ) / 1000.0 + 1)) * 0.15 as score
    FROM profiles p
    WHERE p.id != current_user_id
      AND current_user_location IS NOT NULL
      AND p.location->>'latitude' IS NOT NULL
      AND p.location->>'longitude' IS NOT NULL
  ),
  -- Shared interests scoring (10% weight) - based on favorite deals categories
  shared_interests_score AS (
    SELECT 
      fd2.user_id as candidate_id,
      COUNT(DISTINCT fd1.deal_id) as shared_count,
      (COUNT(DISTINCT fd1.deal_id)::float / NULLIF(COUNT(DISTINCT fd2.deal_id), 0)) * 0.1 as score
    FROM favorite_deals fd1
    JOIN favorite_deals fd2 ON fd1.deal_id = fd2.deal_id
    WHERE fd1.user_id = current_user_id
      AND fd2.user_id != current_user_id
    GROUP BY fd2.user_id
  ),
  -- Combine all scores
  all_candidates AS (
    SELECT 
      COALESCE(mf.candidate_id, cs.candidate_id, ls.candidate_id, si.candidate_id) as candidate_id,
      COALESCE(mf.mutual_count, 0) as mutual_count,
      COALESCE(cs.from_contacts, false) as from_contacts,
      ls.distance,
      COALESCE(si.shared_count, 0) as shared_count,
      (
        COALESCE(mf.score, 0) + 
        COALESCE(cs.score, 0) + 
        COALESCE(ls.score, 0) + 
        COALESCE(si.score, 0)
      ) as total_score
    FROM mutual_friends_score mf
    FULL OUTER JOIN contact_sync_score cs ON mf.candidate_id = cs.candidate_id
    FULL OUTER JOIN location_score ls ON COALESCE(mf.candidate_id, cs.candidate_id) = ls.candidate_id
    FULL OUTER JOIN shared_interests_score si ON COALESCE(mf.candidate_id, cs.candidate_id, ls.candidate_id) = si.candidate_id
    WHERE COALESCE(mf.candidate_id, cs.candidate_id, ls.candidate_id, si.candidate_id) IS NOT NULL
  )
  SELECT 
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.location->>'city' as location,
    ac.mutual_count::INT,
    ac.from_contacts,
    ac.distance,
    ac.shared_count::INT,
    -- Generate reason text
    CASE 
      WHEN ac.mutual_count > 0 THEN ac.mutual_count || ' mutual friend' || CASE WHEN ac.mutual_count > 1 THEN 's' ELSE '' END
      WHEN ac.from_contacts THEN 'From your contacts'
      WHEN ac.distance IS NOT NULL AND ac.distance < 10 THEN 'Lives nearby'
      WHEN ac.shared_count > 0 THEN 'Similar interests'
      ELSE 'Suggested for you'
    END as reason,
    ac.total_score
  FROM all_candidates ac
  JOIN profiles p ON p.id = ac.candidate_id
  WHERE 
    -- Exclude blocked users
    p.id NOT IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = current_user_id
      UNION
      SELECT blocker_id FROM blocked_users WHERE blocked_id = current_user_id
    )
    -- Exclude pending friend requests (both directions)
    AND p.id NOT IN (
      SELECT receiver_id FROM friend_requests 
      WHERE sender_id = current_user_id AND status = 'pending'
      UNION
      SELECT sender_id FROM friend_requests 
      WHERE receiver_id = current_user_id AND status = 'pending'
    )
    -- Exclude previously rejected requests (don't show again)
    AND p.id NOT IN (
      SELECT receiver_id FROM friend_requests 
      WHERE sender_id = current_user_id AND status = 'rejected'
    )
    -- Exclude dismissed suggestions
    AND p.id NOT IN (
      SELECT suggested_user_id FROM dismissed_pymk_suggestions
      WHERE user_id = current_user_id
        AND expires_at > NOW()
    )
    -- Only searchable profiles
    AND p.is_searchable = true
  ORDER BY ac.total_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to dismiss a PYMK suggestion
CREATE OR REPLACE FUNCTION dismiss_pymk_suggestion(
  p_user_id UUID,
  p_suggested_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dismissed_pymk_suggestions (user_id, suggested_user_id)
  VALUES (p_user_id, p_suggested_user_id)
  ON CONFLICT (user_id, suggested_user_id) 
  DO UPDATE SET 
    dismissed_at = NOW(),
    expires_at = NOW() + INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Contact matches table (referenced by PYMK function)
-- This will be created in Story 9.2.3, but we define the structure here
CREATE TABLE IF NOT EXISTS contact_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  matched_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_contact_match UNIQUE(user_id, matched_user_id)
);

CREATE INDEX idx_contact_matches_user ON contact_matches(user_id);
```

### Service Layer: `src/services/recommendationService.ts`

```typescript
/**
 * Recommendation Service - People You May Know
 * Story 9.2.2: PYMK Recommendation Engine
 */

import { supabase } from '@/integrations/supabase/client';

export interface PYMKRecommendation {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  mutual_friends_count: number;
  from_contacts: boolean;
  distance_km: number | null;
  shared_interests_count: number;
  reason: string;
  score: number;
}

/**
 * Get People You May Know recommendations
 */
export async function getPeopleYouMayKnow(
  limit: number = 20
): Promise<PYMKRecommendation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_people_you_may_know', {
    current_user_id: user.id,
    limit_count: limit,
  });

  if (error) {
    console.error('PYMK error:', error);
    throw new Error('Failed to load friend suggestions. Please try again.');
  }

  return data || [];
}

/**
 * Dismiss a PYMK suggestion (hide it for 90 days)
 */
export async function dismissPYMKSuggestion(suggestedUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.rpc('dismiss_pymk_suggestion', {
    p_user_id: user.id,
    p_suggested_user_id: suggestedUserId,
  });

  if (error) {
    console.error('Failed to dismiss suggestion:', error);
    throw new Error('Failed to dismiss suggestion');
  }
}

/**
 * Track PYMK analytics event
 */
export async function trackPYMKEvent(
  eventType: 'impression' | 'click' | 'friend_request' | 'dismiss',
  suggestedUserId: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Log to analytics (implement based on your analytics solution)
  console.log('PYMK Analytics:', { eventType, suggestedUserId, userId: user.id });
  
  // Could integrate with Supabase Edge Functions for analytics
  // await supabase.functions.invoke('track-analytics', {
  //   body: { event: `pymk_${eventType}`, userId: user.id, suggestedUserId }
  // });
}
```

### React Hook: `src/hooks/usePYMK.ts`

```typescript
/**
 * PYMK Hooks - React Query Integration
 * Story 9.2.2: People You May Know Engine
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPeopleYouMayKnow, 
  dismissPYMKSuggestion,
  trackPYMKEvent,
  type PYMKRecommendation 
} from '@/services/recommendationService';
import { useEffect } from 'react';

/**
 * Hook for PYMK recommendations with auto-refresh
 */
export function usePYMK(limit: number = 20) {
  const query = useQuery({
    queryKey: ['pymk', 'recommendations', limit],
    queryFn: () => getPeopleYouMayKnow(limit),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchInterval: 1000 * 60 * 60 * 24, // Auto-refresh every 24 hours
    retry: 2,
  });

  // Track impressions when data loads
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      query.data.forEach(recommendation => {
        trackPYMKEvent('impression', recommendation.user_id);
      });
    }
  }, [query.data]);

  return query;
}

/**
 * Hook for dismissing a PYMK suggestion
 */
export function useDismissPYMK() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestedUserId: string) => {
      trackPYMKEvent('dismiss', suggestedUserId);
      return dismissPYMKSuggestion(suggestedUserId);
    },
    onMutate: async (suggestedUserId) => {
      // Optimistically remove from list
      await queryClient.cancelQueries({ queryKey: ['pymk', 'recommendations'] });
      
      const previousData = queryClient.getQueryData<PYMKRecommendation[]>(['pymk', 'recommendations']);
      
      queryClient.setQueryData<PYMKRecommendation[]>(
        ['pymk', 'recommendations'],
        (old) => old?.filter(item => item.user_id !== suggestedUserId) || []
      );

      return { previousData };
    },
    onError: (err, suggestedUserId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['pymk', 'recommendations'], context.previousData);
      }
    },
    onSuccess: () => {
      // Refetch after successful dismiss
      queryClient.invalidateQueries({ queryKey: ['pymk', 'recommendations'] });
    },
  });
}

/**
 * Hook to manually refresh PYMK recommendations
 */
export function useRefreshPYMK() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pymk', 'recommendations'] });
      return queryClient.fetchQuery({
        queryKey: ['pymk', 'recommendations'],
        queryFn: () => getPeopleYouMayKnow(),
      });
    },
  });
}
```

### UI Components

**`src/components/pymk/PYMKCard.tsx`**

```typescript
/**
 * PYMK Card Component
 * Story 9.2.2: People You May Know Engine
 */

import React from 'react';
import { Users, X, Loader2 } from 'lucide-react';
import { PYMKRecommendation } from '@/services/recommendationService';
import { useSendFriendRequest } from '@/hooks/useFriendRequests';
import { useDismissPYMK } from '@/hooks/usePYMK';
import { useNavigate } from 'react-router-dom';
import { trackPYMKEvent } from '@/services/recommendationService';

interface PYMKCardProps {
  recommendation: PYMKRecommendation;
}

export function PYMKCard({ recommendation }: PYMKCardProps) {
  const navigate = useNavigate();
  const sendFriendRequest = useSendFriendRequest();
  const dismissSuggestion = useDismissPYMK();

  const handleAddFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackPYMKEvent('friend_request', recommendation.user_id);
    sendFriendRequest.mutate(recommendation.user_id);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissSuggestion.mutate(recommendation.user_id);
  };

  const handleCardClick = () => {
    trackPYMKEvent('click', recommendation.user_id);
    navigate(`/profile/${recommendation.user_id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-4"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={dismissSuggestion.isPending}
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full"
        title="Dismiss suggestion"
      >
        {dismissSuggestion.isPending ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-4">
        <img
          src={recommendation.avatar_url || '/default-avatar.png'}
          alt={recommendation.full_name}
          className="w-20 h-20 rounded-full object-cover mb-3"
        />
        <h3 className="font-semibold text-gray-900 text-center">
          {recommendation.full_name}
        </h3>
        <p className="text-sm text-gray-500 text-center">@{recommendation.username}</p>
      </div>

      {/* Reason */}
      <div className="flex items-center justify-center text-xs text-gray-600 mb-4">
        <Users className="w-3 h-3 mr-1" />
        {recommendation.reason}
      </div>

      {/* Add Friend button */}
      <button
        onClick={handleAddFriend}
        disabled={sendFriendRequest.isPending}
        className="w-full btn btn-primary btn-sm"
      >
        {sendFriendRequest.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          'Add Friend'
        )}
      </button>
    </div>
  );
}
```

**`src/components/pymk/PYMKCarousel.tsx`** (Mobile)

```typescript
/**
 * PYMK Carousel Component (Mobile)
 * Story 9.2.2: PYMK Engine
 */

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePYMK } from '@/hooks/usePYMK';
import { PYMKCard } from './PYMKCard';

export function PYMKCarousel() {
  const { data: recommendations, isLoading } = usePYMK(10);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return <PYMKCarouselSkeleton />;
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">People You May Know</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => scroll('left')}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recommendations.map((recommendation) => (
          <div key={recommendation.user_id} className="flex-shrink-0 w-64 snap-start">
            <PYMKCard recommendation={recommendation} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PYMKCarouselSkeleton() {
  return (
    <div>
      <div className="h-6 w-48 bg-gray-200 rounded mb-4 animate-pulse"></div>
      <div className="flex overflow-x-auto space-x-4 pb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-64 bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-3"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-8 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**`src/components/pymk/PYMKGrid.tsx`** (Web)

```typescript
/**
 * PYMK Grid Component (Web)
 * Story 9.2.2: PYMK Engine
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePYMK, useRefreshPYMK } from '@/hooks/usePYMK';
import { PYMKCard } from './PYMKCard';

export function PYMKGrid() {
  const { data: recommendations, isLoading } = usePYMK(20);
  const refreshPYMK = useRefreshPYMK();

  if (isLoading) {
    return <PYMKGridSkeleton />;
  }

  if (!recommendations || recommendations.length === 0) {
    return <EmptyPYMKState />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">People You May Know</h2>
        <button
          onClick={() => refreshPYMK.mutate()}
          disabled={refreshPYMK.isPending}
          className="flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshPYMK.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recommendations.map((recommendation) => (
          <PYMKCard key={recommendation.user_id} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
}

function PYMKGridSkeleton() {
  return (
    <div>
      <div className="h-8 w-64 bg-gray-200 rounded mb-6 animate-pulse"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-3"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-8 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyPYMKState() {
  return (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No Suggestions Available
      </h3>
      <p className="text-gray-600 mb-4">
        We'll show you friend suggestions here as you build your network
      </p>
      <div className="text-sm text-gray-500">
        Try:
        <ul className="mt-2 space-y-1">
          <li>• Adding your location to your profile</li>
          <li>• Syncing your contacts</li>
          <li>• Adding more friends</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## 🎯 **MCP Integration**

### Supabase MCP (Heavy Usage)
```bash
# Apply migration
warp mcp run supabase "apply_migration mobile-app-setup 20250126_pymk_engine ..."

# Test PYMK function
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM get_people_you_may_know(auth.uid(), 20)"

# Test with specific user to verify scoring
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM get_people_you_may_know('user-uuid-here', 20)"

# Check dismissed suggestions
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM dismissed_pymk_suggestions WHERE user_id = auth.uid()"
```

### Context7 MCP (Medium Usage)
```bash
# Analyze recommendation algorithm
warp mcp run context7 "analyze src/services/recommendationService.ts explain scoring algorithm"

# Find PYMK component usage
warp mcp run context7 "find usage of PYMKCard component"
```

### Puppeteer MCP (E2E Testing)
```bash
# Test PYMK carousel
warp mcp run puppeteer "navigate to http://localhost:5173, verify PYMK carousel appears, scroll carousel"

# Test dismiss suggestion
warp mcp run puppeteer "click dismiss button on first PYMK card, verify card removed from list"

# Test send friend request from PYMK
warp mcp run puppeteer "click Add Friend on PYMK card, verify success toast appears"
```

---

## ✅ **Definition of Done**

- [ ] All 22 acceptance criteria met
- [ ] Database migration applied successfully
- [ ] PYMK algorithm scoring verified
- [ ] Service layer implemented
- [ ] React hooks with optimistic updates
- [ ] UI components (card, carousel, grid) complete
- [ ] Analytics tracking integrated
- [ ] Unit tests written
- [ ] E2E tests pass
- [ ] Performance test: < 100ms query time
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## 📚 **Related Documentation**

- [Epic 9.2 Overview](../epics/EPIC_9.2_Friend_Discovery_Search.md)
- [Story 9.2.1 - Global Friend Search](./STORY_9.2.1_Global_Friend_Search.md)
- [Story 9.2.3 - Contact Sync](./STORY_9.2.3_Contact_Sync_Integration.md)

---

**Next Story:** [STORY 9.2.3 - Contact Sync Integration](./STORY_9.2.3_Contact_Sync_Integration.md)
