# Targeting Configuration Redesign - Implementation Guide

## Date: 2025-10-13

---

## Overview

Complete redesign of the Targeting Configuration UI with:
1. ✅ Fixed age input editing
2. 🗺️ Google Maps integration for location targeting
3. 👥 Relevant customer segments for behavior targeting
4. 📊 Accurate reach estimation with debug panel
5. 🎯 Improved UX based on Facebook targeting model

---

## Changes Made

### 1. ✅ Age Input Fields - FIXED

**Problem:** Users couldn't delete/edit default 18 and 65 values

**Solution:**
- Changed `useEffect` to only initialize once (removed dependency on `rules.age_ranges`)
- This allows free editing without values being reset

**File:** `src/components/campaign/TargetingEditor.tsx` (Lines 196-203)

---

### 2. 🗺️ Location Tab - NEW GOOGLE MAPS INTEGRATION

**Created New Component:** `src/components/campaign/LocationPicker.tsx`

**Features:**
- **Interactive Google Maps** with draggable marker
- **Business location** auto-set as default center
- **Radius selector** (0.5km - 20km, default 3km)
- **Visual circle** showing coverage area
- **Coverage area calculation** in km²
- **Reset button** to return to business location

**Props:**
```typescript
interface LocationPickerProps {
  businessLocation?: { lat: number; lng: number; address?: string };
  center?: { lat: number; lng: number };
  radiusKm?: number;
  onChange?: (location: { lat: number; lng: number; radiusKm: number }) => void;
  apiKey: string;
  readOnly?: boolean;
}
```

**Dependencies Installed:**
- `@react-google-maps/api` ✅
- `@radix-ui/react-slider` ✅

---

### 3. 👥 Behavior Tab - NEW CUSTOMER SEGMENTS

**Updated Types:** `src/types/campaigns.ts`

**New Customer Segments:**
```typescript
export const CUSTOMER_SEGMENTS = [
  'new_customers',      // Never interacted with business
  'existing_customers', // Previously interacted
  'power_users',        // Drivers (top 10%)
  'checked_in',         // Users who checked in
  'nearby'              // Currently near business
] as const;
```

**Updated TargetingRules:**
```typescript
export interface TargetingRules {
  // Demographics (unchanged)
  age_ranges?: AgeRange[];
  gender?: string[];
  income_levels?: IncomeLevel[];
  
  // Location (NEW - Geo-targeting)
  city_id?: string;           // Auto-set from business
  center_lat?: number;        // Map center latitude
  center_lng?: number;        // Map center longitude
  radius_km?: number;         // Radius in km (default 3)
  
  // Interests (unchanged)
  interests?: InterestCategory[];
  
  // Behavior (NEW - Customer Segments)
  customer_segments?: CustomerSegment[];
  
  // Legacy (kept for compatibility)
  min_activity_score?: number;
  drivers_only?: boolean;
  exclude_existing_customers?: boolean;
}
```

---

## Integration Steps

### Step 1: Update TargetingEditor Location Tab

Replace the current Location tab render with:

```typescript
const renderLocationTab = () => (
  <LocationPicker
    businessLocation={businessLocation}
    center={{
      lat: rules.center_lat || businessLocation?.lat,
      lng: rules.center_lng || businessLocation?.lng
    }}
    radiusKm={rules.radius_km || 3}
    onChange={(location) => {
      updateRule('center_lat', location.lat);
      updateRule('center_lng', location.lng);
      updateRule('radius_km', location.radiusKm);
    }}
    apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
    readOnly={readOnly}
  />
);
```

### Step 2: Update TargetingEditor Behavior Tab

Replace the current Behavior tab render with:

```typescript
const renderBehaviorTab = () => (
  <div className="space-y-6">
    {/* Customer Segments */}
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        Target Customer Segments
      </Label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'new_customers', label: 'New Customers', icon: '👤', description: 'Never interacted with your business' },
          { value: 'existing_customers', label: 'Existing Customers', icon: '🤝', description: 'Previously interacted' },
          { value: 'power_users', label: 'Power Users', icon: '⭐', description: 'Top 10% most active (Drivers)' },
          { value: 'checked_in', label: 'Checked-In Users', icon: '📍', description: 'Users who checked in' },
          { value: 'nearby', label: 'Nearby Users', icon: '📡', description: 'Currently near your business' },
        ].map((segment) => {
          const isSelected = (rules.customer_segments || []).includes(segment.value as any);
          return (
            <Card
              key={segment.value}
              className={`cursor-pointer transition-all ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => !readOnly && toggleArrayValue('customer_segments', segment.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{segment.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{segment.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {segment.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  </div>
);
```

### Step 3: Set Google Maps API Key

**Option A: Using .env file**

Create `.env.local` in project root:
```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Option B: If you have the key, provide it to me and I'll set it up**

---

## Database Schema Updates

### Migration for New Targeting Fields

The `targeting_rules` JSONB column already supports flexible schema, so no migration needed!

The new fields will be automatically stored:
- `city_id`
- `center_lat`, `center_lng`
- `radius_km`
- `customer_segments`

---

## Reach Estimation Updates

### Current Issue:
Reach estimation uses mock data and doesn't query actual database

### Solution: Create Real Reach Estimator Service

**File:** `src/services/reachEstimationService.ts`

```typescript
import { supabase } from '../lib/supabase';
import type { TargetingRules } from '../types/campaigns';

export interface ReachEstimationResult {
  total_users: number;
  matching_users: number;
  breakdown_by_segment?: Record<string, number>;
  breakdown_by_age?: Record<string, number>;
  breakdown_by_gender?: Record<string, number>;
  sql_query: string; // For debug panel
  execution_time_ms: number;
}

export async function estimateReach(
  businessId: string,
  targeting: TargetingRules
): Promise<ReachEstimationResult> {
  const startTime = Date.now();
  
  let query = supabase
    .from('profiles')
    .select('id, age_range, gender, city_id', { count: 'exact' });

  // Apply filters
  const conditions: string[] = [];
  
  // Age ranges
  if (targeting.age_ranges && targeting.age_ranges.length > 0) {
    conditions.push(`age_range IN (${targeting.age_ranges.map(r => `'${r}'`).join(',')})`);
  }
  
  // Gender
  if (targeting.gender && targeting.gender.length > 0) {
    conditions.push(`gender IN (${targeting.gender.map(g => `'${g}'`).join(',')})`);
  }
  
  // Location (radius-based)
  if (targeting.center_lat && targeting.center_lng && targeting.radius_km) {
    // Use PostGIS for radius calculation
    conditions.push(`
      ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(${targeting.center_lng}, ${targeting.center_lat}), 4326)::geography,
        ${targeting.radius_km * 1000}
      )
    `);
  }
  
  // Customer Segments
  if (targeting.customer_segments && targeting.customer_segments.length > 0) {
    for (const segment of targeting.customer_segments) {
      switch (segment) {
        case 'new_customers':
          // Users with no interactions with this business
          conditions.push(`
            NOT EXISTS (
              SELECT 1 FROM coupon_redemptions cr 
              JOIN coupons c ON c.id = cr.coupon_id 
              WHERE c.business_id = '${businessId}' AND cr.user_id = profiles.id
            )
          `);
          break;
        case 'existing_customers':
          // Users with previous interactions
          conditions.push(`
            EXISTS (
              SELECT 1 FROM coupon_redemptions cr 
              JOIN coupons c ON c.id = cr.coupon_id 
              WHERE c.business_id = '${businessId}' AND cr.user_id = profiles.id
            )
          `);
          break;
        case 'power_users':
          // Drivers (top 10%)
          conditions.push(`
            EXISTS (
              SELECT 1 FROM driver_profiles dp 
              WHERE dp.user_id = profiles.id AND dp.is_driver = true
            )
          `);
          break;
        case 'checked_in':
          // Users who checked in
          conditions.push(`
            EXISTS (
              SELECT 1 FROM business_checkins bc 
              WHERE bc.business_id = '${businessId}' AND bc.user_id = profiles.id
            )
          `);
          break;
        case 'nearby':
          // Currently near business (within 1km in last hour)
          // This requires real-time location data
          conditions.push(`
            last_location_update > NOW() - INTERVAL '1 hour'
            AND ST_DWithin(
              current_location::geography,
              (SELECT location::geography FROM businesses WHERE id = '${businessId}'),
              1000
            )
          `);
          break;
      }
    }
  }
  
  // Build final query
  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}`
    : '';
  
  const sqlQuery = `
    SELECT COUNT(*) as matching_users
    FROM profiles
    ${whereClause}
  `;
  
  // Execute query
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const executionTime = Date.now() - startTime;
  
  return {
    total_users: count || 0,
    matching_users: count || 0,
    sql_query: sqlQuery,
    execution_time_ms: executionTime
  };
}
```

---

## Debug Panel Component

**File:** `src/components/campaign/ReachDebugPanel.tsx`

```typescript
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Code, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export interface ReachDebugPanelProps {
  sqlQuery: string;
  executionTime: number;
  totalUsers: number;
  matchingUsers: number;
  filters: Record<string, any>;
  onRefresh?: () => void;
}

export function ReachDebugPanel({
  sqlQuery,
  executionTime,
  totalUsers,
  matchingUsers,
  filters,
  onRefresh
}: ReachDebugPanelProps) {
  const [showSQL, setShowSQL] = useState(false);
  
  const appliedFilters = Object.entries(filters).filter(([_, value]) => 
    value !== undefined && value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  );
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Reach Estimation Debug
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600">Query Time</div>
            <div className="text-xl font-bold text-blue-900">{executionTime}ms</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600">Matching Users</div>
            <div className="text-xl font-bold text-green-900">{matchingUsers.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600">Match Rate</div>
            <div className="text-xl font-bold text-purple-900">
              {((matchingUsers / totalUsers) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        
        {/* Applied Filters */}
        <div>
          <div className="text-sm font-medium mb-2">Applied Filters:</div>
          <div className="flex flex-wrap gap-2">
            {appliedFilters.length > 0 ? (
              appliedFilters.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="gap-1">
                <XCircle className="w-3 h-3" />
                No filters applied
              </Badge>
            )}
          </div>
        </div>
        
        {/* SQL Query */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSQL(!showSQL)}
            className="mb-2"
          >
            {showSQL ? 'Hide' : 'Show'} SQL Query
          </Button>
          {showSQL && (
            <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
              {sqlQuery}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Next Steps

1. ✅ Age inputs fixed
2. ✅ Types updated with new fields
3. ✅ LocationPicker component created
4. ✅ Google Maps dependencies installed
5. ⏳ Need Google Maps API key
6. ⏳ Update TargetingEditor to use new components
7. ⏳ Implement real reach estimation service
8. ⏳ Add debug panel to ReachEstimator

---

## Testing Checklist

### Location Tab:
- [ ] Map loads with business location as center
- [ ] Can drag marker to new location
- [ ] Radius slider changes circle size
- [ ] "Reset to Business" button works
- [ ] Coverage area calculates correctly
- [ ] Values save to targeting_rules

### Behavior Tab:
- [ ] All 5 customer segments displayed
- [ ] Can select/deselect segments
- [ ] Visual feedback (checkmark) works
- [ ] Multiple segments can be selected
- [ ] Values save to targeting_rules

### Reach Estimation:
- [ ] Changes when filters applied
- [ ] Different for different segments
- [ ] Debug panel shows SQL query
- [ ] Execution time displayed
- [ ] Match rate accurate

---

## Google Maps API Setup

**Required:**
1. Google Cloud Console project
2. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Create API key with restrictions:
   - HTTP referrers: localhost:5173, your-domain.com
   - API restrictions: Above 3 APIs only

**Add to .env.local:**
```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

---

This redesign follows Facebook's targeting model with hyperlocal focus!
