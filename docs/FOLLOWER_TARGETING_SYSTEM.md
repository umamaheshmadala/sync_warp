# Follower Targeting & Analytics System

## Overview

This document describes the follower targeting and analytics system built for the Sync Warp platform. The system enables businesses to create targeted marketing campaigns based on follower demographics and provides comprehensive analytics on follower behavior and campaign performance.

## Architecture

### Database Schema

The system relies on the following Supabase tables:

1. **`business_followers`**
   - `id`: UUID (Primary Key)
   - `business_id`: UUID (Foreign Key to businesses)
   - `user_id`: UUID (Foreign Key to users)
   - `followed_at`: Timestamp
   - `is_active`: Boolean (true = following, false = unfollowed)

2. **`users`**
   - `id`: UUID (Primary Key)
   - `age`: Integer
   - `gender`: String (male, female, other)
   - `city`: String

3. **`campaigns`**
   - `id`: UUID (Primary Key)
   - `business_id`: UUID
   - `title`: String
   - `status`: String (draft, active, completed)
   - `targeting_filters`: JSONB
   - `created_at`: Timestamp

4. **`campaign_metrics`**
   - `id`: UUID (Primary Key)
   - `campaign_id`: UUID
   - `impressions`: Integer
   - `clicks`: Integer
   - `likes`: Integer
   - `shares`: Integer
   - `demographic`: String
   - `is_follower`: Boolean
   - `created_at`: Timestamp

## Components

### 1. Campaign Components (`src/components/campaign/`)

#### **FollowerSegmentSelector.tsx**
Allows businesses to select follower demographics when creating campaigns.

**Features:**
- View follower demographics (age, gender, city)
- Apply demographic filters
- Real-time reach estimation
- Visual breakdown of filtered audience

**Props:**
```typescript
interface FollowerSegmentSelectorProps {
  businessId: string;
  onFiltersChange?: (filters: any) => void;
}
```

**Usage:**
```tsx
import { FollowerSegmentSelector } from '@/components/campaign';

<FollowerSegmentSelector
  businessId={businessId}
  onFiltersChange={(filters) => console.log(filters)}
/>
```

---

#### **CampaignTargetingForm.tsx**
Complete form for defining campaign audience targeting.

**Features:**
- Toggle between follower-only and public targeting
- Advanced demographic filters
- Real-time reach estimation with breakdown
- Reset filters functionality

**Props:**
```typescript
interface CampaignTargetingFormProps {
  businessId: string;
  onTargetingChange?: (targeting: any) => void;
  className?: string;
}
```

**Usage:**
```tsx
import { CampaignTargetingForm } from '@/components/campaign';

<CampaignTargetingForm
  businessId={businessId}
  onTargetingChange={(targeting) => saveCampaignTargeting(targeting)}
/>
```

---

#### **CampaignAnalyticsDashboard.tsx**
Displays comprehensive campaign performance analytics.

**Features:**
- Key metrics (impressions, clicks, engagement, shares)
- CTR and engagement rate calculations
- Follower vs. public reach breakdown
- Top-performing demographic segment
- Daily performance chart
- CSV export functionality

**Props:**
```typescript
interface CampaignAnalyticsDashboardProps {
  campaignId: string;
  businessId: string;
}
```

**Usage:**
```tsx
import { CampaignAnalyticsDashboard } from '@/components/campaign';

<CampaignAnalyticsDashboard
  campaignId={campaignId}
  businessId={businessId}
/>
```

---

### 2. Business Components (`src/components/business/`)

#### **FollowerInsightsDashboard.tsx**
Provides detailed analytics about follower demographics and behavior.

**Features:**
- Total followers, new followers, unfollowers
- Growth rate calculation
- Demographic breakdowns (age, gender, city)
- Engagement metrics
- 30-day retention rate
- Time range filters (7d, 30d, 90d)

**Props:**
```typescript
interface FollowerInsightsDashboardProps {
  businessId: string;
}
```

**Usage:**
```tsx
import { FollowerInsightsDashboard } from '@/components/business';

<FollowerInsightsDashboard businessId={businessId} />
```

---

### 3. Admin Components (`src/components/admin/`)

#### **SuspiciousActivityReviewer.tsx**
Admin panel for reviewing and acting on reported suspicious follower activity.

**Features:**
- Filter reports by status
- Search by business, user, or report type
- View detailed report information
- Take action (warn, suspend, ban user, or dismiss)
- Add admin notes

**Usage:**
```tsx
import { SuspiciousActivityReviewer } from '@/components/admin';

<SuspiciousActivityReviewer />
```

---

#### **FollowerActivityMonitor.tsx**
Platform-wide follower activity monitoring with anomaly detection.

**Features:**
- Total followers, follows/unfollows today
- Net growth tracking
- Most followed businesses
- Automatic suspicious pattern detection
  - Mass following (50+ businesses by one user)
  - Unusual growth (100+ followers in 24h)
- Time range filters

**Usage:**
```tsx
import { FollowerActivityMonitor } from '@/components/admin';

<FollowerActivityMonitor />
```

---

### 4. Hooks (`src/hooks/`)

#### **useCampaignTargeting.ts**
Custom hook for managing campaign targeting logic and reach estimation.

**Features:**
- Filter state management
- Automatic reach calculation (debounced 500ms)
- Demographic breakdown
- Supports both follower and public targeting

**Interface:**
```typescript
interface TargetingFilters {
  targetFollowers: boolean;
  ageRange?: { min: number; max: number };
  gender?: 'all' | 'male' | 'female' | 'other';
  cities?: string[];
  interests?: string[];
}

interface ReachEstimate {
  totalReach: number;
  followerReach: number;
  publicReach: number;
  breakdown: {
    ageGroups: Record<string, number>;
    cities: Record<string, number>;
    genders: Record<string, number>;
  };
}
```

**Usage:**
```tsx
import { useCampaignTargeting } from '@/hooks/useCampaignTargeting';

const {
  filters,
  reach,
  loading,
  updateFilters,
  calculateReach,
  resetFilters,
} = useCampaignTargeting(businessId);

// Update filters
updateFilters({ targetFollowers: true });

// Access reach estimate
console.log(reach?.totalReach);
```

---

## Data Flow

### Campaign Creation Flow
1. Business owner accesses campaign creation form
2. `CampaignTargetingForm` renders with `useCampaignTargeting` hook
3. User toggles "Target My Followers Only"
4. If enabled, `FollowerSegmentSelector` appears
5. User applies demographic filters
6. Hook calculates reach in real-time (debounced)
7. Estimated reach displayed with demographic breakdown
8. Campaign saved with targeting filters to database

### Analytics Flow
1. Campaign runs and generates metrics
2. Metrics stored in `campaign_metrics` table
3. `CampaignAnalyticsDashboard` loads campaign and metrics data
4. Metrics aggregated and calculated:
   - CTR = (clicks / impressions) × 100
   - Engagement Rate = ((clicks + likes + shares) / impressions) × 100
5. Daily performance grouped by date
6. Top demographic segment identified by engagement rate
7. User can export data as CSV

### Follower Insights Flow
1. Business accesses `FollowerInsightsDashboard`
2. Component loads followers from `business_followers` table
3. User data joined via `user_id`
4. Metrics calculated:
   - Growth rate = ((new - unfollows) / previous) × 100
   - Retention rate = (active from 30+ days ago / total from 30+ days ago) × 100
5. Demographics aggregated into age groups, genders, cities
6. Visual charts rendered with progress bars

### Admin Monitoring Flow
1. Admin accesses `FollowerActivityMonitor`
2. Platform-wide follower data loaded
3. Anomaly detection runs:
   - Check for users with 50+ follows (potential bots)
   - Check for businesses with 100+ new followers in 24h
4. Suspicious patterns displayed with severity levels
5. Admin can click through to review specific cases

---

## Key Features

### Real-time Reach Estimation
- Debounced calculation (500ms) prevents excessive queries
- Filters applied on both follower and public audiences
- Demographic breakdown shows distribution across segments

### Demographic Targeting
- **Age Groups**: 13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
- **Gender**: Male, Female, Other, All
- **Cities**: Multi-select from follower city data

### Analytics Export
- CSV export of campaign metrics
- Includes all key performance indicators
- Compatible with Excel and Google Sheets

### Anomaly Detection
- Automated pattern recognition
- Severity levels: Low, Medium, High
- Color-coded alerts for admin review

---

## Performance Considerations

### Database Queries
- Use Supabase's built-in filtering for efficiency
- Leverage indexes on `business_id`, `user_id`, `campaign_id`
- Consider caching for frequently accessed demographic data

### Debouncing
- Filter changes debounced by 500ms
- Prevents excessive reach calculations
- Improves user experience during filter adjustment

### Data Aggregation
- Demographics calculated client-side to reduce server load
- Daily metrics grouped by date for efficient chart rendering
- Top cities limited to 5 for performance

---

## Future Enhancements

### Planned Features
1. **Interest-based Targeting**: Filter by user interests/preferences
2. **A/B Testing**: Compare performance of different targeting strategies
3. **Predictive Analytics**: ML-based reach prediction
4. **Advanced Segmentation**: Create and save custom audience segments
5. **Conversion Tracking**: Track post-click actions and ROI
6. **Real-time Notifications**: Alert businesses when campaigns reach milestones
7. **Behavioral Targeting**: Target based on user engagement patterns
8. **Lookalike Audiences**: Find similar users to top performers

### Technical Improvements
1. **Server-side Aggregation**: Move heavy calculations to database functions
2. **Caching Layer**: Redis for frequently accessed metrics
3. **Batch Processing**: Queue-based metric collection
4. **Real-time Updates**: WebSocket for live metric updates
5. **Data Warehouse**: Separate analytics database for historical data

---

## Testing

### Unit Tests
```bash
# Test targeting filters
npm test src/hooks/useCampaignTargeting.test.ts

# Test component rendering
npm test src/components/campaign/FollowerSegmentSelector.test.tsx
```

### Integration Tests
```bash
# Test campaign creation flow
npm test src/tests/integration/campaign-targeting.test.ts

# Test analytics dashboard
npm test src/tests/integration/campaign-analytics.test.ts
```

### E2E Tests
```bash
# Test full campaign creation and targeting
npm run test:e2e tests/e2e/campaign-targeting.spec.ts
```

---

## Troubleshooting

### Common Issues

**Issue: Reach estimate shows 0**
- Check if business has followers
- Verify demographic filters aren't too restrictive
- Ensure Supabase connection is active

**Issue: Analytics not loading**
- Verify campaign has metrics data
- Check campaign_id is correct
- Ensure user has permission to view campaign

**Issue: Demographic data missing**
- Users may not have filled out profile data
- Consider prompting users to complete profiles
- Use "Unknown" category for missing data

---

## Support

For questions or issues:
- GitHub Issues: [Project Repository]
- Documentation: `/docs/`
- API Reference: `/docs/API.md`

---

## Changelog

### v1.0.0 (Current)
- Initial release
- Campaign follower targeting
- Analytics dashboard
- Follower insights
- Admin monitoring tools

---

**Last Updated**: January 2025
**Author**: Development Team
**License**: Proprietary
