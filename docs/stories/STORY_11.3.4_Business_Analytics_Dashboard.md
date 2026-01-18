# Story 11.3.4: Business Review Analytics Dashboard

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 5 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Create a comprehensive analytics dashboard for business owners to understand their review performance. Include all metrics specified: volume trends, recommendation trends, tag analysis, category comparison, response rates, and more.

---

## Problem Statement

### Current State
- Business owners see basic review count
- No trend analysis or insights
- No comparison to category average
- No actionable data to improve

### Desired State
- Full analytics dashboard in business portal
- All 10 required metrics visualized
- Trend graphs over time
- Actionable insights highlighted

---

## Required Metrics

Per EPIC specification, the following metrics are required:

1. **Review volume over time** (graph)
2. **Recommendation trend** (improving/declining)
3. **Tag analysis** (praised/criticized aspects)
4. **Comparison to category average**
5. **Response rate metrics**
6. ~~**Sentiment analysis**~~ **→ DEFERRED TO PHASE II** (AI integration not currently planned)
7. **Peak review times**
8. **Reviewer demographics**
9. **Competitor comparison** (same category businesses in same city OR other cities)

> [!NOTE]
> **Review source tracking** has been deferred for now per user decision.

---

## User Stories

### US-11.3.4.1: Review Volume Chart
**As a** business owner  
**I want to** see review volume over time  
**So that** I understand my review trends

**Acceptance Criteria:**
- [ ] Line chart showing reviews per week/month
- [ ] Toggle between time ranges (7d, 30d, 90d, 1y)
- [ ] Shows both recommend and don't recommend
- [ ] Color-coded bars (green/red)
- [ ] Total count displayed

---

### US-11.3.4.2: Recommendation Trend
**As a** business owner  
**I want to** see if my recommendation rate is improving  
**So that** I can measure my progress

**Acceptance Criteria:**
- [ ] Current recommendation percentage (large number)
- [ ] Arrow indicator (↑ improving / ↓ declining)
- [ ] Percentage change from previous period
- [ ] Trend line over time
- [ ] Goal setting (optional future)

---

### US-11.3.4.3: Tag Analysis
**As a** business owner  
**I want to** see which aspects are praised or criticized  
**So that** I can focus on improvements

**Acceptance Criteria:**
- [ ] Top 5 positive tags with counts
- [ ] Top 5 negative tags with counts
- [ ] Visual bars for each tag
- [ ] Trend indicators (more/less than before)
- [ ] Click to see reviews with that tag

---

### US-11.3.4.4: Category Comparison
**As a** business owner  
**I want to** compare my reviews to category average  
**So that** I know where I stand

**Acceptance Criteria:**
- [ ] Show category average recommendation rate
- [ ] Show my rate vs average (above/below)
- [ ] Visual gauge or bar chart
- [ ] Category average response time
- [ ] Percentile ranking ("Top 20% in category")

---

### US-11.3.4.5: Response Rate Metrics
**As a** business owner  
**I want to** track my response performance  
**So that** I can improve engagement

**Acceptance Criteria:**
- [ ] Percentage of reviews responded to
- [ ] Average response time
- [ ] Trend over time
- [ ] Badge eligibility status
- [ ] Unreplied reviews highlighted

---

### US-11.3.4.6: Peak Review Times
**As a** business owner  
**I want to** know when reviews are posted  
**So that** I can respond promptly

**Acceptance Criteria:**
- [ ] Heatmap of reviews by day/hour
- [ ] Highlight peak times
- [ ] Best time to check for new reviews
- [ ] Weekly summary pattern

---

### US-11.3.4.7: Reviewer Demographics
**As a** business owner  
**I want to** understand who reviews my business  
**So that** I can tailor my service

**Acceptance Criteria:**
- [ ] New vs returning reviewers
- [ ] Average reviews per reviewer
- [ ] Breakdown by check-in history
- [ ] Privacy-compliant aggregation

---

### US-11.3.4.8: Competitor Comparison
**As a** business owner  
**I want to** compare my review performance to competitors  
**So that** I understand my standing in the market

**Acceptance Criteria:**
- [ ] Compare with same-category businesses in same city
- [ ] Compare with same-category businesses in other cities
- [ ] Show percentile ranking ("Better than X% of [category] in [city]")
- [ ] Display average metrics for comparison:
  - Recommendation rate
  - Response rate
  - Average response time
- [ ] Toggle between "My City" and "All Cities" comparison
- [ ] Minimum 5 businesses in category required for comparison
- [ ] Privacy: Only aggregated data, no individual business names shown

---

## Technical Requirements

### Database Views and Functions

**File:** `supabase/migrations/YYYYMMDD_review_analytics.sql`

```sql
-- ============================================
-- MIGRATION: Business Review Analytics
-- Story: 11.3.4
-- ============================================

-- Daily review aggregates
CREATE MATERIALIZED VIEW mv_daily_review_stats AS
SELECT 
  business_id,
  DATE(created_at) AS review_date,
  COUNT(*) AS review_count,
  SUM(CASE WHEN recommendation THEN 1 ELSE 0 END) AS recommend_count,
  SUM(CASE WHEN NOT recommendation THEN 1 ELSE 0 END) AS not_recommend_count,
  AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100 AS recommendation_rate
FROM business_reviews
WHERE deleted_at IS NULL
GROUP BY business_id, DATE(created_at);

CREATE UNIQUE INDEX idx_daily_stats ON mv_daily_review_stats(business_id, review_date);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_review_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_review_stats;
END;
$$ LANGUAGE plpgsql;

-- Category averages
CREATE OR REPLACE FUNCTION get_category_averages(p_category TEXT)
RETURNS TABLE (
  avg_recommendation_rate NUMERIC,
  avg_response_rate NUMERIC,
  avg_response_time_hours NUMERIC,
  total_businesses INTEGER,
  total_reviews INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(br_stats.recommendation_rate) AS avg_recommendation_rate,
    AVG(br_stats.response_rate) AS avg_response_rate,
    AVG(br_stats.avg_response_hours) AS avg_response_time_hours,
    COUNT(DISTINCT b.id)::INTEGER AS total_businesses,
    SUM(br_stats.review_count)::INTEGER AS total_reviews
  FROM businesses b
  JOIN LATERAL (
    SELECT 
      COUNT(*) AS review_count,
      AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100 AS recommendation_rate,
      AVG(CASE WHEN brr.id IS NOT NULL THEN 1 ELSE 0 END) * 100 AS response_rate,
      AVG(EXTRACT(EPOCH FROM (brr.created_at - br.created_at)) / 3600) AS avg_response_hours
    FROM business_reviews br
    LEFT JOIN business_review_responses brr ON brr.review_id = br.id
    WHERE br.business_id = b.id AND br.deleted_at IS NULL
  ) br_stats ON true
  WHERE b.category = p_category;
END;
$$ LANGUAGE plpgsql;

-- Tag analysis for a business
CREATE OR REPLACE FUNCTION get_business_tag_analysis(
  p_business_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  tag TEXT,
  count INTEGER,
  is_positive BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(tags) AS tag,
    COUNT(*)::INTEGER AS count,
    -- Determine if tag is positive based on recommendation correlation
    AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) > 0.5 AS is_positive
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
    AND tags IS NOT NULL
  GROUP BY unnest(tags)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Peak review times heatmap data
CREATE OR REPLACE FUNCTION get_review_time_heatmap(p_business_id UUID)
RETURNS TABLE (
  day_of_week INTEGER, -- 0=Sunday
  hour_of_day INTEGER,
  review_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DOW FROM created_at)::INTEGER AS day_of_week,
    EXTRACT(HOUR FROM created_at)::INTEGER AS hour_of_day,
    COUNT(*)::INTEGER AS review_count
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at > NOW() - INTERVAL '1 year'
  GROUP BY EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at);
END;
$$ LANGUAGE plpgsql;

-- Business review analytics aggregate
CREATE OR REPLACE FUNCTION get_business_review_analytics(
  p_business_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_rate NUMERIC;
  previous_rate NUMERIC;
  response_data RECORD;
BEGIN
  -- Current recommendation rate
  SELECT AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100
  INTO current_rate
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
  
  -- Previous period rate
  SELECT AVG(CASE WHEN recommendation THEN 1 ELSE 0 END) * 100
  INTO previous_rate
  FROM business_reviews
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
    AND created_at BETWEEN 
      NOW() - (p_days * 2 || ' days')::INTERVAL 
      AND NOW() - (p_days || ' days')::INTERVAL;
  
  -- Response metrics
  SELECT 
    AVG(CASE WHEN brr.id IS NOT NULL THEN 1 ELSE 0 END) * 100 AS response_rate,
    AVG(EXTRACT(EPOCH FROM (brr.created_at - br.created_at)) / 3600) AS avg_response_hours,
    COUNT(*) FILTER (WHERE brr.id IS NULL) AS unreplied_count
  INTO response_data
  FROM business_reviews br
  LEFT JOIN business_review_responses brr ON brr.review_id = br.id
  WHERE br.business_id = p_business_id
    AND br.deleted_at IS NULL;
  
  SELECT json_build_object(
    'recommendation_rate', COALESCE(current_rate, 0),
    'previous_rate', COALESCE(previous_rate, 0),
    'trend', CASE 
      WHEN current_rate > previous_rate THEN 'improving'
      WHEN current_rate < previous_rate THEN 'declining'
      ELSE 'stable'
    END,
    'response_rate', COALESCE(response_data.response_rate, 0),
    'avg_response_hours', COALESCE(response_data.avg_response_hours, 0),
    'unreplied_count', COALESCE(response_data.unreplied_count, 0)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

### Analytics Service

**File:** `src/services/reviewAnalyticsService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface ReviewAnalytics {
  recommendationRate: number;
  previousRate: number;
  trend: 'improving' | 'declining' | 'stable';
  responseRate: number;
  avgResponseHours: number;
  unrepliedCount: number;
}

export interface TagAnalysis {
  tag: string;
  count: number;
  isPositive: boolean;
}

export interface TimeHeatmapData {
  dayOfWeek: number;
  hourOfDay: number;
  reviewCount: number;
}

export interface DailyStats {
  date: string;
  reviewCount: number;
  recommendCount: number;
  notRecommendCount: number;
  recommendationRate: number;
}

/**
 * Get overall analytics for a business
 */
export async function getBusinessReviewAnalytics(
  businessId: string,
  days = 30
): Promise<ReviewAnalytics> {
  const { data, error } = await supabase
    .rpc('get_business_review_analytics', { 
      p_business_id: businessId,
      p_days: days
    });
  
  if (error) throw error;
  
  return {
    recommendationRate: data.recommendation_rate,
    previousRate: data.previous_rate,
    trend: data.trend,
    responseRate: data.response_rate,
    avgResponseHours: data.avg_response_hours,
    unrepliedCount: data.unreplied_count
  };
}

/**
 * Get daily review stats for charts
 */
export async function getDailyReviewStats(
  businessId: string,
  days = 30
): Promise<DailyStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('mv_daily_review_stats')
    .select('*')
    .eq('business_id', businessId)
    .gte('review_date', startDate.toISOString().split('T')[0])
    .order('review_date', { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map(d => ({
    date: d.review_date,
    reviewCount: d.review_count,
    recommendCount: d.recommend_count,
    notRecommendCount: d.not_recommend_count,
    recommendationRate: d.recommendation_rate
  }));
}

/**
 * Get tag analysis
 */
export async function getTagAnalysis(
  businessId: string,
  days = 90
): Promise<{ positive: TagAnalysis[]; negative: TagAnalysis[] }> {
  const { data, error } = await supabase
    .rpc('get_business_tag_analysis', { 
      p_business_id: businessId,
      p_days: days
    });
  
  if (error) throw error;
  
  const positive = (data || [])
    .filter(t => t.is_positive)
    .slice(0, 5);
  
  const negative = (data || [])
    .filter(t => !t.is_positive)
    .slice(0, 5);
  
  return { positive, negative };
}

/**
 * Get category averages for comparison
 */
export async function getCategoryAverages(category: string) {
  const { data, error } = await supabase
    .rpc('get_category_averages', { p_category: category });
  
  if (error) throw error;
  return data;
}

/**
 * Get time heatmap data
 */
export async function getReviewTimeHeatmap(businessId: string): Promise<TimeHeatmapData[]> {
  const { data, error } = await supabase
    .rpc('get_review_time_heatmap', { p_business_id: businessId });
  
  if (error) throw error;
  
  return (data || []).map(d => ({
    dayOfWeek: d.day_of_week,
    hourOfDay: d.hour_of_day,
    reviewCount: d.review_count
  }));
}
```

---

### Dashboard Component

**File:** `src/pages/business/ReviewAnalyticsDashboard.tsx`

```tsx
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, MessageSquare, Clock, Users } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { useBusinessReviewAnalytics, useDailyReviewStats, useTagAnalysis } from '@/hooks/useReviewAnalytics';

export default function ReviewAnalyticsDashboard() {
  const { businessId } = useParams<{ businessId: string }>();
  const [timeRange, setTimeRange] = useState<7 | 30 | 90 | 365>(30);
  
  const { data: analytics, isLoading: analyticsLoading } = useBusinessReviewAnalytics(businessId!, timeRange);
  const { data: dailyStats, isLoading: statsLoading } = useDailyReviewStats(businessId!, timeRange);
  const { data: tagData } = useTagAnalysis(businessId!);
  
  if (analyticsLoading || statsLoading) {
    return <DashboardSkeleton />;
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review Analytics</h1>
        <TabsList>
          <TabsTrigger value="7" onClick={() => setTimeRange(7)}>7 Days</TabsTrigger>
          <TabsTrigger value="30" onClick={() => setTimeRange(30)}>30 Days</TabsTrigger>
          <TabsTrigger value="90" onClick={() => setTimeRange(90)}>90 Days</TabsTrigger>
          <TabsTrigger value="365" onClick={() => setTimeRange(365)}>1 Year</TabsTrigger>
        </TabsList>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Recommendation Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recommendation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{analytics.recommendationRate.toFixed(0)}%</span>
              <TrendIndicator trend={analytics.trend} />
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.trend === 'improving' 
                ? `+${(analytics.recommendationRate - analytics.previousRate).toFixed(1)}% from last period`
                : analytics.trend === 'declining'
                  ? `${(analytics.recommendationRate - analytics.previousRate).toFixed(1)}% from last period`
                  : 'Same as last period'}
            </p>
          </CardContent>
        </Card>
        
        {/* Response Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{analytics.responseRate.toFixed(0)}%</span>
            {analytics.unrepliedCount > 0 && (
              <p className="text-xs text-orange-600">
                {analytics.unrepliedCount} reviews need response
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Avg Response Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {analytics.avgResponseHours < 24 
                ? `${analytics.avgResponseHours.toFixed(0)}h`
                : `${(analytics.avgResponseHours / 24).toFixed(1)}d`}
            </span>
          </CardContent>
        </Card>
        
        {/* Total Reviews */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {dailyStats.reduce((sum, d) => sum + d.reviewCount, 0)}
            </span>
            <p className="text-xs text-muted-foreground">in last {timeRange} days</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Review Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="recommendCount" stackId="a" fill="#22c55e" name="Recommend" />
                <Bar dataKey="notRecommendCount" stackId="a" fill="#ef4444" name="Don't Recommend" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Recommendation Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendation Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="recommendationRate" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="% Recommend"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Tag Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>What Customers Say</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Tags */}
            <div>
              <h4 className="font-medium text-green-600 mb-3">👍 Most Praised</h4>
              <div className="space-y-2">
                {tagData.positive.map(tag => (
                  <div key={tag.tag} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{tag.tag}</span>
                        <span className="text-muted-foreground">{tag.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full mt-1">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(tag.count / tagData.positive[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Negative Tags */}
            <div>
              <h4 className="font-medium text-red-600 mb-3">👎 Needs Improvement</h4>
              <div className="space-y-2">
                {tagData.negative.map(tag => (
                  <div key={tag.tag} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{tag.tag}</span>
                        <span className="text-muted-foreground">{tag.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full mt-1">
                        <div 
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(tag.count / (tagData.negative[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') {
    return <TrendingUp className="w-5 h-5 text-green-500" />;
  }
  if (trend === 'declining') {
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  }
  return <Minus className="w-5 h-5 text-muted-foreground" />;
}
```

---

## Testing Plan

### Manual Testing Checklist
- [ ] Dashboard loads with all metrics
- [ ] Time range toggle works (7d, 30d, 90d, 1y)
- [ ] Volume chart shows stacked bars
- [ ] Trend chart shows recommendation line
- [ ] Tag analysis shows top 5 each
- [ ] Response rate calculated correctly
- [ ] Unreplied count accurate
- [ ] Mobile responsive layout

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_review_analytics.sql` | CREATE | Views and functions |
| `src/services/reviewAnalyticsService.ts` | CREATE | Analytics API |
| `src/hooks/useReviewAnalytics.ts` | CREATE | React hooks |
| `src/pages/business/ReviewAnalyticsDashboard.tsx` | CREATE | Dashboard UI |
| Router | MODIFY | Add dashboard route |

---

## Definition of Done

- [ ] All 10 required metrics implemented
- [ ] Volume and trend charts working
- [ ] Tag analysis showing praise/criticism
- [ ] Response metrics calculated
- [ ] Time range toggle working
- [ ] Mobile responsive
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
