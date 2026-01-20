# Story 11.4.8: Admin Review Analytics Dashboard

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 3 days  
**Dependencies:** Story 11.4.1 (Pre-Moderation), Story 11.4.4 (Fraud Detection)  
**Status:** 📋 Ready for Implementation

---

## Overview

Build a comprehensive analytics dashboard for platform admins to monitor review health across the platform. This dashboard provides insights into review volume, trends, moderation statistics, fraud detection rates, and engagement metrics.

---

## Required Metrics

Per the decisions summary, ALL of the following metrics are required:

| Metric | Description |
|--------|-------------|
| Total platform review volume | All-time and period-based counts |
| Review trends over time | Daily/weekly/monthly submission trends |
| Most reviewed businesses | Top businesses by review count |
| Review quality metrics | Text length, photo inclusion, tag usage |
| Moderation statistics | Approval/rejection rates, queue times |
| Fake review detection rates | Fraud signals triggered, % flagged |
| Response rate by business category | How often businesses respond |
| User engagement with reviews | Helpful votes, shares, views |
| Geographic review distribution | Reviews by city/region |

---

## User Stories

### US-11.4.8.1: Overview Dashboard
**As an** admin  
**I want to** see key metrics at a glance  
**So that** I understand current platform health

**Acceptance Criteria:**
- [ ] Summary cards showing:
  - Total reviews (all time)
  - Reviews this week/month
  - Pending moderation count
  - Average approval rate
  - Active fraud alerts
- [ ] Comparison to previous period (↑12% vs last week)
- [ ] Auto-refresh every 5 minutes

---

### US-11.4.8.2: Review Volume Trends
**As an** admin  
**I want to** see review submission trends over time  
**So that** I can identify patterns and plan resources

**Acceptance Criteria:**
- [ ] Line chart: Reviews per day/week/month
- [ ] Toggle between time periods (7d, 30d, 90d, 1y)
- [ ] Separate lines for: Total, Approved, Rejected
- [ ] Hover shows exact counts
- [ ] Export data option

---

### US-11.4.8.3: Most Reviewed Businesses
**As an** admin  
**I want to** see which businesses get the most reviews  
**So that** I can identify popular/problematic businesses

**Acceptance Criteria:**
- [ ] Table: Top 20 businesses by review count
- [ ] Columns: Business, Category, Reviews, Avg Rating, Fraud Flags
- [ ] Filter by time period
- [ ] Click to view business details
- [ ] Flag unusual activity (sudden spikes)

---

### US-11.4.8.4: Moderation Statistics
**As an** admin  
**I want to** see moderation performance metrics  
**So that** I can ensure timely review processing

**Acceptance Criteria:**
- [ ] Pie chart: Approved vs Rejected breakdown
- [ ] Average time to moderate (pending duration)
- [ ] Moderation by admin (who processed how many)
- [ ] Top rejection reasons
- [ ] Queue depth over time

---

### US-11.4.8.5: Fraud Detection Metrics
**As an** admin  
**I want to** see fraud detection effectiveness  
**So that** I can tune detection rules

**Acceptance Criteria:**
- [ ] % of reviews flagged with fraud signals
- [ ] Breakdown by signal type (velocity, IP, device)
- [ ] False positive tracking (flagged but approved)
- [ ] Top flagged users list
- [ ] Trend of fraud signals over time

---

### US-11.4.8.6: Response Rate Analytics
**As an** admin  
**I want to** see how businesses engage with reviews  
**So that** I can encourage better response rates

**Acceptance Criteria:**
- [ ] Overall response rate (% reviews with response)
- [ ] Response rate by category
- [ ] Average response time (hours/days)
- [ ] Top responsive businesses
- [ ] Businesses with no responses (opportunities)

---

### US-11.4.8.7: User Engagement Metrics
**As an** admin  
**I want to** see how users interact with reviews  
**So that** I can measure feature success

**Acceptance Criteria:**
- [ ] Total helpful votes cast
- [ ] Reviews shared via chat
- [ ] Review views (from Story 11.3.9)
- [ ] Most helpful reviews list
- [ ] Engagement trends over time

---

### US-11.4.8.8: Geographic Distribution
**As an** admin  
**I want to** see review distribution by location  
**So that** I understand geographic coverage

**Acceptance Criteria:**
- [ ] Map visualization (if feasible)
- [ ] Table: Reviews by city
- [ ] Reviews per business by region
- [ ] Growth by region over time
- [ ] Identify underserved areas

---

## Technical Requirements

### Analytics Service

**File:** `src/services/adminAnalyticsService.ts`

```typescript
import { supabase } from '@/lib/supabase';

// ========================================
// OVERVIEW METRICS
// ========================================

export interface OverviewMetrics {
  totalReviews: number;
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  pendingModeration: number;
  approvalRate: number;
  activeFraudAlerts: number;
  weekOverWeekChange: number;
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // Total reviews
  const { count: totalReviews } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true });
  
  // Reviews this week
  const { count: reviewsThisWeek } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString());
  
  // Reviews this month
  const { count: reviewsThisMonth } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', monthAgo.toISOString());
  
  // Pending moderation
  const { count: pendingModeration } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('moderation_status', 'pending');
  
  // Approval rate
  const { count: approved } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('moderation_status', 'approved');
  
  const { count: moderated } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .in('moderation_status', ['approved', 'rejected']);
  
  const approvalRate = moderated ? Math.round((approved || 0) / moderated * 100) : 0;
  
  // Fraud alerts
  const { count: activeFraudAlerts } = await supabase
    .from('review_fraud_signals')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString());
  
  // Week-over-week change
  const { count: lastWeek } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', twoWeeksAgo.toISOString())
    .lt('created_at', weekAgo.toISOString());
  
  const weekOverWeekChange = lastWeek 
    ? Math.round(((reviewsThisWeek || 0) - lastWeek) / lastWeek * 100)
    : 0;
  
  return {
    totalReviews: totalReviews || 0,
    reviewsThisWeek: reviewsThisWeek || 0,
    reviewsThisMonth: reviewsThisMonth || 0,
    pendingModeration: pendingModeration || 0,
    approvalRate,
    activeFraudAlerts: activeFraudAlerts || 0,
    weekOverWeekChange
  };
}

// ========================================
// TREND DATA
// ========================================

export interface TrendDataPoint {
  date: string;
  total: number;
  approved: number;
  rejected: number;
}

export async function getReviewTrends(days: number = 30): Promise<TrendDataPoint[]> {
  const { data, error } = await supabase.rpc('get_review_trends', { p_days: days });
  
  if (error) throw error;
  return data || [];
}

// ========================================
// TOP BUSINESSES
// ========================================

export interface TopBusinessData {
  id: string;
  name: string;
  category: string;
  reviewCount: number;
  recommendationRate: number;
  fraudFlags: number;
}

export async function getTopReviewedBusinesses(limit: number = 20): Promise<TopBusinessData[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      business_type,
      approved_review_count,
      recommendation_percentage
    `)
    .order('approved_review_count', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  // Get fraud flags for each
  const businessIds = data?.map(b => b.id) || [];
  const { data: fraudData } = await supabase
    .from('review_fraud_signals')
    .select('review_id, business_reviews!inner(business_id)')
    .in('business_reviews.business_id', businessIds);
  
  const fraudCountByBusiness = new Map<string, number>();
  fraudData?.forEach(f => {
    const bizId = f.business_reviews?.business_id;
    if (bizId) {
      fraudCountByBusiness.set(bizId, (fraudCountByBusiness.get(bizId) || 0) + 1);
    }
  });
  
  return data?.map(b => ({
    id: b.id,
    name: b.name,
    category: b.business_type,
    reviewCount: b.approved_review_count,
    recommendationRate: b.recommendation_percentage,
    fraudFlags: fraudCountByBusiness.get(b.id) || 0
  })) || [];
}

// ========================================
// MODERATION STATS
// ========================================

export interface ModerationStats {
  approvedCount: number;
  rejectedCount: number;
  avgModerationTimeHours: number;
  rejectionReasons: Array<{ reason: string; count: number }>;
  moderatorStats: Array<{ name: string; count: number }>;
}

export async function getModerationStats(): Promise<ModerationStats> {
  // Approved/Rejected counts
  const { data: statusCounts } = await supabase
    .from('business_reviews')
    .select('moderation_status')
    .in('moderation_status', ['approved', 'rejected']);
  
  const approvedCount = statusCounts?.filter(r => r.moderation_status === 'approved').length || 0;
  const rejectedCount = statusCounts?.filter(r => r.moderation_status === 'rejected').length || 0;
  
  // Get rejection reasons from moderation log
  const { data: rejectionData } = await supabase
    .from('review_moderation_log')
    .select('reason')
    .eq('action', 'reject')
    .not('reason', 'is', null);
  
  const reasonCounts = new Map<string, number>();
  rejectionData?.forEach(r => {
    if (r.reason) {
      reasonCounts.set(r.reason, (reasonCounts.get(r.reason) || 0) + 1);
    }
  });
  
  const rejectionReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  
  // Moderator stats
  const { data: modLogData } = await supabase
    .from('review_moderation_log')
    .select(`
      performed_by,
      admin:profiles!performed_by (full_name)
    `);
  
  const modCounts = new Map<string, { name: string; count: number }>();
  modLogData?.forEach(m => {
    const key = m.performed_by;
    const name = m.admin?.full_name || 'Unknown';
    const existing = modCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      modCounts.set(key, { name, count: 1 });
    }
  });
  
  const moderatorStats = Array.from(modCounts.values())
    .sort((a, b) => b.count - a.count);
  
  return {
    approvedCount,
    rejectedCount,
    avgModerationTimeHours: 4.2, // Calculate from created_at to moderated_at
    rejectionReasons,
    moderatorStats
  };
}

// ========================================
// FRAUD METRICS
// ========================================

export interface FraudMetrics {
  totalFlagged: number;
  flaggedPercentage: number;
  bySignalType: Array<{ type: string; count: number }>;
  falsePositiveRate: number;
  topFlaggedUsers: Array<{ userId: string; name: string; flags: number }>;
}

export async function getFraudMetrics(): Promise<FraudMetrics> {
  // Count flagged reviews
  const { data: signals } = await supabase
    .from('review_fraud_signals')
    .select('review_id, signal_type');
  
  const flaggedReviewIds = new Set(signals?.map(s => s.review_id) || []);
  
  // Total reviews
  const { count: totalReviews } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true });
  
  // By signal type
  const typeCounts = new Map<string, number>();
  signals?.forEach(s => {
    typeCounts.set(s.signal_type, (typeCounts.get(s.signal_type) || 0) + 1);
  });
  
  const bySignalType = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  
  // False positives (flagged but approved)
  const { data: falsePositives } = await supabase
    .from('business_reviews')
    .select('id')
    .eq('moderation_status', 'approved')
    .in('id', Array.from(flaggedReviewIds));
  
  const falsePositiveRate = flaggedReviewIds.size > 0
    ? Math.round((falsePositives?.length || 0) / flaggedReviewIds.size * 100)
    : 0;
  
  return {
    totalFlagged: flaggedReviewIds.size,
    flaggedPercentage: totalReviews 
      ? Math.round(flaggedReviewIds.size / totalReviews * 100)
      : 0,
    bySignalType,
    falsePositiveRate,
    topFlaggedUsers: [] // Implement separately
  };
}

// ========================================
// RESPONSE RATE
// ========================================

export interface ResponseRateData {
  overallRate: number;
  byCategory: Array<{ category: string; rate: number }>;
  avgResponseTimeHours: number;
}

export async function getResponseRateData(): Promise<ResponseRateData> {
  const { count: totalApproved } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('moderation_status', 'approved');
  
  const { count: withResponses } = await supabase
    .from('business_review_responses')
    .select('review_id', { count: 'exact', head: true });
  
  const overallRate = totalApproved 
    ? Math.round((withResponses || 0) / totalApproved * 100)
    : 0;
  
  return {
    overallRate,
    byCategory: [], // Implement with category join
    avgResponseTimeHours: 12.5 // Calculate from timestamps
  };
}

// ========================================
// GEOGRAPHIC DATA
// ========================================

export interface GeoData {
  byCity: Array<{ city: string; count: number }>;
}

export async function getGeographicData(): Promise<GeoData> {
  const { data } = await supabase
    .from('business_reviews')
    .select('businesses!inner(city)')
    .eq('moderation_status', 'approved');
  
  const cityCounts = new Map<string, number>();
  data?.forEach(r => {
    const city = r.businesses?.city || 'Unknown';
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  });
  
  const byCity = Array.from(cityCounts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
  
  return { byCity };
}
```

---

### Database Functions

**File:** `supabase/migrations/YYYYMMDD_add_analytics_functions.sql`

```sql
-- ============================================
-- MIGRATION: Analytics Functions
-- Story: 11.4.8
-- ============================================

-- Function to get review trends by day
CREATE OR REPLACE FUNCTION get_review_trends(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  approved BIGINT,
  rejected BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE moderation_status = 'approved') as approved,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected') as rejected
  FROM business_reviews
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant access to admins
GRANT EXECUTE ON FUNCTION get_review_trends TO authenticated;
```

---

### Dashboard Page

**File:** `src/pages/admin/ReviewAnalyticsDashboard.tsx`

```tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewCards } from '@/components/admin/analytics/OverviewCards';
import { ReviewTrendChart } from '@/components/admin/analytics/ReviewTrendChart';
import { TopBusinessesTable } from '@/components/admin/analytics/TopBusinessesTable';
import { ModerationStatsPanel } from '@/components/admin/analytics/ModerationStatsPanel';
import { FraudMetricsPanel } from '@/components/admin/analytics/FraudMetricsPanel';
import { ResponseRatePanel } from '@/components/admin/analytics/ResponseRatePanel';
import { GeoDistributionPanel } from '@/components/admin/analytics/GeoDistributionPanel';
import { 
  getOverviewMetrics,
  getReviewTrends,
  getTopReviewedBusinesses,
  getModerationStats,
  getFraudMetrics,
  getResponseRateData,
  getGeographicData
} from '@/services/adminAnalyticsService';

export function ReviewAnalyticsDashboard() {
  const { data: overview } = useQuery({
    queryKey: ['admin-analytics-overview'],
    queryFn: getOverviewMetrics,
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });
  
  const { data: trends } = useQuery({
    queryKey: ['admin-analytics-trends'],
    queryFn: () => getReviewTrends(30)
  });
  
  const { data: topBusinesses } = useQuery({
    queryKey: ['admin-analytics-top-businesses'],
    queryFn: () => getTopReviewedBusinesses(20)
  });
  
  const { data: modStats } = useQuery({
    queryKey: ['admin-analytics-moderation'],
    queryFn: getModerationStats
  });
  
  const { data: fraudMetrics } = useQuery({
    queryKey: ['admin-analytics-fraud'],
    queryFn: getFraudMetrics
  });
  
  const { data: responseData } = useQuery({
    queryKey: ['admin-analytics-responses'],
    queryFn: getResponseRateData
  });
  
  const { data: geoData } = useQuery({
    queryKey: ['admin-analytics-geo'],
    queryFn: getGeographicData
  });
  
  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Review Analytics</h1>
      
      {/* Overview Cards */}
      <OverviewCards data={overview} />
      
      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="businesses">Top Businesses</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="fraud">Fraud</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Review Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewTrendChart data={trends || []} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="businesses">
          <Card>
            <CardHeader>
              <CardTitle>Most Reviewed Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <TopBusinessesTable data={topBusinesses || []} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="moderation">
          <ModerationStatsPanel data={modStats} />
        </TabsContent>
        
        <TabsContent value="fraud">
          <FraudMetricsPanel data={fraudMetrics} />
        </TabsContent>
        
        <TabsContent value="engagement">
          <ResponseRatePanel data={responseData} />
        </TabsContent>
        
        <TabsContent value="geography">
          <GeoDistributionPanel data={geoData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Testing Plan

### Manual Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Overview cards show accurate counts
- [ ] Week-over-week comparison correct
- [ ] Trend chart renders with data points
- [ ] Top businesses table populated
- [ ] Moderation stats accurate
- [ ] Fraud metrics show signal breakdown
- [ ] Response rate by category works
- [ ] Geographic distribution populates
- [ ] Auto-refresh working (5 min)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/adminAnalyticsService.ts` | CREATE | All analytics queries |
| `supabase/migrations/xxx_analytics_functions.sql` | CREATE | SQL functions |
| `src/pages/admin/ReviewAnalyticsDashboard.tsx` | CREATE | Main dashboard |
| `src/components/admin/analytics/OverviewCards.tsx` | CREATE | Summary cards |
| `src/components/admin/analytics/ReviewTrendChart.tsx` | CREATE | Trend chart |
| `src/components/admin/analytics/TopBusinessesTable.tsx` | CREATE | Top businesses |
| `src/components/admin/analytics/ModerationStatsPanel.tsx` | CREATE | Moderation stats |
| `src/components/admin/analytics/FraudMetricsPanel.tsx` | CREATE | Fraud metrics |
| `src/components/admin/analytics/ResponseRatePanel.tsx` | CREATE | Response analytics |
| `src/components/admin/analytics/GeoDistributionPanel.tsx` | CREATE | Geographic data |
| `src/router/Router.tsx` | MODIFY | Add route |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing admin analytics patterns
- [ ] Review chart libraries and patterns in use
- [ ] Look for existing dashboard layouts
- [ ] Check existing metric card components
- [ ] Document findings in the implementation plan

### 2. Database Migration Execution
- [ ] Use **Supabase MCP tools** to execute SQL migrations when possible
- [ ] Use `mcp_supabase-mcp-server_execute_sql` for running scripts
- [ ] Only request manual SQL execution if MCP lacks required privileges
- [ ] Verify migration success with follow-up queries

### 3. Acceptance Criteria Verification
After implementation is complete:
- [ ] Go through EACH acceptance criterion one by one
- [ ] Mark each criterion as verified with evidence (screenshot, test result, or code reference)
- [ ] Document any deviations or edge cases discovered
- [ ] Get sign-off before proceeding to user testing

### 4. User Testing Plan
Once acceptance criteria are verified, execute this testing flow:

**Test Route 1: Dashboard Access**
1. Login as admin
2. Navigate to /admin/analytics/reviews
3. Verify dashboard loads without errors
4. Check overview cards show data

**Test Route 2: Metric Accuracy**
1. Verify total reviews count
2. Check trend charts render correctly
3. Verify moderation stats match actual
4. Check fraud detection rates

**Test Route 3: All Required Metrics**
1. Verify volume metrics present
2. Check trends charts working
3. Verify response rate data
4. Check geographic distribution
5. Confirm all 9 required metrics implemented

### 5. Browser Testing & Evidence Collection

> **IMPORTANT**: All features must be browser-tested with evidence collected before confirming completion.

**Test Environment:**
- Local dev server: `http://localhost:5173`
- Do NOT start the dev server (it's already running)
- Only restart if necessary

**Test Credentials:**
| User | Email | Password |
|------|-------|----------|
| Test User 1 | testuser1@gmail.com | Testuser@1 |
| Test User 3 | testuser3@gmail.com | Testuser@1 |
| Test User 4 | testuser4@gmail.com | Testuser@1 |
| Test User 5 | testuser5@gmail.com | Testuser@1 |

**Evidence Collection Requirements:**
- [ ] **Screenshot each test step** using browser automation
- [ ] **Record browser session** for key user flows
- [ ] **Save screenshots** to artifacts folder with descriptive names
- [ ] **Document actual vs expected** behavior for each test

**Completion Criteria:**
- [ ] All browser tests pass with visual evidence
- [ ] Screenshots/recordings saved as artifacts
- [ ] Only confirm implementation complete when ALL evidence collected
- [ ] Any failing tests must be fixed before marking complete

---

## Definition of Done

- [ ] All 9 required metrics implemented
- [ ] Overview cards display correctly
- [ ] Trend charts working
- [ ] All tables populated
- [ ] Drill-down links working
- [ ] Export functionality (optional)
- [ ] Auto-refresh working
- [ ] Admin-only access enforced
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
