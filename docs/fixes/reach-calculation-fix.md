# Reach Calculation Filter Fix

## Problem
The estimated reach in the Campaign Wizard was not updating when changing targeting filters (age, gender, location). The total always showed 10,000 regardless of selected filters.

## Root Cause
**Data structure mismatch** between the frontend and database function:

### Frontend (flat structure)
```typescript
{
  age_ranges: ["25-45"],
  gender: ["male", "female"],
  center_lat: 16.5062,
  center_lng: 80.6480,
  radius_km: 3,
  interests: ["food"],
  drivers_only: true
}
```

### Database Function (nested structure)
```sql
{
  "demographics": {
    "ageRanges": ["25-45"],
    "gender": ["male", "female"]
  },
  "location": {
    "lat": 16.5062,
    "lng": 80.6480,
    "radiusKm": 3
  },
  "behavior": {
    "interests": ["food"],
    "isDriver": true
  }
}
```

The database function `calculate_campaign_reach()` expects a nested JSON structure (lines 40-66 in migration file), but the frontend was sending a flat object. This caused the function to not extract any filters, resulting in counting all users.

## Solution

### File: `src/services/targetingService.ts`

Added `transformTargetingRules()` function that converts the flat frontend structure to the nested database structure:

```typescript
function transformTargetingRules(rules: TargetingRules): any {
  const transformed: any = {};

  // Demographics
  const demographics: any = {};
  if (rules.age_ranges && rules.age_ranges.length > 0) {
    demographics.ageRanges = rules.age_ranges;
  }
  if (rules.gender && rules.gender.length > 0) {
    demographics.gender = rules.gender;
  }
  if (rules.income_levels && rules.income_levels.length > 0) {
    demographics.incomeRanges = rules.income_levels;
  }
  if (Object.keys(demographics).length > 0) {
    transformed.demographics = demographics;
  }

  // Location
  const location: any = {};
  if (rules.center_lat !== undefined && rules.center_lng !== undefined) {
    location.lat = rules.center_lat;
    location.lng = rules.center_lng;
    location.radiusKm = rules.radius_km || 3;
  }
  if (Object.keys(location).length > 0) {
    transformed.location = location;
  }

  // Behavior
  const behavior: any = {};
  if (rules.interests && rules.interests.length > 0) {
    behavior.interests = rules.interests;
  }
  if (rules.min_purchases !== undefined) {
    behavior.minPurchases = rules.min_purchases;
  }
  if (rules.drivers_only === true) {
    behavior.isDriver = true;
  }
  if (Object.keys(behavior).length > 0) {
    transformed.behavior = behavior;
  }

  return transformed;
}
```

### Modified `estimateAudienceReach()` function:
- Now calls `transformTargetingRules()` before sending to database
- Added debug logging to help troubleshoot issues
- Enabled `p_debug: true` in RPC call to see SQL queries

```typescript
// Transform rules to match database function format
const transformedRules = transformTargetingRules(targeting_rules);

// Debug: log the transformation
console.log('🎯 Original targeting rules:', targeting_rules);
console.log('🔄 Transformed rules for database:', transformedRules);

// Call database function
const { data, error } = await supabase.rpc('calculate_campaign_reach', {
  p_targeting_rules: transformedRules,
  p_debug: true
});

// Debug: log the response
console.log('📊 Database response:', result);
if (result?.debug_info) {
  console.log('🐛 Debug info:', result.debug_info);
}
```

## Testing

### Before Fix
1. Open Campaign Wizard
2. Set age range to 25-45
3. Select gender: Male
4. Estimated reach: **10,000** (incorrect - shows all users)

### After Fix
1. Open Campaign Wizard
2. Set age range to 25-45
3. Select gender: Male
4. Estimated reach should now show a smaller, filtered number

### Debug Output
Open browser DevTools Console to see:
```
🎯 Original targeting rules: {age_ranges: ["25-45"], gender: ["male"], ...}
🔄 Transformed rules for database: {demographics: {ageRanges: ["25-45"], gender: ["male"]}}
📊 Database response: {total_reach: 1234, demographics_count: 1234, ...}
🐛 Debug info: {sql_query: "SELECT COUNT(*) FROM user_profiles WHERE ...", ...}
```

## Files Modified
1. `src/services/targetingService.ts` - Added transformation function and debug logging
2. `src/components/campaign/ReachSummaryCard.tsx` - Fixed to work with flat structure

## Additional Fix: ReachSummaryCard Component

### Problem
The `ReachSummaryCard` was trying to read nested properties from targeting rules:
```typescript
targetingRules.demographics?.ageRanges
targetingRules.location?.lat
targetingRules.behavior?.interests
```

But receiving a flat structure from `CampaignWizard`.

### Solution
Updated `ReachSummaryCard.tsx` to read from flat properties:

```typescript
const activeFilters = {
  demographics: {
    ageRanges: targetingRules.age_ranges || [],
    gender: targetingRules.gender || [],
    incomeRanges: targetingRules.income_levels || [],
  },
  location: {
    lat: targetingRules.center_lat,
    lng: targetingRules.center_lng,
    radiusKm: targetingRules.radius_km,
  },
  behavior: {
    interests: targetingRules.interests || [],
    minPurchases: targetingRules.min_purchases,
    isDriver: targetingRules.drivers_only,
  },
};
```

Also added debug logging:
```typescript
console.log('📋 ReachSummaryCard received:', {
  targetingRules,
  totalReach,
  demographicsCount,
  locationCount,
  behaviorCount
});
```

## Related Issues
- Estimated reach not updating with filters
- Demographic filters not being applied
- Location radius not affecting reach calculation
- ReachSummaryCard showing 0 for all counts

## Future Improvements
1. Consider standardizing on one data structure (either flat or nested) throughout the application
2. Add TypeScript types for the database function parameters
3. Create integration tests that verify the data transformation
4. Add error handling for malformed targeting rules

## References
- Database function: `supabase/migrations/20250113_calculate_reach_function.sql`
- Frontend types: `src/types/campaigns.ts` (TargetingRules interface)
- Service layer: `src/services/targetingService.ts`
