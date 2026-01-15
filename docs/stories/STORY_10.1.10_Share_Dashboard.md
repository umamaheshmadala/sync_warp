# Story 10.1.10: Business Owner Share Dashboard

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🔴 NOT STARTED  
**Priority:** 🟢 Low  
**Effort:** 1 day  
**Dependencies:** Story 10.1.9 (Share Analytics)

---

## 📋 Overview

Create a dashboard for business owners to view share analytics for their storefronts, products, and offers, including total shares, share methods, click-through rates, and conversions.

---

## 🎯 Acceptance Criteria

### AC-1: Dashboard Location
**Given** I am a business owner  
**When** I navigate to my business dashboard  
**Then** I see a "Shares" or "Share Analytics" tab/section

**Location:** Business Dashboard (e.g., `/dashboard/business/[id]/shares` or as a tab)

---

### AC-2: Overview Statistics Cards
**Given** I am viewing the share dashboard  
**When** the page loads  
**Then** I see overview cards showing:

| Card | Value | Description |
|------|-------|-------------|
| Total Shares | Number | All shares of storefront + products + offers |
| Unique Sharers | Number | Distinct users who shared |
| Link Clicks | Number | Total clicks on shared links |
| Click-Through Rate | Percentage | Clicks / Shares |
| Conversions | Number | Favorites + Follows from shares |
| Conversion Rate | Percentage | Conversions / Clicks |

---

### AC-3: Share Method Breakdown Chart
**Given** shares have different methods  
**When** viewing the dashboard  
**Then** I see a pie/donut chart showing:
- Chat: X shares (Y%)
- Copy Link: X shares (Y%)
- WhatsApp: X shares (Y%)
- Facebook: X shares (Y%)
- Twitter: X shares (Y%)
- Other: X shares (Y%)

---

### AC-4: Top Shared Items Table
**Given** I want to know what's being shared most  
**When** viewing the dashboard  
**Then** I see a table with:

| Item | Type | Shares | Clicks | CTR |
|------|------|--------|--------|-----|
| "Summer Sale" | Offer | 45 | 120 | 38% |
| "Organic Coffee" | Product | 32 | 89 | 36% |
| "Storefront" | Storefront | 28 | 156 | 18% |
| ... | | | | |

---

### AC-5: Daily/Weekly Shares Chart
**Given** I want to see share trends  
**When** viewing the dashboard  
**Then** I see a line/bar chart showing:
- Shares over time (last 7/30 days)
- Date selector for custom range
- Grouped by day or week

---

### AC-6: Recent Shares List
**Given** I want to see recent activity  
**When** viewing the dashboard  
**Then** I see a list of recent shares:
- User avatar and name (who shared)
- What they shared (entity name)
- Share method icon
- When (relative time)
- Click count (if any)

---

### AC-7: ShareAnalyticsDashboard Component
**Given** this needs to be a reusable component  
**When** this story is complete  
**Then** create `src/components/dashboard/ShareAnalyticsDashboard.tsx`:

```tsx
interface ShareAnalyticsDashboardProps {
  businessId: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function ShareAnalyticsDashboard({ businessId, dateRange }: Props) {
  const { analytics, isLoading } = useShareAnalytics('storefront', businessId);
  const { productAnalytics } = useAggregatedProductShares(businessId);
  const { offerAnalytics } = useAggregatedOfferShares(businessId);
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  const totalShares = 
    (analytics?.totalShares || 0) + 
    (productAnalytics?.totalShares || 0) + 
    (offerAnalytics?.totalShares || 0);
  
  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Shares"
          value={totalShares}
          icon={Share2}
          trend={+12} // percent change from last period
        />
        <StatCard
          title="Unique Sharers"
          value={analytics?.uniqueSharers || 0}
          icon={Users}
        />
        <StatCard
          title="Link Clicks"
          value={analytics?.totalClicks || 0}
          icon={MousePointer}
        />
        <StatCard
          title="Click Rate"
          value={`${analytics?.clickThroughRate?.toFixed(1) || 0}%`}
          icon={TrendingUp}
        />
        <StatCard
          title="Conversions"
          value={analytics?.totalConversions || 0}
          icon={Heart}
        />
        <StatCard
          title="Conv. Rate"
          value={`${analytics?.conversionRate?.toFixed(1) || 0}%`}
          icon={Target}
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Share Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Share Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareMethodChart data={analytics?.methodBreakdown || {}} />
          </CardContent>
        </Card>
        
        {/* Daily Shares Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Shares Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <DailySharesChart data={analytics?.dailyShares || []} />
          </CardContent>
        </Card>
      </div>
      
      {/* Top Shared Items */}
      <Card>
        <CardHeader>
          <CardTitle>Most Shared Items</CardTitle>
        </CardHeader>
        <CardContent>
          <TopSharedItemsTable businessId={businessId} />
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Shares</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentSharesList businessId={businessId} limit={10} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### AC-8: StatCard Component
**Given** stats need visual display  
**When** rendering overview cards  
**Then** use styled stat cards:

```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number; // percentage change
  description?: string;
}

function StatCard({ title, value, icon: Icon, trend, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center text-sm',
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### AC-9: Share Method Chart
**Given** method breakdown data  
**When** rendering the chart  
**Then** use a pie/donut chart:

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  chat: '#8b5cf6',      // Purple
  copy_link: '#3b82f6', // Blue
  whatsapp: '#22c55e',  // Green
  facebook: '#1d4ed8',  // Dark blue
  twitter: '#0ea5e9',   // Sky blue
  email: '#f59e0b',     // Amber
  native_share: '#6366f1' // Indigo
};

function ShareMethodChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([method, count]) => ({
    name: formatMethodName(method),
    value: count,
    color: COLORS[method] || '#94a3b8'
  }));
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function formatMethodName(method: string): string {
  const names: Record<string, string> = {
    chat: 'In-App Chat',
    copy_link: 'Copy Link',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    twitter: 'Twitter/X',
    email: 'Email',
    native_share: 'Native Share'
  };
  return names[method] || method;
}
```

---

### AC-10: Empty State
**Given** a business has no shares yet  
**When** viewing the dashboard  
**Then** show an empty state:

```tsx
function EmptySharesState() {
  return (
    <div className="text-center py-12">
      <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900">No shares yet</h3>
      <p className="text-gray-500 mt-1">
        When customers share your storefront, products, or offers, you'll see analytics here.
      </p>
      <div className="mt-4">
        <p className="text-sm text-gray-400">
          Tip: Add share buttons to your products and offers to encourage sharing!
        </p>
      </div>
    </div>
  );
}
```

---

### AC-11: Access Control
**Given** share data is sensitive  
**When** accessing the dashboard  
**Then** verify:
- User is authenticated
- User is the owner of the business
- RLS policies enforce data access

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/dashboard/ShareAnalyticsDashboard.tsx` | Main dashboard |
| `src/components/dashboard/charts/ShareMethodChart.tsx` | Pie chart |
| `src/components/dashboard/charts/DailySharesChart.tsx` | Line chart |
| `src/components/dashboard/ShareStatCard.tsx` | Stat card |
| `src/components/dashboard/TopSharedItemsTable.tsx` | Items table |
| `src/components/dashboard/RecentSharesList.tsx` | Recent activity |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add Shares tab/route |
| `src/router/Router.tsx` | Add dashboard/shares route |

---

## 🎨 UI Mockup Description

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Share Analytics                    [Last 30 days ▼]        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  152    │ │   47    │ │  423    │ │  36.1%  │ │   89    ││
│  │ Shares  │ │ Sharers │ │ Clicks  │ │  CTR    │ │ Convs   ││
│  │  ↑12%   │ │  ↑5%    │ │  ↑23%   │ │  ↓2%    │ │  ↑18%   ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────────────────┐│
│  │   Share Methods     │ │      Shares Over Time          ││
│  │   ┌─────────────┐   │ │   ▄▄                           ││
│  │   │   (Pie)     │   │ │ ▄▄██▄▄                         ││
│  │   └─────────────┘   │ │▄██████▄▄▄▄                     ││
│  │ ● Chat 45%          │ │ Mon Tue Wed Thu Fri Sat Sun    ││
│  │ ● WhatsApp 25%      │ │                                ││
│  │ ● Copy 20%          │ │                                ││
│  │ ● Other 10%         │ │                                ││
│  └─────────────────────┘ └─────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Most Shared Items                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Item               │ Type    │ Shares │ Clicks │ CTR  │ │
│  │ Summer Sale        │ Offer   │   45   │  120   │ 38%  │ │
│  │ Organic Coffee     │ Product │   32   │   89   │ 36%  │ │
│  │ Our Storefront     │ Store   │   28   │  156   │ 18%  │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Recent Shares                         [View All →]         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 👤 John Doe shared "Summer Sale" via 💬 Chat • 2h ago │ │
│  │ 👤 Jane Smith shared "Coffee Beans" via 📋 Link • 5h  │ │
│  │ 👤 Bob Wilson shared Storefront via 📱 WhatsApp • 1d  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Dashboard Display
- [ ] Dashboard loads for business owner
- [ ] Stat cards show correct numbers
- [ ] Pie chart renders with correct data
- [ ] Line chart shows daily trend
- [ ] Table shows top shared items
- [ ] Recent shares list updates

### Access Control
- [ ] Non-owners cannot access dashboard
- [ ] Unauthenticated users redirected
- [ ] Only own business data shown

### Empty States
- [ ] Empty state for no shares
- [ ] Loading skeleton shows

### Data Accuracy
- [ ] Totals match database
- [ ] Rates calculated correctly
- [ ] Date range filter works

---

## ✅ Definition of Done

- [ ] ShareAnalyticsDashboard component created
- [ ] All stat cards rendering
- [ ] Pie chart for methods
- [ ] Line chart for trends
- [ ] Top items table
- [ ] Recent activity list
- [ ] Empty state
- [ ] Access control working
- [ ] Integrated into business dashboard
- [ ] All tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- Charts library: Use Recharts (already in project) or similar
- Performance: Cache analytics data (refresh every hour or on demand)
- Export: Consider CSV export of share data
- Mobile: Ensure dashboard is responsive
- Real-time: Not required for this dashboard
- Future: Add comparison with previous period
