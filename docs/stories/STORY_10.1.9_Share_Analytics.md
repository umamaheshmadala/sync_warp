# Story 10.1.9: Share Analytics & Tracking

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🔴 NOT STARTED  
**Priority:** 🟡 Medium  
**Effort:** 2 days  
**Dependencies:** Stories 10.1.1-5 (All sharing stories)

---

## 📋 Overview

Implement comprehensive analytics tracking for all sharing activities, including who shared what, how they shared it, link clicks, and conversions (favorites, follows) from shared links.

---

## 🎯 Acceptance Criteria

### AC-1: Track Share Events
**Given** a user shares any entity  
**When** the share is completed  
**Then** record in `share_events` table:
- `user_id`: Who shared
- `entity_type`: 'storefront' | 'product' | 'offer' | 'profile'
- `entity_id`: What was shared
- `share_method`: How they shared
- `recipient_user_id`: For chat shares, who received it
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`: UTM params
- `shared_url`: Full URL that was shared
- `created_at`: Timestamp

---

### AC-2: Track Share Clicks
**Given** someone visits a shared link  
**When** the link contains a `ref` parameter  
**Then** record in `share_clicks` table:
- `share_event_id`: Links to original share
- `clicked_at`: Timestamp
- `ip_hash`: Hashed IP for deduplication
- `user_agent`: Browser/device info
- `referrer`: Where they came from (if available)

**Deduplication:** Don't record same IP + share_event within 24 hours.

---

### AC-3: Track Conversions
**Given** a user takes action after clicking a shared link  
**When** they favorite, follow, or add friend  
**Then** record in `share_conversions` table:
- `share_event_id`: Links to the share
- `conversion_type`: 'favorite' | 'follow' | 'add_friend' | 'signup'
- `converted_user_id`: Who converted
- `converted_at`: Timestamp

---

### AC-4: Click Tracking Implementation
**Given** shared links contain `ref` parameter  
**When** user lands on entity page  
**Then** track the click:

```typescript
// In entity pages (BusinessProfile, ProductDetails, etc.)
useEffect(() => {
  const ref = searchParams.get('ref');
  if (ref) {
    // Track click
    unifiedShareService.trackClick(ref);
    
    // Store ref in session for conversion tracking
    sessionStorage.setItem('share_ref', ref);
    
    // Clean URL (remove ref but keep UTM for analytics)
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('ref');
    window.history.replaceState({}, '', cleanUrl.toString());
  }
}, [searchParams]);
```

---

### AC-5: Conversion Tracking Implementation
**Given** user came from a shared link (ref stored in session)  
**When** they take a tracked action  
**Then** record conversion:

```typescript
// In favorite/follow handlers
const handleFavorite = async () => {
  await toggleFavorite();
  
  // Check for share ref
  const ref = sessionStorage.getItem('share_ref');
  if (ref) {
    await unifiedShareService.trackConversion(ref, 'favorite', user.id);
    sessionStorage.removeItem('share_ref'); // Only track once
  }
};
```

---

### AC-6: Share Analytics Hook
**Given** components need share statistics  
**When** this story is complete  
**Then** create `src/hooks/useShareAnalytics.ts`:

```typescript
interface ShareAnalytics {
  totalShares: number;
  uniqueSharers: number;
  totalClicks: number;
  totalConversions: number;
  clickThroughRate: number;
  conversionRate: number;
  methodBreakdown: Record<ShareMethod, number>;
  dailyShares: { date: string; count: number }[];
  topSharers: { userId: string; count: number }[];
  recentShares: ShareEvent[];
}

interface UseShareAnalyticsReturn {
  analytics: ShareAnalytics | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useShareAnalytics(
  entityType: 'storefront' | 'product' | 'offer' | 'profile',
  entityId: string,
  dateRange?: { from: Date; to: Date }
): UseShareAnalyticsReturn {
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const stats = await unifiedShareService.getShareStats(entityType, entityId);
      setAnalytics(stats);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAnalytics();
  }, [entityType, entityId, dateRange]);
  
  return { analytics, isLoading, error, refresh: fetchAnalytics };
}
```

---

### AC-7: Database Function for Analytics
**Given** analytics queries need optimization  
**When** this story is complete  
**Then** create database function:

```sql
CREATE OR REPLACE FUNCTION get_share_analytics(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH share_data AS (
    SELECT * FROM share_events
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND created_at BETWEEN p_from_date AND p_to_date
  ),
  stats AS (
    SELECT
      COUNT(*) as total_shares,
      COUNT(DISTINCT user_id) as unique_sharers
    FROM share_data
  ),
  click_data AS (
    SELECT COUNT(*) as total_clicks
    FROM share_clicks sc
    JOIN share_data sd ON sc.share_event_id = sd.id
  ),
  conversion_data AS (
    SELECT COUNT(*) as total_conversions
    FROM share_conversions scv
    JOIN share_data sd ON scv.share_event_id = sd.id
  ),
  method_breakdown AS (
    SELECT jsonb_object_agg(share_method, cnt) as breakdown
    FROM (
      SELECT share_method, COUNT(*) as cnt
      FROM share_data
      GROUP BY share_method
    ) m
  ),
  daily_shares AS (
    SELECT jsonb_agg(
      jsonb_build_object('date', date, 'count', cnt)
      ORDER BY date
    ) as daily
    FROM (
      SELECT DATE(created_at) as date, COUNT(*) as cnt
      FROM share_data
      GROUP BY DATE(created_at)
    ) d
  )
  SELECT jsonb_build_object(
    'totalShares', s.total_shares,
    'uniqueSharers', s.unique_sharers,
    'totalClicks', cd.total_clicks,
    'totalConversions', cvd.total_conversions,
    'clickThroughRate', CASE WHEN s.total_shares > 0 THEN (cd.total_clicks::NUMERIC / s.total_shares * 100) ELSE 0 END,
    'conversionRate', CASE WHEN cd.total_clicks > 0 THEN (cvd.total_conversions::NUMERIC / cd.total_clicks * 100) ELSE 0 END,
    'methodBreakdown', mb.breakdown,
    'dailyShares', ds.daily
  ) INTO result
  FROM stats s
  CROSS JOIN click_data cd
  CROSS JOIN conversion_data cvd
  CROSS JOIN method_breakdown mb
  CROSS JOIN daily_shares ds;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### AC-8: UTM Parameter Parsing
**Given** shared links include UTM parameters  
**When** user lands on the app  
**Then** parse and store UTM data for analytics:

```typescript
// In App.tsx or analytics service
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    content: params.get('utm_content'),
    ref: params.get('ref')
  };
  
  if (utm.source === 'sync') {
    // This is a SynC share link
    analytics.track('share_link_visited', utm);
  }
}, []);
```

---

### AC-9: Share Event Aggregation Service
**Given** analytics need aggregation  
**When** this story is complete  
**Then** update `unifiedShareService.ts`:

```typescript
class UnifiedShareService {
  // ... existing methods
  
  async getShareStats(entityType: string, entityId: string): Promise<ShareAnalytics> {
    const { data, error } = await supabase
      .rpc('get_share_analytics', {
        p_entity_type: entityType,
        p_entity_id: entityId
      });
    
    if (error) throw error;
    return data;
  }
  
  async getMyShareHistory(limit = 50): Promise<ShareEvent[]> {
    const { data } = await supabase
      .from('share_events')
      .select(`
        *,
        clicks:share_clicks(count),
        conversions:share_conversions(count)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
  
  async getShareLeaderboard(entityType: string, entityId: string): Promise<SharerStats[]> {
    const { data } = await supabase
      .from('share_events')
      .select('user_id, profiles!inner(full_name, avatar_url)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    
    // Aggregate by user
    const userCounts = data?.reduce((acc, share) => {
      const userId = share.user_id;
      if (!acc[userId]) acc[userId] = { count: 0, profile: share.profiles };
      acc[userId].count++;
      return acc;
    }, {} as Record<string, { count: number; profile: any }>);
    
    return Object.entries(userCounts || {})
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count);
  }
}
```

---

### AC-10: Analytics Event Names
**Given** events need consistent naming  
**When** tracking shares  
**Then** use these event names:

| Event | Description |
|-------|-------------|
| `share_initiated` | Share modal opened |
| `share_completed` | Share action completed |
| `share_cancelled` | Share modal closed without action |
| `share_link_clicked` | Someone clicked a shared link |
| `share_conversion` | Action taken after share click |
| `share_method_selected` | Specific method chosen |

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useShareAnalytics.ts` | Analytics data hook |
| `supabase/migrations/xxx_share_analytics_function.sql` | Analytics DB function |

### Modified Files
| File | Changes |
|------|---------|
| `src/services/unifiedShareService.ts` | Add analytics methods |
| `src/components/business/BusinessProfile.tsx` | Add click tracking |
| `src/pages/ProductPage.tsx` | Add click tracking |
| `src/hooks/useFavorites.ts` | Add conversion tracking |
| `src/hooks/useBusinessFollow.ts` | Add conversion tracking |

---

## 🧪 Testing Checklist

### Share Event Tracking
- [ ] Share to chat creates event
- [ ] Share to clipboard creates event
- [ ] Social share creates event
- [ ] Native share creates event
- [ ] Correct entity_type recorded
- [ ] Correct share_method recorded

### Click Tracking
- [ ] Click recorded when visiting shared link
- [ ] IP hash used (not raw IP)
- [ ] Deduplication works (same IP within 24h)
- [ ] URL cleaned after tracking
- [ ] ref stored in session

### Conversion Tracking
- [ ] Favorite after share click tracked
- [ ] Follow after share click tracked
- [ ] Conversion linked to correct share event
- [ ] Session ref cleared after conversion

### Analytics Aggregation
- [ ] getShareStats returns correct totals
- [ ] Click-through rate calculated correctly
- [ ] Conversion rate calculated correctly
- [ ] Method breakdown accurate
- [ ] Daily shares grouped correctly

---

## ✅ Definition of Done

- [ ] Share event tracking for all methods
- [ ] Click tracking with deduplication
- [ ] Conversion tracking linked to shares
- [ ] Database analytics function created
- [ ] useShareAnalytics hook implemented
- [ ] UTM parsing working
- [ ] All analytics queries tested
- [ ] Performance acceptable
- [ ] Code reviewed and merged

---

## 📝 Notes

- Privacy: Only hash IPs, don't store raw
- GDPR: Share data should be deletable with user account
- Performance: Index heavily used columns
- Caching: Consider caching analytics for dashboard
- Real-time: Not needed for analytics (hourly refresh is fine)
- Attribution window: Consider 7-day conversion window
