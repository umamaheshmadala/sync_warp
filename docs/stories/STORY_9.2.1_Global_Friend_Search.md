# 🔍 STORY 9.2.1: Global Friend Search with Fuzzy Matching

**Epic:** [EPIC 9.2 - Friend Discovery & Search](../epics/EPIC_9.2_Friend_Discovery_Search.md)  
**Story ID:** 9.2.1  
**Priority:** 🔴 Critical  
**Estimate:** 3 days  
**Status:** 📋 Ready for Development

---

## 📋 **Story Description**

As a SynC user, I want to **search for friends globally** with intelligent fuzzy matching so that I can find people even with typos, and see relevant results ranked by mutual connections and proximity.

**User Value:**  
Users can quickly find friends to connect with, even if they don't remember exact spellings, leading to increased friend network growth.

---

## 🎯 **Acceptance Criteria**

### Database Layer
- [ ] **AC 9.2.1.1**: Full-text search index created on `profiles.full_name` using PostgreSQL `tsvector`
- [ ] **AC 9.2.1.2**: `search_users()` function implemented with fuzzy matching (Levenshtein distance)
- [ ] **AC 9.2.1.3**: Search ranking algorithm considers:
  - Mutual friends count (40% weight)
  - Location proximity (30% weight)
  - Name similarity (30% weight)
- [ ] **AC 9.2.1.4**: Privacy settings respected (only searchable users appear)
- [ ] **AC 9.2.1.5**: Blocked users excluded from search results (bidirectional)
- [ ] **AC 9.2.1.6**: Query performance: < 50ms for 100k+ users
- [ ] **AC 9.2.1.7**: Pagination implemented (20 results per page)
- [ ] **AC 9.2.1.8**: RLS policies prevent unauthorized searches

### Service Layer
- [ ] **AC 9.2.1.9**: `searchService.ts` created with:
  - `searchUsers(query, filters, page)` - Main search function
  - `getSearchHistory()` - Get last 10 searches
  - `saveSearchQuery(query)` - Save search to history
  - `clearSearchHistory()` - Clear all searches
- [ ] **AC 9.2.1.10**: TypeScript interfaces for `SearchResult`, `SearchFilters`
- [ ] **AC 9.2.1.11**: Error handling for network failures, empty results

### Frontend Hooks
- [ ] **AC 9.2.1.12**: `useSearch.ts` hook created with:
  - `useSearchUsers(query, options)` - React Query hook
  - `useSearchHistory()` - Get recent searches
  - `useClearSearchHistory()` - Mutation hook
  - Debouncing (300ms)
  - Loading/error states
  - Infinite scroll support

### UI Components
- [ ] **AC 9.2.1.13**: `SearchBar.tsx` component created:
  - Input with search icon
  - Debounced input (300ms)
  - Clear button
  - Loading indicator
  - Keyboard shortcuts (Cmd/Ctrl+K)
- [ ] **AC 9.2.1.14**: `SearchResults.tsx` component created:
  - Displays search results
  - Shows mutual friends count
  - Shows location distance (if available)
  - Click to view profile
  - Add friend button
  - Infinite scroll
- [ ] **AC 9.2.1.15**: `RecentSearches.tsx` component:
  - Shows last 10 searches
  - Click to re-search
  - Clear all button
- [ ] **AC 9.2.1.16**: `EmptySearchState.tsx` component:
  - "No results found" state
  - Search suggestions
  - Try different keywords prompt

### Testing & Validation
- [ ] **AC 9.2.1.17**: Unit tests for `searchService.ts` (>80% coverage)
- [ ] **AC 9.2.1.18**: E2E test: Search with exact name → correct results
- [ ] **AC 9.2.1.19**: E2E test: Search with typo → fuzzy match works
- [ ] **AC 9.2.1.20**: E2E test: Search respects blocked users
- [ ] **AC 9.2.1.21**: Performance test: 100k users, < 50ms response time
- [ ] **AC 9.2.1.22**: RLS security test: Cannot search private profiles

---

## 🛠️ **Technical Specification**

### Database Migration: `20250125_search_infrastructure.sql`

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy matching
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch; -- For Levenshtein distance

-- Add search columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN DEFAULT true;

-- Update search vector for existing profiles
UPDATE profiles 
SET search_vector = to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(username, ''));

-- Create trigger to auto-update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.full_name, '') || ' ' || COALESCE(NEW.username, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_search_vector_update
  BEFORE INSERT OR UPDATE OF full_name, username ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Create indexes for performance
CREATE INDEX idx_profiles_search_vector ON profiles USING gin(search_vector);
CREATE INDEX idx_profiles_full_name_trgm ON profiles USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_profiles_searchable ON profiles(is_searchable) WHERE is_searchable = true;

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  searched_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_query UNIQUE(user_id, query)
);

CREATE INDEX idx_search_history_user_date ON search_history(user_id, searched_at DESC);

-- RLS policies for search history
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
  ON search_history FOR DELETE
  USING (auth.uid() = user_id);

-- Main search function with ranking
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  current_user_id UUID,
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
  current_user_location GEOGRAPHY;
BEGIN
  -- Get current user's location
  SELECT ST_MakePoint(
    (profiles.location->>'longitude')::float,
    (profiles.location->>'latitude')::float
  )::geography
  INTO current_user_location
  FROM profiles
  WHERE id = current_user_id;

  RETURN QUERY
  WITH mutual_friends AS (
    SELECT 
      f2.friend_id,
      COUNT(*) as mutual_count
    FROM friendships f1
    JOIN friendships f2 ON f1.friend_id = f2.user_id
    WHERE f1.user_id = current_user_id 
      AND f1.is_active = true
      AND f2.is_active = true
      AND f2.friend_id != current_user_id
    GROUP BY f2.friend_id
  ),
  search_candidates AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.location->>'city' as location,
      COALESCE(mf.mutual_count, 0) as mutual_count,
      -- Calculate distance if both users have locations
      CASE 
        WHEN current_user_location IS NOT NULL 
          AND p.location->>'latitude' IS NOT NULL 
          AND p.location->>'longitude' IS NOT NULL
        THEN ST_Distance(
          current_user_location,
          ST_MakePoint(
            (p.location->>'longitude')::float,
            (p.location->>'latitude')::float
          )::geography
        ) / 1000.0
        ELSE NULL
      END as distance,
      -- Text search score
      ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as ts_score,
      -- Fuzzy match score (trigram similarity)
      similarity(p.full_name, search_query) as name_similarity
    FROM profiles p
    LEFT JOIN mutual_friends mf ON mf.friend_id = p.id
    WHERE p.id != current_user_id
      -- Exclude blocked users (bidirectional)
      AND p.id NOT IN (
        SELECT blocked_id FROM blocked_users WHERE blocker_id = current_user_id
        UNION
        SELECT blocker_id FROM blocked_users WHERE blocked_id = current_user_id
      )
      -- Exclude existing friends
      AND p.id NOT IN (
        SELECT friend_id FROM friendships WHERE user_id = current_user_id AND is_active = true
      )
      -- Only searchable profiles
      AND p.is_searchable = true
      -- Match search query (text search OR fuzzy match)
      AND (
        p.search_vector @@ plainto_tsquery('english', search_query)
        OR similarity(p.full_name, search_query) > 0.3
        OR similarity(p.username, search_query) > 0.3
      )
  )
  SELECT 
    sc.id,
    sc.full_name,
    sc.username,
    sc.avatar_url,
    sc.location,
    sc.mutual_count::INT,
    sc.distance,
    -- Final relevance score (weighted)
    (
      (sc.mutual_count * 0.4) +
      (CASE WHEN sc.distance IS NOT NULL THEN (1.0 / (sc.distance + 1)) * 10 ELSE 0 END * 0.3) +
      ((sc.ts_score + sc.name_similarity) * 0.3)
    ) as relevance
  FROM search_candidates sc
  ORDER BY relevance DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to save search query
CREATE OR REPLACE FUNCTION save_search_query(
  p_user_id UUID,
  p_query TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO search_history (user_id, query)
  VALUES (p_user_id, p_query)
  ON CONFLICT (user_id, query) 
  DO UPDATE SET searched_at = NOW();
  
  -- Keep only last 10 searches
  DELETE FROM search_history
  WHERE user_id = p_user_id
    AND id NOT IN (
      SELECT id FROM search_history
      WHERE user_id = p_user_id
      ORDER BY searched_at DESC
      LIMIT 10
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get search history
CREATE OR REPLACE FUNCTION get_search_history(p_user_id UUID)
RETURNS TABLE(query TEXT, searched_at TIMESTAMPTZ)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sh.query, sh.searched_at
  FROM search_history sh
  WHERE sh.user_id = p_user_id
  ORDER BY sh.searched_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

### Service Layer: `src/services/searchService.ts`

```typescript
/**
 * Search Service - Global Friend Search
 * Story 9.2.1: Global Friend Search with Fuzzy Matching
 */

import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  mutual_friends_count: number;
  distance_km: number | null;
  relevance_score: number;
}

export interface SearchFilters {
  limit?: number;
  offset?: number;
}

export interface SearchHistory {
  query: string;
  searched_at: string;
}

/**
 * Search for users globally with fuzzy matching
 */
export async function searchUsers(
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

  const { data, error } = await supabase.rpc('search_users', {
    search_query: query.trim(),
    current_user_id: user.id,
    limit_count: filters.limit || 20,
    offset_count: filters.offset || 0,
  });

  if (error) {
    console.error('Search error:', error);
    throw new Error('Failed to search users. Please try again.');
  }

  // Save search query to history (fire and forget)
  saveSearchQuery(query.trim()).catch(console.error);

  return data || [];
}

/**
 * Save search query to history
 */
export async function saveSearchQuery(query: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('save_search_query', {
    p_user_id: user.id,
    p_query: query,
  });

  if (error) {
    console.error('Failed to save search query:', error);
  }
}

/**
 * Get user's search history (last 10 searches)
 */
export async function getSearchHistory(): Promise<SearchHistory[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_search_history', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Failed to get search history:', error);
    return [];
  }

  return data || [];
}

/**
 * Clear all search history
 */
export async function clearSearchHistory(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to clear search history:', error);
    throw new Error('Failed to clear search history');
  }
}
```

### React Hook: `src/hooks/useSearch.ts`

```typescript
/**
 * Search Hooks - React Query Integration
 * Story 9.2.1: Global Friend Search
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { 
  searchUsers, 
  getSearchHistory, 
  clearSearchHistory,
  type SearchResult,
  type SearchHistory 
} from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Hook for searching users with debouncing
 */
export function useSearchUsers(query: string, options: { enabled?: boolean } = {}) {
  const debouncedQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['search', 'users', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: (options.enabled !== false) && debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

/**
 * Hook for infinite scroll search results
 */
export function useInfiniteSearchUsers(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useInfiniteQuery({
    queryKey: ['search', 'users', 'infinite', debouncedQuery],
    queryFn: ({ pageParam = 0 }) => 
      searchUsers(debouncedQuery, { offset: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than requested, we're at the end
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });
}

/**
 * Hook for search history
 */
export function useSearchHistory() {
  return useQuery({
    queryKey: ['search', 'history'],
    queryFn: getSearchHistory,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for clearing search history
 */
export function useClearSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearSearchHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search', 'history'] });
    },
  });
}
```

### UI Components

**`src/components/search/SearchBar.tsx`**

```typescript
/**
 * Search Bar Component
 * Story 9.2.1: Global Friend Search
 */

import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  onSearch,
  isLoading = false,
  placeholder = 'Search for friends...',
  autoFocus = false,
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        )}
        {!isLoading && query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Press <kbd className="px-2 py-1 bg-gray-100 rounded">⌘K</kbd> or{' '}
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+K</kbd> to focus
      </div>
    </div>
  );
}
```

**`src/components/search/SearchResults.tsx`**

```typescript
/**
 * Search Results Component
 * Story 9.2.1: Global Friend Search
 */

import React from 'react';
import { Users, MapPin } from 'lucide-react';
import { SearchResult } from '@/services/searchService';
import { useNavigate } from 'react-router-dom';
import { useSendFriendRequest } from '@/hooks/useFriendRequests';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function SearchResults({ 
  results, 
  isLoading, 
  onLoadMore, 
  hasMore 
}: SearchResultsProps) {
  const navigate = useNavigate();
  const sendFriendRequest = useSendFriendRequest();

  if (isLoading && results.length === 0) {
    return <SearchResultsSkeleton />;
  }

  if (results.length === 0) {
    return <EmptySearchState />;
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <div
          key={result.user_id}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate(`/profile/${result.user_id}`)}
        >
          <div className="flex items-center space-x-4">
            <img
              src={result.avatar_url || '/default-avatar.png'}
              alt={result.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{result.full_name}</h3>
              <p className="text-sm text-gray-500">@{result.username}</p>
              {result.mutual_friends_count > 0 && (
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {result.mutual_friends_count} mutual friend{result.mutual_friends_count !== 1 ? 's' : ''}
                </div>
              )}
              {result.location && (
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {result.location}
                  {result.distance_km && ` • ${Math.round(result.distance_km)} km away`}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              sendFriendRequest.mutate(result.user_id);
            }}
            disabled={sendFriendRequest.isPending}
            className="btn btn-primary btn-sm"
          >
            Add Friend
          </button>
        </div>
      ))}
      
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="w-full py-2 text-primary-600 hover:text-primary-700"
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg animate-pulse">
          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptySearchState() {
  return (
    <div className="text-center py-12">
      <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
      <p className="text-gray-600">
        Try searching with different keywords or check your spelling
      </p>
    </div>
  );
}
```

**`src/components/search/RecentSearches.tsx`**

```typescript
/**
 * Recent Searches Component
 * Story 9.2.1: Global Friend Search
 */

import React from 'react';
import { Clock, X } from 'lucide-react';
import { useSearchHistory, useClearSearchHistory } from '@/hooks/useSearch';

interface RecentSearchesProps {
  onSearchClick: (query: string) => void;
}

export function RecentSearches({ onSearchClick }: RecentSearchesProps) {
  const { data: history, isLoading } = useSearchHistory();
  const clearHistory = useClearSearchHistory();

  if (isLoading || !history || history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Recent Searches
        </h3>
        <button
          onClick={() => clearHistory.mutate()}
          className="text-xs text-gray-600 hover:text-gray-900"
        >
          Clear All
        </button>
      </div>
      <div className="space-y-2">
        {history.map((item, index) => (
          <button
            key={index}
            onClick={() => onSearchClick(item.query)}
            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm text-gray-700"
          >
            {item.query}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 **MCP Integration**

### Supabase MCP (Heavy Usage)
```bash
# Apply migration
warp mcp run supabase "apply_migration mobile-app-setup 20250125_search_infrastructure CREATE EXTENSION pg_trgm; CREATE TABLE search_history..."

# Test search function
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM search_users('john', auth.uid(), 20, 0)"

# Analyze query performance
warp mcp run supabase "execute_sql mobile-app-setup EXPLAIN ANALYZE SELECT * FROM search_users('test', auth.uid(), 20, 0)"

# Check indexes
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM pg_indexes WHERE tablename = 'profiles'"
```

### Context7 MCP (Medium Usage)
```bash
# Analyze existing search code
warp mcp run context7 "analyze src/services/searchService.ts"

# Find usage of search components
warp mcp run context7 "find usage of SearchBar component"
```

### Puppeteer MCP (E2E Testing)
```bash
# Test search flow
warp mcp run puppeteer "navigate to http://localhost:5173/search, fill search bar with 'john', verify results appear"

# Test fuzzy matching
warp mcp run puppeteer "search for 'jon' with typo, verify fuzzy matching works"
```

---

## ✅ **Definition of Done**

- [ ] All 22 acceptance criteria met
- [ ] Database migration applied successfully
- [ ] All functions tested with SQL queries
- [ ] Service layer implemented with error handling
- [ ] React hooks created with React Query
- [ ] UI components built and tested
- [ ] Unit tests written (>80% coverage)
- [ ] E2E tests pass
- [ ] Performance test: < 50ms query time
- [ ] RLS security verified
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## 📚 **Related Documentation**

- [Epic 9.2 Overview](../epics/EPIC_9.2_Friend_Discovery_Search.md)
- [Story 9.1.2 - Friendships Table](./STORY_9.1.2_Bidirectional_Friendships.md)
- [Story 9.1.5 - Blocking System](./STORY_9.1.5_Blocking_System.md)

---

**Next Story:** [STORY 9.2.2 - People You May Know Engine](./STORY_9.2.2_PYMK_Engine.md)
