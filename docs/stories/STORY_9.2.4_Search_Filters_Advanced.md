# 🔍 STORY 9.2.4: Search Filters & Advanced Search

**Epic:** [EPIC 9.2 - Friend Discovery & Search](../epics/EPIC_9.2_Friend_Discovery_Search.md)  
**Story ID:** 9.2.4  
**Priority:** 🟡 Medium  
**Estimate:** 2 days  
**Status:** 📋 Ready for Development  
**Dependencies:** Story 9.2.1 (Global Friend Search)

---

## 📋 **Story Description**

As a SynC user, I want to **filter friend search results** by location, mutual friends, and shared interests, so I can find the most relevant connections and narrow down search results to people I'm more likely to know.

**User Value:**  
Users can refine search results to find specific people, increasing the likelihood of meaningful connections and reducing time spent searching.

---

## 🎯 **Acceptance Criteria**

### Database Layer
- [ ] **AC 9.2.4.1**: `search_users_with_filters()` function created extending base search
- [ ] **AC 9.2.4.2**: Location filter supports:
  - City name matching
  - Radius options: 5km, 10km, 25km, 50km
  - Uses PostGIS ST_Distance for accurate calculations
- [ ] **AC 9.2.4.3**: Mutual friends filter (boolean toggle)
- [ ] **AC 9.2.4.4**: Shared interests filter (deal category IDs array)
- [ ] **AC 9.2.4.5**: Filters combine with AND logic
- [ ] **AC 9.2.4.6**: Query performance: < 100ms with all filters active

### Service Layer
- [ ] **AC 9.2.4.7**: `searchService.ts` updated with `searchUsersWithFilters()` function
- [ ] **AC 9.2.4.8**: `SearchFilters` TypeScript interface defined
- [ ] **AC 9.2.4.9**: Filter state persisted in localStorage

### Frontend Hooks
- [ ] **AC 9.2.4.10**: `useSearchFilters()` hook with state management
- [ ] **AC 9.2.4.11**: Filter state syncs with URL query params

### UI Components
- [ ] **AC 9.2.4.12**: `SearchFilters.tsx` component with:
  - Location radius dropdown
  - Mutual friends checkbox
  - Shared interests selector
  - Clear all filters button
- [ ] **AC 9.2.4.13**: `FilterChips.tsx` showing active filters as removable chips
- [ ] **AC 9.2.4.14**: Filter panel toggles open/closed on mobile
- [ ] **AC 9.2.4.15**: Active filter count badge on filter button

### Testing
- [ ] **AC 9.2.4.16**: Unit tests for filter combinations
- [ ] **AC 9.2.4.17**: E2E test: Apply filters → results update
- [ ] **AC 9.2.4.18**: Test filter persistence across page refreshes

---

## 🛠️ **Technical Specification**

### Database Migration: `20250128_search_filters.sql`

```sql
-- Enhanced search function with filters
CREATE OR REPLACE FUNCTION search_users_with_filters(
  search_query TEXT,
  current_user_id UUID,
  filter_location_lat FLOAT DEFAULT NULL,
  filter_location_lng FLOAT DEFAULT NULL,
  filter_location_radius_km INT DEFAULT NULL,
  filter_require_mutual_friends BOOLEAN DEFAULT FALSE,
  filter_shared_interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  location TEXT,
  mutual_friends_count INT,
  distance_km FLOAT,
  relevance_score FLOAT
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  filter_location GEOGRAPHY;
BEGIN
  -- Create geography point from coordinates if provided
  IF filter_location_lat IS NOT NULL AND filter_location_lng IS NOT NULL THEN
    filter_location := ST_MakePoint(filter_location_lng, filter_location_lat)::geography;
  END IF;

  RETURN QUERY
  WITH base_results AS (
    -- Get base search results (more than requested to account for filtering)
    SELECT * FROM search_users(search_query, current_user_id, limit_count * 3, 0)
  )
  SELECT *
  FROM base_results
  WHERE
    -- Location filter: within specified radius
    (
      filter_location IS NULL 
      OR filter_location_radius_km IS NULL 
      OR distance_km IS NULL
      OR distance_km <= filter_location_radius_km
    )
    -- Mutual friends filter: must have at least one mutual friend
    AND (
      NOT filter_require_mutual_friends 
      OR mutual_friends_count > 0
    )
    -- Shared interests filter: user has favorited deals in specified categories
    AND (
      array_length(filter_shared_interests, 1) IS NULL
      OR user_id IN (
        SELECT DISTINCT fd.user_id
        FROM favorite_deals fd
        JOIN deals d ON d.id = fd.deal_id
        WHERE d.category = ANY(filter_shared_interests)
      )
    )
  ORDER BY relevance_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for deal categories (used by shared interests filter)
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_favorite_deals_user_deal ON favorite_deals(user_id, deal_id);
```

### Service Layer: Update `src/services/searchService.ts`

```typescript
/**
 * Search Service - Enhanced with Filters
 * Story 9.2.4: Search Filters & Advanced Search
 */

export interface SearchFilters {
  location?: {
    lat: number;
    lng: number;
    radius: 5 | 10 | 25 | 50; // km
  };
  hasMutualFriends?: boolean;
  sharedInterests?: string[]; // deal category IDs
  limit?: number;
  offset?: number;
}

/**
 * Search users with filters
 */
export async function searchUsersWithFilters(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('search_users_with_filters', {
    search_query: query.trim(),
    current_user_id: user.id,
    filter_location_lat: filters.location?.lat || null,
    filter_location_lng: filters.location?.lng || null,
    filter_location_radius_km: filters.location?.radius || null,
    filter_require_mutual_friends: filters.hasMutualFriends || false,
    filter_shared_interests: filters.sharedInterests || [],
    limit_count: filters.limit || 20,
    offset_count: filters.offset || 0,
  });

  if (error) {
    console.error('Filtered search error:', error);
    throw new Error('Failed to search with filters. Please try again.');
  }

  // Save search query to history (same as base search)
  saveSearchQuery(query.trim()).catch(console.error);

  return data || [];
}

/**
 * Save filters to localStorage
 */
export function saveSearchFilters(filters: SearchFilters): void {
  try {
    localStorage.setItem('search_filters', JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save search filters:', error);
  }
}

/**
 * Load filters from localStorage
 */
export function loadSearchFilters(): SearchFilters {
  try {
    const saved = localStorage.getItem('search_filters');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load search filters:', error);
    return {};
  }
}

/**
 * Clear saved filters
 */
export function clearSearchFilters(): void {
  try {
    localStorage.removeItem('search_filters');
  } catch (error) {
    console.error('Failed to clear search filters:', error);
  }
}
```

### React Hook: `src/hooks/useSearchFilters.ts`

```typescript
/**
 * Search Filters Hook
 * Story 9.2.4: Search Filters & Advanced Search
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  searchUsersWithFilters,
  saveSearchFilters,
  loadSearchFilters,
  clearSearchFilters as clearFiltersFromStorage,
  type SearchFilters,
} from '@/services/searchService';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Hook for managing search filters with URL sync and persistence
 */
export function useSearchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>(() => {
    // Initialize from URL params or localStorage
    const urlRadius = searchParams.get('radius');
    const urlMutual = searchParams.get('mutual');
    
    if (urlRadius || urlMutual) {
      return {
        location: urlRadius ? { 
          lat: 0, lng: 0, // Will be set from user's location
          radius: parseInt(urlRadius) as 5 | 10 | 25 | 50 
        } : undefined,
        hasMutualFriends: urlMutual === 'true',
      };
    }
    
    return loadSearchFilters();
  });

  // Save filters to localStorage on change
  useEffect(() => {
    saveSearchFilters(filters);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (filters.location?.radius) {
      newParams.set('radius', filters.location.radius.toString());
    } else {
      newParams.delete('radius');
    }
    if (filters.hasMutualFriends) {
      newParams.set('mutual', 'true');
    } else {
      newParams.delete('mutual');
    }
    setSearchParams(newParams, { replace: true });
  }, [filters]);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
    clearFiltersFromStorage();
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = () => {
    return !!(filters.location?.radius || filters.hasMutualFriends || filters.sharedInterests?.length);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.location?.radius) count++;
    if (filters.hasMutualFriends) count++;
    if (filters.sharedInterests?.length) count++;
    return count;
  };

  return {
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    activeFilterCount: getActiveFilterCount(),
  };
}

/**
 * Hook for filtered search with debouncing
 */
export function useFilteredSearch(query: string, filters: SearchFilters) {
  const debouncedQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['search', 'filtered', debouncedQuery, filters],
    queryFn: () => searchUsersWithFilters(debouncedQuery, filters),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}
```

### UI Components

**`src/components/search/SearchFilters.tsx`**

```typescript
/**
 * Search Filters Component
 * Story 9.2.4: Search Filters & Advanced Search
 */

import React from 'react';
import { MapPin, Users, Heart, X } from 'lucide-react';
import { SearchFilters as SearchFiltersType } from '@/services/searchService';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onChange: (filters: SearchFiltersType) => void;
  onClear: () => void;
}

export function SearchFilters({ filters, onChange, onClear }: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <button
          onClick={onClear}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Clear all
        </button>
      </div>
      
      {/* Location Filter */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 mr-2" />
          Distance
        </label>
        <select
          value={filters.location?.radius || ''}
          onChange={(e) => {
            const radius = e.target.value;
            if (radius) {
              // Get user's current location
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  onChange({
                    ...filters,
                    location: {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      radius: parseInt(radius) as 5 | 10 | 25 | 50,
                    },
                  });
                },
                () => {
                  alert('Location permission required for distance filter');
                }
              );
            } else {
              onChange({ ...filters, location: undefined });
            }
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Any distance</option>
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="25">Within 25 km</option>
          <option value="50">Within 50 km</option>
        </select>
      </div>

      {/* Mutual Friends Filter */}
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hasMutualFriends || false}
          onChange={(e) => onChange({
            ...filters,
            hasMutualFriends: e.target.checked,
          })}
          className="mr-3 w-4 h-4"
        />
        <Users className="w-4 h-4 mr-2 text-gray-600" />
        <span className="text-sm text-gray-700">Has mutual friends</span>
      </label>

      {/* Shared Interests Filter */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
          <Heart className="w-4 h-4 mr-2" />
          Shared Interests
        </label>
        <select
          multiple
          value={filters.sharedInterests || []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            onChange({
              ...filters,
              sharedInterests: selected.length > 0 ? selected : undefined,
            });
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
          size={4}
        >
          <option value="electronics">Electronics</option>
          <option value="fashion">Fashion</option>
          <option value="home">Home & Garden</option>
          <option value="sports">Sports & Outdoors</option>
          <option value="food">Food & Grocery</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Hold Ctrl/Cmd to select multiple
        </p>
      </div>
    </div>
  );
}
```

**`src/components/search/FilterChips.tsx`**

```typescript
/**
 * Filter Chips Component - Display active filters
 * Story 9.2.4: Search Filters & Advanced Search
 */

import React from 'react';
import { X, MapPin, Users, Heart } from 'lucide-react';
import { SearchFilters } from '@/services/searchService';

interface FilterChipsProps {
  filters: SearchFilters;
  onRemoveFilter: (filterType: 'location' | 'mutual' | 'interests') => void;
}

export function FilterChips({ filters, onRemoveFilter }: FilterChipsProps) {
  const chips = [];

  // Location chip
  if (filters.location?.radius) {
    chips.push(
      <div
        key="location"
        className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
      >
        <MapPin className="w-3 h-3 mr-1" />
        Within {filters.location.radius} km
        <button
          onClick={() => onRemoveFilter('location')}
          className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Mutual friends chip
  if (filters.hasMutualFriends) {
    chips.push(
      <div
        key="mutual"
        className="inline-flex items-center bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full"
      >
        <Users className="w-3 h-3 mr-1" />
        Mutual friends
        <button
          onClick={() => onRemoveFilter('mutual')}
          className="ml-2 hover:bg-green-200 rounded-full p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Shared interests chips
  if (filters.sharedInterests && filters.sharedInterests.length > 0) {
    chips.push(
      <div
        key="interests"
        className="inline-flex items-center bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full"
      >
        <Heart className="w-3 h-3 mr-1" />
        {filters.sharedInterests.length} interest{filters.sharedInterests.length > 1 ? 's' : ''}
        <button
          onClick={() => onRemoveFilter('interests')}
          className="ml-2 hover:bg-purple-200 rounded-full p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chips}
    </div>
  );
}
```

---

## 🎯 **MCP Integration**

### Supabase MCP
```bash
# Apply migration
warp mcp run supabase "apply_migration mobile-app-setup 20250128_search_filters ..."

# Test filtered search with all filters
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM search_users_with_filters('john', auth.uid(), 40.7128, -74.0060, 10, TRUE, ARRAY['electronics', 'fashion']::TEXT[], 20, 0)"

# Test performance with EXPLAIN
warp mcp run supabase "execute_sql mobile-app-setup EXPLAIN ANALYZE SELECT * FROM search_users_with_filters('test', auth.uid(), NULL, NULL, NULL, TRUE, ARRAY[]::TEXT[], 20, 0)"
```

### Shadcn MCP
```bash
# Generate filter UI components
warp mcp run shadcn "add select checkbox"
```

### Puppeteer MCP
```bash
# Test filter flow
warp mcp run puppeteer "navigate to search page, apply location filter, verify results update"

# Test filter persistence
warp mcp run puppeteer "apply filters, refresh page, verify filters restored"
```

---

## ✅ **Definition of Done**

- [ ] All 18 acceptance criteria met
- [ ] Database migration applied successfully
- [ ] Filter function tested with all combinations
- [ ] Service layer with filter persistence implemented
- [ ] React hooks with URL sync created
- [ ] UI components built and responsive
- [ ] Filter chips display active filters
- [ ] Unit tests written (>80% coverage)
- [ ] E2E tests pass
- [ ] Performance verified (< 100ms with filters)
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## 📚 **Related Documentation**

- [Epic 9.2 Overview](../epics/EPIC_9.2_Friend_Discovery_Search.md)
- [Story 9.2.1 - Global Friend Search](./STORY_9.2.1_Global_Friend_Search.md)
- [Story 9.2.5 - Performance Optimization](./STORY_9.2.5_Search_Performance_Optimization.md)

---

**Next Story:** [STORY 9.2.5 - Search Performance Optimization](./STORY_9.2.5_Search_Performance_Optimization.md)
