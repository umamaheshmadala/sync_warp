# Story 4B.3: Analytics Expansion - DETAILED SPECIFICATION

**Epic:** 4B - Business Owner Platform Extensions  
**Priority:** 🟡 MEDIUM (Enhancement)  
**Effort:** 3 days  
**Dependencies:** Story 4.4 (Analytics Base)

---

## 🎯 Mermaid Nodes Covered (4/4)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `n89` | Offer Clicks Stats | Track offer click-through rates | ✅ Specified |
| `n90` | Storefront Visit Stats | Track storefront page views | ✅ Specified |
| `n91` | Follower Stats | Track follower growth & demographics | ✅ Specified |
| `n92` | Likes & Shares Stats | Track social engagement metrics | ✅ Specified |

**Coverage:** 4/4 nodes (100%)

---

## 💡 User Story

**As a** business owner  
**I want to** see detailed analytics on customer engagement  
**So that** I can measure marketing effectiveness and optimize strategies

---

## 📊 Analytics Dashboard Expansion

### Additional Metrics Cards

```
┌────────────────────────────────────────┐
│  📈 Offer Performance                  │
├────────────────────────────────────────┤
│  Total Clicks: 1,234                   │
│  Click-through Rate: 8.5%              │
│  Top Offer: "50% Off Lunch"  (456)     │
│  Conversion Rate: 12.3%                │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  👁️ Storefront Traffic                 │
├────────────────────────────────────────┤
│  Page Views (7d): 3,456                │
│  Unique Visitors: 2,890                │
│  Avg Session Duration: 2m 34s          │
│  Bounce Rate: 45%                      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  👥 Follower Growth                    │
├────────────────────────────────────────┤
│  Total Followers: 567                  │
│  New This Week: +23                    │
│  Growth Rate: +4.2%                    │
│  Top Demographics: 18-34 (65%)         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  ❤️ Social Engagement                  │
├────────────────────────────────────────┤
│  Likes (7d): 189                       │
│  Shares (7d): 45                       │
│  Engagement Rate: 6.8%                 │
│  Most Liked: "New Menu Launch" (78)    │
└────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

```sql
-- Offer click tracking
CREATE TABLE offer_click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID REFERENCES profiles(id), -- NULL if anonymous
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT, -- 'search', 'storefront', 'trending', 'notification'
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  converted BOOLEAN DEFAULT false, -- Did they collect the coupon?
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_offer_clicks_offer ON offer_click_events(offer_id, clicked_at);
CREATE INDEX idx_offer_clicks_business ON offer_click_events(business_id, clicked_at);

-- Storefront page view tracking
CREATE TABLE storefront_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID REFERENCES profiles(id), -- NULL if anonymous
  session_id TEXT NOT NULL, -- Client-generated session ID
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER, -- How long they stayed
  source TEXT, -- 'search', 'direct', 'social', 'ad'
  device_type TEXT
);

CREATE INDEX idx_storefront_visits_business ON storefront_visits(business_id, visited_at);

-- Follower events
CREATE TABLE follow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('follow', 'unfollow')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_events_business ON follow_events(business_id, created_at);

-- Like & share events
CREATE TABLE engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('offer', 'business', 'post')),
  entity_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('like', 'unlike', 'share')),
  share_platform TEXT, -- 'whatsapp', 'facebook', 'twitter', NULL for likes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_engagement_events_entity ON engagement_events(entity_id, event_type);
CREATE INDEX idx_engagement_events_business ON engagement_events(business_id, created_at);
```

---

## 📡 Event Tracking

### 1. Offer Click Event
```typescript
async function trackOfferClick(data: {
  offerId: string;
  businessId: string;
  userId?: string;
  source: 'search' | 'storefront' | 'trending' | 'notification';
}) {
  await supabase
    .from('offer_click_events')
    .insert({
      offer_id: data.offerId,
      business_id: data.businessId,
      user_id: data.userId,
      source: data.source,
      device_type: getDeviceType(),
      clicked_at: new Date().toISOString()
    });
}
```

### 2. Storefront Visit Tracking
```typescript
async function trackStorefrontVisit(businessId: string, userId?: string) {
  const sessionId = getOrCreateSessionId();
  
  // Track entry
  const visitId = await supabase
    .from('storefront_visits')
    .insert({
      business_id: businessId,
      user_id: userId,
      session_id: sessionId,
      visited_at: new Date().toISOString(),
      device_type: getDeviceType()
    })
    .select('id')
    .single();
  
  // Track duration on exit
  window.addEventListener('beforeunload', async () => {
    const duration = Math.floor((Date.now() - visitStartTime) / 1000);
    await supabase
      .from('storefront_visits')
      .update({ duration_seconds: duration })
      .eq('id', visitId.data.id);
  });
}
```

### 3. Follower Tracking
```typescript
async function toggleFollow(businessId: string, userId: string, action: 'follow' | 'unfollow') {
  // Update followers table
  if (action === 'follow') {
    await supabase
      .from('followers')
      .insert({ business_id: businessId, user_id: userId });
  } else {
    await supabase
      .from('followers')
      .delete()
      .match({ business_id: businessId, user_id: userId });
  }
  
  // Log event for analytics
  await supabase
    .from('follow_events')
    .insert({
      business_id: businessId,
      user_id: userId,
      action: action,
      created_at: new Date().toISOString()
    });
}
```

### 4. Like & Share Tracking
```typescript
async function trackEngagement(data: {
  entityType: 'offer' | 'business' | 'post';
  entityId: string;
  businessId: string;
  userId: string;
  eventType: 'like' | 'unlike' | 'share';
  sharePlatform?: string;
}) {
  await supabase
    .from('engagement_events')
    .insert({
      entity_type: data.entityType,
      entity_id: data.entityId,
      business_id: data.businessId,
      user_id: data.userId,
      event_type: data.eventType,
      share_platform: data.sharePlatform,
      created_at: new Date().toISOString()
    });
}
```

---

## 📊 Analytics Queries

### 1. Offer Click Stats (n89)
```sql
-- Get offer click metrics for last 7 days
SELECT 
  o.id,
  o.title,
  COUNT(DISTINCT oce.id) as total_clicks,
  COUNT(DISTINCT oce.user_id) as unique_users,
  COUNT(DISTINCT CASE WHEN oce.converted THEN oce.id END) as conversions,
  ROUND(
    COUNT(DISTINCT CASE WHEN oce.converted THEN oce.id END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT oce.id), 0) * 100, 
    2
  ) as conversion_rate
FROM offers o
LEFT JOIN offer_click_events oce ON o.id = oce.offer_id
  AND oce.clicked_at >= NOW() - INTERVAL '7 days'
WHERE o.business_id = $1
  AND o.status = 'active'
GROUP BY o.id, o.title
ORDER BY total_clicks DESC
LIMIT 10;
```

### 2. Storefront Visit Stats (n90)
```sql
-- Get storefront traffic metrics
SELECT 
  COUNT(*) as total_visits,
  COUNT(DISTINCT user_id) as unique_visitors,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(duration_seconds) as avg_duration,
  COUNT(CASE WHEN duration_seconds < 30 THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100 as bounce_rate
FROM storefront_visits
WHERE business_id = $1
  AND visited_at >= NOW() - INTERVAL '7 days';
```

### 3. Follower Stats (n91)
```sql
-- Get follower growth metrics
WITH follower_stats AS (
  SELECT 
    COUNT(*) as total_followers,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '14 days' 
               AND created_at < NOW() - INTERVAL '7 days' THEN 1 END) as prev_week
  FROM followers
  WHERE business_id = $1
)
SELECT 
  total_followers,
  new_this_week,
  ROUND(
    (new_this_week - prev_week)::DECIMAL / NULLIF(prev_week, 0) * 100,
    2
  ) as growth_rate
FROM follower_stats;
```

### 4. Engagement Stats (n92)
```sql
-- Get likes & shares metrics
SELECT 
  COUNT(CASE WHEN event_type = 'like' THEN 1 END) as total_likes,
  COUNT(CASE WHEN event_type = 'share' THEN 1 END) as total_shares,
  COUNT(DISTINCT user_id) as engaged_users,
  entity_id as most_liked_entity,
  MAX(entity_type) as entity_type
FROM engagement_events
WHERE business_id = $1
  AND created_at >= NOW() - INTERVAL '7 days'
  AND event_type IN ('like', 'share')
GROUP BY entity_id
ORDER BY total_likes DESC
LIMIT 1;
```

---

## 🎨 UI Components

### OfferClicksWidget.tsx
```typescript
function OfferClicksWidget({ businessId }: Props) {
  const { data } = useSWR(`/api/analytics/offer-clicks?businessId=${businessId}`);
  
  return (
    <AnalyticsCard title="Offer Performance" icon="📈">
      <Stat label="Total Clicks" value={data.totalClicks} />
      <Stat label="Click-through Rate" value={`${data.ctr}%`} />
      <Stat label="Conversion Rate" value={`${data.conversionRate}%`} />
      
      <h4>Top Performing Offers</h4>
      <ul>
        {data.topOffers.map(offer => (
          <li key={offer.id}>
            {offer.title}: {offer.clicks} clicks ({offer.conversions} conversions)
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}
```

### StorefrontTrafficWidget.tsx
```typescript
function StorefrontTrafficWidget({ businessId }: Props) {
  const { data } = useSWR(`/api/analytics/storefront-traffic?businessId=${businessId}`);
  
  return (
    <AnalyticsCard title="Storefront Traffic" icon="👁️">
      <Stat label="Page Views (7d)" value={data.pageViews} trend={data.trend} />
      <Stat label="Unique Visitors" value={data.uniqueVisitors} />
      <Stat label="Avg Session Duration" value={formatDuration(data.avgDuration)} />
      <Stat label="Bounce Rate" value={`${data.bounceRate}%`} inverse />
    </AnalyticsCard>
  );
}
```

### FollowerGrowthWidget.tsx
```typescript
function FollowerGrowthWidget({ businessId }: Props) {
  const { data } = useSWR(`/api/analytics/followers?businessId=${businessId}`);
  
  return (
    <AnalyticsCard title="Follower Growth" icon="👥">
      <Stat label="Total Followers" value={data.total} />
      <Stat label="New This Week" value={`+${data.newThisWeek}`} trend={data.growthRate} />
      <Stat label="Growth Rate" value={`${data.growthRate}%`} />
      
      <h4>Demographics</h4>
      <DemographicsChart data={data.demographics} />
    </AnalyticsCard>
  );
}
```

### SocialEngagementWidget.tsx
```typescript
function SocialEngagementWidget({ businessId }: Props) {
  const { data } = useSWR(`/api/analytics/engagement?businessId=${businessId}`);
  
  return (
    <AnalyticsCard title="Social Engagement" icon="❤️">
      <Stat label="Likes (7d)" value={data.likes} />
      <Stat label="Shares (7d)" value={data.shares} />
      <Stat label="Engagement Rate" value={`${data.engagementRate}%`} />
      
      {data.mostLiked && (
        <div className="highlight">
          <strong>Most Liked:</strong> {data.mostLiked.title} ({data.mostLiked.likes} ❤️)
        </div>
      )}
    </AnalyticsCard>
  );
}
```

---

## ✅ Acceptance Criteria

- [x] Offer clicks tracked with source attribution
- [x] Storefront visits tracked with session duration
- [x] Follower growth metrics calculated
- [x] Likes & shares tracked by entity
- [x] All 4 analytics widgets functional
- [x] Data refreshes in real-time
- [x] Export to CSV available

---

## 🔗 Related Documentation

- [Story 4.4: Analytics Base](./STORY_4.4_ANALYTICS.md)
- [Database Schema: Analytics](../database/schema_analytics.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 4/4 nodes (100%)

---

*Last Updated: October 15, 2025*
