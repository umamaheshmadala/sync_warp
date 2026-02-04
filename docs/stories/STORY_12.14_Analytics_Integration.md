# Story 12.14: Analytics Integration

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Done  
**Priority**: P2  
**Estimate**: 3 points  

---

## User Story

**As a** business owner  
**I want to** see analytics for my products  
**So that** I can understand which products are most popular  

---

## Scope

### In Scope
- Product view tracking
- Basic metrics in business dashboard
- View count, like count, comment count per product
- Top products by engagement

### Out of Scope
- Detailed analytics (demographics, time series)
- Export functionality
- Real-time dashboard updates

---

## Technical Specifications

### Product View Tracking

```sql
CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for anonymous
  session_id TEXT, -- For anonymous tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_views_product ON product_views(product_id);
CREATE INDEX idx_product_views_date ON product_views(product_id, created_at);

-- Dedupe views from same user/session within 1 hour
CREATE UNIQUE INDEX idx_product_views_unique 
ON product_views(product_id, COALESCE(user_id::text, session_id), date_trunc('hour', created_at));
```

### View Tracking Logic

```typescript
const trackProductView = async (productId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const sessionId = getOrCreateSessionId(); // From localStorage
  
  try {
    await supabase.from('product_views').insert({
      product_id: productId,
      user_id: user?.id || null,
      session_id: user ? null : sessionId
    });
  } catch (error) {
    // Ignore duplicate key errors (same user/hour)
    if (!error.message.includes('duplicate')) {
      console.error('View tracking failed:', error);
    }
  }
};
```

---

## UI/UX Specifications

### Dashboard Analytics Section

```
┌─────────────────────────────────────────────────────────┐
│  📊 Product Analytics                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Overview (Last 30 days)                                │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │   1,234   │  │    567    │  │    89     │           │
│  │   Views   │  │   Likes   │  │ Comments  │           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Top Products by Views                                  │
│  ─────────────────────────────────────────────────      │
│  1. Product Name A ........................ 456 views   │
│  2. Product Name B ........................ 321 views   │
│  3. Product Name C ........................ 234 views   │
│  4. Product Name D ........................ 123 views   │
│  5. Product Name E ........................  98 views   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Top Products by Engagement                             │
│  ─────────────────────────────────────────────────      │
│  1. Product Name X ......... ❤️ 45  💬 12  🔗 8        │
│  2. Product Name Y ......... ❤️ 38  💬 9   🔗 5        │
│  3. Product Name Z ......... ❤️ 32  💬 7   🔗 3        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### View Tracking
- [ ] View tracked when product modal opens
- [ ] Same user/session within 1 hour counts as 1 view
- [ ] Anonymous views tracked with session ID
- [ ] View tracking is fire-and-forget (no blocking)

### Dashboard Display
- [ ] Total views shown for last 30 days
- [ ] Total likes shown for last 30 days
- [ ] Total comments shown for last 30 days
- [ ] Top 5 products by views listed
- [ ] Top 5 products by engagement listed

### Metrics Calculation
- [ ] Views: count from product_views table
- [ ] Likes: sum of like_count from products
- [ ] Comments: sum of comment_count from products
- [ ] Engagement: likes + comments + shares

---

## Service Layer

### productAnalyticsService.ts

```typescript
export const productAnalyticsService = {
  async trackView(productId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = localStorage.getItem('analytics_session_id') || 
      (() => {
        const id = crypto.randomUUID();
        localStorage.setItem('analytics_session_id', id);
        return id;
      })();
    
    await supabase.from('product_views').insert({
      product_id: productId,
      user_id: user?.id || null,
      session_id: user ? null : sessionId
    });
  },
  
  async getOverviewMetrics(businessId: string, days = 30): Promise<OverviewMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Get view count
    const { count: viewCount } = await supabase
      .from('product_views')
      .select('id', { count: 'exact' })
      .in('product_id', businessProductIds)
      .gte('created_at', since.toISOString());
    
    // Get totals from products
    const { data: products } = await supabase
      .from('products')
      .select('like_count, comment_count, share_count')
      .eq('business_id', businessId);
    
    const totalLikes = products?.reduce((sum, p) => sum + (p.like_count || 0), 0) || 0;
    const totalComments = products?.reduce((sum, p) => sum + (p.comment_count || 0), 0) || 0;
    
    return {
      views: viewCount || 0,
      likes: totalLikes,
      comments: totalComments
    };
  },
  
  async getTopProductsByViews(businessId: string, limit = 5): Promise<TopProduct[]> {
    const { data } = await supabase.rpc('get_top_products_by_views', {
      p_business_id: businessId,
      p_limit: limit
    });
    return data || [];
  },
  
  async getTopProductsByEngagement(businessId: string, limit = 5): Promise<TopProduct[]> {
    const { data } = await supabase
      .from('products')
      .select('id, name, like_count, comment_count, share_count')
      .eq('business_id', businessId)
      .order('like_count', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
};
```

### RPC for Top Products by Views

```sql
CREATE OR REPLACE FUNCTION get_top_products_by_views(
  p_business_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  view_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COUNT(pv.id) as view_count
  FROM products p
  LEFT JOIN product_views pv ON p.id = pv.product_id
  WHERE p.business_id = p_business_id
    AND p.status = 'published'
  GROUP BY p.id, p.name
  ORDER BY view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Component Structure

```
src/components/dashboard/
├── ProductAnalytics.tsx          # Main analytics section
├── AnalyticsOverview.tsx         # Metric cards
├── TopProductsByViews.tsx        # Views ranking list
├── TopProductsByEngagement.tsx   # Engagement ranking list
└── hooks/
    └── useProductAnalytics.ts    # Data fetching
```

---

## Testing Checklist

- [ ] View tracked on modal open
- [ ] Duplicate views within 1 hour ignored
- [ ] Anonymous views tracked
- [ ] Overview metrics display correctly
- [ ] Top products by views list accurate
- [ ] Top products by engagement list accurate
- [ ] Dashboard loads without errors
- [ ] Empty state for new businesses

---

## Dependencies

- [ ] Business dashboard exists
- [ ] Story 12.13 (Database) for product counts
- [ ] Session ID management
