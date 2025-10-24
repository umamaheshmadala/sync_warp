# Quick Start Guide: Follower Targeting System

## Getting Started in 5 Minutes

This guide will help you quickly integrate the follower targeting and analytics system into your application.

## Prerequisites

- Supabase project configured
- React 18+
- TypeScript
- Tailwind CSS
- lucide-react icons

## Installation

All components are already included in the project. Simply import them from their respective locations.

## Basic Usage Examples

### 1. Add Campaign Targeting to Your Campaign Creation Form

```tsx
import { CampaignTargetingForm } from '@/components/campaign';

function CreateCampaignPage() {
  const [targeting, setTargeting] = useState(null);
  const businessId = 'your-business-id';

  return (
    <div>
      <h1>Create New Campaign</h1>
      
      <CampaignTargetingForm
        businessId={businessId}
        onTargetingChange={(newTargeting) => {
          setTargeting(newTargeting);
          console.log('Targeting updated:', newTargeting);
        }}
      />

      <button onClick={() => saveCampaign({ targeting })}>
        Create Campaign
      </button>
    </div>
  );
}
```

### 2. Display Campaign Analytics

```tsx
import { CampaignAnalyticsDashboard } from '@/components/campaign';

function CampaignDetailsPage({ campaignId, businessId }) {
  return (
    <div>
      <CampaignAnalyticsDashboard
        campaignId={campaignId}
        businessId={businessId}
      />
    </div>
  );
}
```

### 3. Show Follower Insights to Business Owners

```tsx
import { FollowerInsightsDashboard } from '@/components/business';

function BusinessDashboardPage({ businessId }) {
  return (
    <div>
      <h1>Your Follower Insights</h1>
      <FollowerInsightsDashboard businessId={businessId} />
    </div>
  );
}
```

### 4. Admin Monitoring (Admin-only)

```tsx
import { FollowerActivityMonitor, SuspiciousActivityReviewer } from '@/components/admin';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('monitor');

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('monitor')}>Activity Monitor</button>
        <button onClick={() => setActiveTab('reports')}>Review Reports</button>
      </nav>

      {activeTab === 'monitor' && <FollowerActivityMonitor />}
      {activeTab === 'reports' && <SuspiciousActivityReviewer />}
    </div>
  );
}
```

### 5. Use the Targeting Hook Directly

```tsx
import { useCampaignTargeting } from '@/hooks/useCampaignTargeting';

function CustomTargetingUI({ businessId }) {
  const {
    filters,
    reach,
    loading,
    updateFilters,
    resetFilters,
  } = useCampaignTargeting(businessId);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={filters.targetFollowers}
          onChange={(e) => updateFilters({ targetFollowers: e.target.checked })}
        />
        Target Followers Only
      </label>

      {reach && (
        <div>
          <h3>Estimated Reach: {reach.totalReach}</h3>
          {loading && <p>Calculating...</p>}
        </div>
      )}

      <button onClick={resetFilters}>Reset</button>
    </div>
  );
}
```

## Database Setup

Ensure your Supabase database has the following tables:

### 1. Create `business_followers` table

```sql
CREATE TABLE business_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(business_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_business_followers_business_id ON business_followers(business_id);
CREATE INDEX idx_business_followers_user_id ON business_followers(user_id);
CREATE INDEX idx_business_followers_is_active ON business_followers(is_active);
```

### 2. Create `campaigns` table

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  targeting_filters JSONB,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

### 3. Create `campaign_metrics` table

```sql
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  demographic TEXT,
  is_follower BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_created_at ON campaign_metrics(created_at);
```

### 4. Ensure `users` table has demographic fields

```sql
-- Add columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX idx_users_age ON users(age);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_city ON users(city);
```

## Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Business Followers RLS
ALTER TABLE business_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
ON business_followers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view their followers"
ON business_followers FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Campaigns RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their campaigns"
ON campaigns FOR ALL
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Campaign Metrics RLS
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view campaign metrics"
ON campaign_metrics FOR SELECT
USING (
  campaign_id IN (
    SELECT c.id FROM campaigns c
    JOIN businesses b ON c.business_id = b.id
    WHERE b.owner_id = auth.uid()
  )
);
```

## Common Patterns

### Pattern 1: Conditional Rendering Based on Followers

```tsx
function CampaignForm({ businessId }) {
  const [hasFollowers, setHasFollowers] = useState(false);

  useEffect(() => {
    async function checkFollowers() {
      const { count } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_active', true);
      
      setHasFollowers((count ?? 0) > 0);
    }
    checkFollowers();
  }, [businessId]);

  return (
    <div>
      {hasFollowers ? (
        <CampaignTargetingForm businessId={businessId} />
      ) : (
        <div>
          <p>You don't have any followers yet.</p>
          <p>Start by promoting your business to gain followers!</p>
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Real-time Follower Count

```tsx
function FollowerCount({ businessId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial load
    loadCount();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('follower-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_followers',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [businessId]);

  async function loadCount() {
    const { count } = await supabase
      .from('business_followers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true);
    
    setCount(count ?? 0);
  }

  return <span>{count} followers</span>;
}
```

### Pattern 3: Track Campaign Impression

```tsx
async function trackCampaignImpression(campaignId, userId, isFollower) {
  await supabase.from('campaign_metrics').insert({
    campaign_id: campaignId,
    user_id: userId,
    impressions: 1,
    is_follower: isFollower,
    demographic: `age-${getUserAgeGroup(userId)}`,
  });
}
```

### Pattern 4: Follow/Unfollow Actions

```tsx
async function followBusiness(businessId, userId) {
  // Check if already following
  const { data: existing } = await supabase
    .from('business_followers')
    .select('id, is_active')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Reactivate if previously unfollowed
    await supabase
      .from('business_followers')
      .update({ is_active: true, followed_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    // Create new follow
    await supabase.from('business_followers').insert({
      business_id: businessId,
      user_id: userId,
      is_active: true,
    });
  }
}

async function unfollowBusiness(businessId, userId) {
  await supabase
    .from('business_followers')
    .update({ is_active: false })
    .eq('business_id', businessId)
    .eq('user_id', userId);
}
```

## Testing Your Integration

### 1. Test Campaign Targeting

```tsx
// Test with different filter combinations
const testCases = [
  { targetFollowers: true },
  { targetFollowers: true, ageRange: { min: 18, max: 35 } },
  { targetFollowers: true, gender: 'male', cities: ['New York'] },
  { targetFollowers: false, ageRange: { min: 25, max: 45 } },
];

testCases.forEach(async (filters) => {
  const { reach } = useCampaignTargeting(businessId);
  updateFilters(filters);
  await calculateReach();
  console.log(`Filters:`, filters, `Reach:`, reach?.totalReach);
});
```

### 2. Verify Analytics Calculation

```tsx
// Manually verify CTR calculation
const impressions = 1000;
const clicks = 50;
const expectedCTR = (clicks / impressions) * 100; // 5%

// Load dashboard and check if displayed CTR matches
```

## Troubleshooting

**Problem: Components not rendering**
- Verify all imports are correct
- Check that `businessId` or `campaignId` props are valid UUIDs
- Ensure Supabase is properly configured

**Problem: Reach estimate is always 0**
- Add test followers to the database
- Ensure users have demographic data filled in
- Check browser console for errors

**Problem: Real-time updates not working**
- Verify Supabase Realtime is enabled
- Check RLS policies allow reading
- Ensure subscription channel name is unique

## Next Steps

1. ✅ Integrate components into your pages
2. ✅ Set up database tables and RLS
3. ✅ Test with real data
4. ✅ Customize styling to match your brand
5. ✅ Add error boundaries for production
6. ✅ Set up monitoring and logging

## Resources

- [Full Documentation](./FOLLOWER_TARGETING_SYSTEM.md)
- [Supabase Docs](https://supabase.com/docs)
- [React Hook Best Practices](https://react.dev/learn)

---

**Questions?** Check the main documentation or create an issue in the repository.
