# Phase 3: React Hooks Documentation

**Targeted Campaigns System - React Hooks Layer**

This document provides comprehensive documentation for all custom React hooks built for the Targeted Campaigns system. These hooks provide a clean, React-friendly API for interacting with driver profiles, campaign targeting, and campaign management.

---

## Table of Contents

1. [Overview](#overview)
2. [Driver Hooks](#driver-hooks)
3. [Targeting Hooks](#targeting-hooks)
4. [Campaign Hooks](#campaign-hooks)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [Error Handling](#error-handling)

---

## Overview

### Architecture

The hooks layer provides:
- **Data fetching & caching** with automatic state management
- **Real-time updates** with configurable refresh intervals
- **Optimistic updates** for better UX
- **Error handling** with user-friendly messages
- **Type safety** with full TypeScript support

### Import Structure

```typescript
// Import individual hooks
import { useDriverProfile, useCampaignList } from '@/hooks';

// Import combined hook objects
import { useDrivers, useTargeting, useCampaigns } from '@/hooks';

// Import default exports
import useDrivers from '@/hooks/useDrivers';
```

---

## Driver Hooks

### `useDriverProfile`

Fetch a specific driver's profile by userId and cityId.

**Signature:**
```typescript
function useDriverProfile(userId: string, cityId?: string): {
  profile: DriverProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function DriverProfileCard({ userId, cityId }: Props) {
  const { profile, isLoading, error, refresh } = useDriverProfile(userId, cityId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!profile) return <NotFound />;

  return (
    <div>
      <h2>{profile.driver_name}</h2>
      <p>Score: {profile.driver_score}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

---

### `useMyDriverProfile`

Fetch the current authenticated user's driver profile.

**Signature:**
```typescript
function useMyDriverProfile(cityId?: string): {
  profile: DriverProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function MyDriverDashboard() {
  const { profile, isLoading } = useMyDriverProfile();
  const user = useAuth(); // Your auth hook

  if (!user) return <LoginPrompt />;
  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>Welcome, {profile?.driver_name}!</h1>
      <DriverScoreCard score={profile?.driver_score} />
    </div>
  );
}
```

---

### `useDriverList`

Fetch paginated list of drivers with filters.

**Signature:**
```typescript
function useDriverList(
  cityId?: string,
  filters?: DriverFilters,
  options?: DriverListOptions
): {
  drivers: DriverProfile[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function DriverList() {
  const {
    drivers,
    isLoading,
    hasMore,
    loadMore
  } = useDriverList('city-123', {
    minScore: 70,
    maxScore: 100,
    verificationStatus: 'verified'
  });

  return (
    <div>
      {drivers.map(driver => (
        <DriverCard key={driver.user_id} driver={driver} />
      ))}
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

### `useTopDrivers`

Get top-ranked drivers in a city.

**Signature:**
```typescript
function useTopDrivers(cityId?: string, limit?: number): {
  drivers: DriverProfile[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function TopDriversLeaderboard() {
  const { drivers, isLoading } = useTopDrivers('city-123', 10);

  return (
    <Leaderboard>
      {drivers.map((driver, index) => (
        <LeaderboardRow
          key={driver.user_id}
          rank={index + 1}
          driver={driver}
        />
      ))}
    </Leaderboard>
  );
}
```

---

### `useDriverStats`

Get aggregate driver statistics for a city.

**Signature:**
```typescript
function useDriverStats(cityId?: string): {
  stats: {
    total_drivers: number;
    verified_drivers: number;
    average_score: number;
    top_tier_count: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function CityDriverStats({ cityId }: Props) {
  const { stats, isLoading } = useDriverStats(cityId);

  if (isLoading) return <Spinner />;

  return (
    <StatsGrid>
      <StatCard label="Total Drivers" value={stats?.total_drivers} />
      <StatCard label="Verified" value={stats?.verified_drivers} />
      <StatCard label="Average Score" value={stats?.average_score} />
    </StatsGrid>
  );
}
```

---

### `useDriverConfig` (Admin Only)

Fetch and update driver algorithm configuration.

**Signature:**
```typescript
function useDriverConfig(): {
  config: DriverAlgorithmConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateConfig: (updates: Partial<DriverAlgorithmConfig>) => Promise<void>;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function AdminDriverConfig() {
  const { config, updateConfig, isSaving } = useDriverConfig();

  const handleSave = async (newWeights: any) => {
    await updateConfig({ weights: newWeights });
  };

  return (
    <AdminPanel>
      <WeightsEditor
        weights={config?.weights}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </AdminPanel>
  );
}
```

---

## Targeting Hooks

### `useAudienceEstimate`

Estimate campaign reach in real-time with debouncing.

**Signature:**
```typescript
function useAudienceEstimate(
  targetingRules: TargetingRules,
  cityId?: string,
  debounceMs?: number
): {
  estimate: AudienceEstimate | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function CampaignBuilder() {
  const [targetingRules, setTargetingRules] = useState<TargetingRules>({});
  
  const { estimate, isLoading } = useAudienceEstimate(
    targetingRules,
    'city-123',
    500 // debounce 500ms
  );

  return (
    <div>
      <TargetingEditor value={targetingRules} onChange={setTargetingRules} />
      
      <ReachEstimate
        totalReach={estimate?.total_reach}
        isLoading={isLoading}
      />
    </div>
  );
}
```

---

### `useTargetingValidation`

Validate targeting rules and get errors/warnings/suggestions.

**Signature:**
```typescript
function useTargetingValidation(targetingRules: TargetingRules): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
```

**Example:**
```tsx
function TargetingValidator({ rules }: Props) {
  const validation = useTargetingValidation(rules);

  return (
    <ValidationPanel>
      {validation.errors.map(error => (
        <ErrorMessage key={error}>{error}</ErrorMessage>
      ))}
      {validation.warnings.map(warning => (
        <WarningMessage key={warning}>{warning}</WarningMessage>
      ))}
      {validation.suggestions.map(suggestion => (
        <SuggestionChip key={suggestion}>{suggestion}</SuggestionChip>
      ))}
    </ValidationPanel>
  );
}
```

---

### `useTargetingRecommendations`

Get AI-powered targeting recommendations for a business.

**Signature:**
```typescript
function useTargetingRecommendations(businessId?: string): {
  recommendations: Partial<TargetingRules> | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function SmartTargetingSuggestion({ businessId }: Props) {
  const { recommendations, isLoading } = useTargetingRecommendations(businessId);

  const applyRecommendations = () => {
    if (recommendations) {
      setTargetingRules(prev => ({ ...prev, ...recommendations }));
    }
  };

  return (
    <SuggestionCard>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <h3>Recommended Targeting</h3>
          <pre>{JSON.stringify(recommendations, null, 2)}</pre>
          <button onClick={applyRecommendations}>Apply</button>
        </>
      )}
    </SuggestionCard>
  );
}
```

---

### `useSmartTargeting` (Combined Hook)

All-in-one targeting hook with validation, reach, effectiveness, and recommendations.

**Signature:**
```typescript
function useSmartTargeting(
  targetingRules: TargetingRules,
  cityId?: string,
  businessId?: string
): {
  // Estimate
  estimate: AudienceEstimate | null;
  isEstimating: boolean;
  estimateError: string | null;
  refreshEstimate: () => void;
  
  // Validation
  validation: ValidationResult;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  
  // Effectiveness
  effectiveness: EffectivenessResult;
  isEffective: boolean;
  
  // Recommendations
  recommendations: Partial<TargetingRules> | null;
  isLoadingRecommendations: boolean;
  
  // Optimizations
  optimizations: string[];
  allSuggestions: string[];
  
  // Overall status
  status: 'good' | 'warning' | 'ineffective' | 'invalid';
}
```

**Example:**
```tsx
function AdvancedCampaignBuilder() {
  const [targetingRules, setTargetingRules] = useState<TargetingRules>({});
  
  const targeting = useSmartTargeting(
    targetingRules,
    'city-123',
    'business-456'
  );

  return (
    <CampaignForm>
      <TargetingEditor
        value={targetingRules}
        onChange={setTargetingRules}
      />
      
      {/* Status Badge */}
      <StatusBadge status={targeting.status} />
      
      {/* Reach Estimate */}
      <ReachDisplay
        reach={targeting.estimate?.total_reach}
        loading={targeting.isEstimating}
      />
      
      {/* Validation Messages */}
      {targeting.errors.map(error => (
        <ErrorAlert key={error}>{error}</ErrorAlert>
      ))}
      
      {/* Optimization Suggestions */}
      <SuggestionsList suggestions={targeting.allSuggestions} />
      
      {/* Recommendations */}
      {targeting.recommendations && (
        <RecommendationCard
          recommendations={targeting.recommendations}
          onApply={() => setTargetingRules(prev => ({
            ...prev,
            ...targeting.recommendations
          }))}
        />
      )}
    </CampaignForm>
  );
}
```

---

## Campaign Hooks

### `useCampaign`

Fetch a single campaign by ID.

**Signature:**
```typescript
function useCampaign(campaignId?: string): {
  campaign: Campaign | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

---

### `useCampaignList`

Fetch paginated list of campaigns with filters.

**Signature:**
```typescript
function useCampaignList(
  filters?: CampaignListFilters,
  options?: PaginationOptions
): {
  campaigns: Campaign[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasMore: boolean;
}
```

**Example:**
```tsx
function CampaignDashboard() {
  const [filters, setFilters] = useState<CampaignListFilters>({
    status: ['active', 'scheduled']
  });
  
  const { campaigns, isLoading, hasMore } = useCampaignList(filters, {
    page: 1,
    pageSize: 20,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />
      <CampaignGrid campaigns={campaigns} loading={isLoading} />
    </div>
  );
}
```

---

### `useCreateCampaign`

Create a new campaign.

**Signature:**
```typescript
function useCreateCampaign(): {
  createCampaign: (request: CreateCampaignRequest) => Promise<Campaign>;
  isCreating: boolean;
  error: string | null;
}
```

**Example:**
```tsx
function CreateCampaignButton() {
  const { createCampaign, isCreating } = useCreateCampaign();
  const navigate = useNavigate();

  const handleCreate = async (data: CreateCampaignRequest) => {
    try {
      const campaign = await createCampaign(data);
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  return (
    <Button onClick={() => openModal(handleCreate)} loading={isCreating}>
      Create Campaign
    </Button>
  );
}
```

---

### `useUpdateCampaign`

Update an existing campaign.

**Signature:**
```typescript
function useUpdateCampaign(): {
  updateCampaign: (id: string, updates: UpdateCampaignRequest) => Promise<Campaign>;
  isUpdating: boolean;
  error: string | null;
}
```

---

### `useCampaignAnalytics`

Fetch real-time analytics for a campaign (auto-refreshes every 30s).

**Signature:**
```typescript
function useCampaignAnalytics(campaignId?: string): {
  analytics: CampaignAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
function CampaignAnalyticsDashboard({ campaignId }: Props) {
  const { analytics, isLoading } = useCampaignAnalytics(campaignId);

  return (
    <AnalyticsGrid>
      <MetricCard
        label="Impressions"
        value={analytics?.total_impressions}
      />
      <MetricCard
        label="Clicks"
        value={analytics?.total_clicks}
        change={analytics?.ctr}
      />
      <MetricCard
        label="Conversions"
        value={analytics?.total_conversions}
      />
      <MetricCard
        label="Spent"
        value={analytics?.total_spent}
        format="currency"
      />
    </AnalyticsGrid>
  );
}
```

---

### `useCampaignStatus`

Manage campaign status (pause, resume, complete).

**Signature:**
```typescript
function useCampaignStatus(): {
  updateStatus: (id: string, status: CampaignStatus) => Promise<Campaign>;
  pauseCampaign: (id: string) => Promise<Campaign>;
  resumeCampaign: (id: string) => Promise<Campaign>;
  completeCampaign: (id: string) => Promise<Campaign>;
  isUpdating: boolean;
  error: string | null;
}
```

**Example:**
```tsx
function CampaignControls({ campaignId, currentStatus }: Props) {
  const { pauseCampaign, resumeCampaign, isUpdating } = useCampaignStatus();

  const handleToggle = async () => {
    if (currentStatus === 'active') {
      await pauseCampaign(campaignId);
    } else {
      await resumeCampaign(campaignId);
    }
  };

  return (
    <button onClick={handleToggle} disabled={isUpdating}>
      {currentStatus === 'active' ? 'Pause' : 'Resume'}
    </button>
  );
}
```

---

### `useCampaignManager` (Combined Hook)

All-in-one campaign management hook.

**Signature:**
```typescript
function useCampaignManager(campaignId?: string): {
  // Data
  campaign: Campaign | null;
  analytics: CampaignAnalytics | null;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  isStatusUpdating: boolean;
  isDeleting: boolean;
  
  // Errors
  error: string | null;
  
  // Operations
  updateCampaign: (updates: UpdateCampaignRequest) => Promise<Campaign>;
  pauseCampaign: () => Promise<Campaign>;
  resumeCampaign: () => Promise<Campaign>;
  completeCampaign: () => Promise<Campaign>;
  deleteCampaign: () => Promise<boolean>;
  refresh: () => void;
}
```

**Example:**
```tsx
function CampaignPage({ campaignId }: Props) {
  const {
    campaign,
    analytics,
    isLoading,
    updateCampaign,
    pauseCampaign,
    deleteCampaign,
    refresh
  } = useCampaignManager(campaignId);

  if (isLoading) return <Spinner />;
  if (!campaign) return <NotFound />;

  return (
    <CampaignLayout>
      <CampaignHeader campaign={campaign} />
      <CampaignAnalytics analytics={analytics} />
      
      <ActionBar>
        <button onClick={() => openEditModal(updateCampaign)}>
          Edit
        </button>
        <button onClick={pauseCampaign}>
          Pause
        </button>
        <button onClick={() => confirm() && deleteCampaign()}>
          Delete
        </button>
      </ActionBar>
    </CampaignLayout>
  );
}
```

---

## Usage Examples

### Example 1: Campaign Builder with Live Targeting

```tsx
function AdvancedCampaignBuilder() {
  const { createCampaign, isCreating } = useCreateCampaign();
  const [targetingRules, setTargetingRules] = useState<TargetingRules>({});
  
  const targeting = useSmartTargeting(
    targetingRules,
    'city-123',
    'business-456'
  );

  const handleSubmit = async (formData: any) => {
    if (!targeting.isValid) {
      alert('Please fix targeting errors');
      return;
    }

    try {
      const campaign = await createCampaign({
        ...formData,
        targeting_rules: targetingRules
      });
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TargetingEditor
        value={targetingRules}
        onChange={setTargetingRules}
      />
      
      <TargetingStatus
        status={targeting.status}
        reach={targeting.estimate?.total_reach}
        errors={targeting.errors}
        warnings={targeting.warnings}
      />
      
      <button type="submit" disabled={!targeting.isValid || isCreating}>
        {isCreating ? 'Creating...' : 'Create Campaign'}
      </button>
    </form>
  );
}
```

---

### Example 2: Driver Leaderboard with Filters

```tsx
function DriverLeaderboard() {
  const [filters, setFilters] = useState<DriverFilters>({
    minScore: 80,
    verificationStatus: 'verified'
  });

  const {
    drivers,
    isLoading,
    hasMore,
    loadMore
  } = useDriverList('city-123', filters);

  return (
    <div>
      <FilterControls filters={filters} onChange={setFilters} />
      
      <LeaderboardTable drivers={drivers} loading={isLoading} />
      
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

---

### Example 3: Real-time Campaign Dashboard

```tsx
function CampaignDashboard({ campaignId }: Props) {
  const {
    campaign,
    analytics,
    isLoading,
    pauseCampaign,
    resumeCampaign,
    refresh
  } = useCampaignManager(campaignId);

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (isLoading) return <LoadingScreen />;

  return (
    <Dashboard>
      <CampaignHeader
        campaign={campaign}
        onPause={pauseCampaign}
        onResume={resumeCampaign}
      />
      
      <AnalyticsOverview analytics={analytics} />
      
      <CampaignPerformanceChart campaignId={campaignId} />
      
      <RefreshButton onClick={refresh} />
    </Dashboard>
  );
}
```

---

## Best Practices

### 1. Use Combined Hooks for Complex UIs

For pages with multiple data requirements, use combined hooks:
- `useCampaignManager` for campaign pages
- `useSmartTargeting` for campaign builders
- `useDrivers` for driver management

### 2. Handle Loading States Gracefully

```tsx
const { data, isLoading, error } = useSomeHook();

if (isLoading) return <Skeleton />;
if (error) return <ErrorBoundary error={error} />;
if (!data) return <EmptyState />;

return <DataDisplay data={data} />;
```

### 3. Debounce User Input for Real-time Hooks

```tsx
const [rules, setRules] = useState<TargetingRules>({});

// useAudienceEstimate already debounces internally
const { estimate } = useAudienceEstimate(rules, cityId, 500);
```

### 4. Optimize Re-renders with useMemo

```tsx
const filteredCampaigns = useMemo(() => {
  return campaigns.filter(c => c.status === 'active');
}, [campaigns]);
```

### 5. Use Refresh Functions Strategically

```tsx
const { campaign, refresh } = useCampaign(id);

// Refresh after mutations
const handleUpdate = async () => {
  await updateCampaign(id, updates);
  refresh();
};
```

---

## Error Handling

All hooks provide consistent error handling:

```tsx
const { data, error, isLoading } = useSomeHook();

if (error) {
  // Error is a user-friendly string
  return <ErrorAlert message={error} />;
}
```

### Custom Error Classes

- `DriverServiceError` - Driver-related errors
- `TargetingServiceError` - Targeting-related errors
- `CampaignServiceError` - Campaign-related errors

### Error Boundaries

Wrap your components with error boundaries for unexpected errors:

```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <CampaignDashboard />
</ErrorBoundary>
```

---

## Conclusion

These hooks provide a powerful, type-safe, and easy-to-use interface for building the Targeted Campaigns UI. They handle data fetching, caching, real-time updates, validation, and error handling automatically, allowing you to focus on building great user experiences.

For further assistance, refer to the implementation files:
- `src/hooks/useDrivers.ts`
- `src/hooks/useTargeting.ts`
- `src/hooks/useCampaigns.ts`
- `src/hooks/index.ts`
