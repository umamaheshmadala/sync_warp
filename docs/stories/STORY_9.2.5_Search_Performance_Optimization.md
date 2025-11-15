# ⚡ STORY 9.2.5: Search Performance Optimization

**Epic:** [EPIC 9.2 - Friend Discovery & Search](../epics/EPIC_9.2_Friend_Discovery_Search.md)  
**Story ID:** 9.2.5  
**Priority:** 🔴 High  
**Estimate:** 2 days  
**Status:** 📋 Ready for Development  
**Dependencies:** Story 9.2.1, 9.2.4

---

## 📋 **Story Description**

As a SynC platform engineer, I need to **optimize search query performance** to ensure fast, responsive search experiences at scale. This includes database indexing, query optimization, and performance monitoring.

**User Value:**  
Fast search results (< 50ms p95) provide a seamless user experience, even with large user bases and complex filters.

---

## 🎯 **Acceptance Criteria**

### Database Optimization
- [ ] **AC 9.2.5.1**: Composite indexes created for:
  - `(full_name, username)` with GIN text search
  - `(location, created_at)`
  - `(mutual_friends_count, relevance_score)`
- [ ] **AC 9.2.5.2**: Partial indexes for frequently filtered data
- [ ] **AC 9.2.5.3**: `VACUUM ANALYZE` scheduled weekly
- [ ] **AC 9.2.5.4**: Query execution plan analyzed with `EXPLAIN ANALYZE`

### Query Performance
- [ ] **AC 9.2.5.5**: Base search query: < 50ms (p95)
- [ ] **AC 9.2.5.6**: Filtered search query: < 100ms (p95)
- [ ] **AC 9.2.5.7**: PYMK query: < 150ms (p95)
- [ ] **AC 9.2.5.8**: Search result caching (30-second TTL)

### Monitoring & Load Testing
- [ ] **AC 9.2.5.9**: Performance monitoring dashboard created
- [ ] **AC 9.2.5.10**: Load test simulates 1000 concurrent searches
- [ ] **AC 9.2.5.11**: Slow query logging (> 500ms) enabled
- [ ] **AC 9.2.5.12**: Query performance alerts configured

### Code Optimization
- [ ] **AC 9.2.5.13**: React Query caching tuned (staleTime, cacheTime)
- [ ] **AC 9.2.5.14**: Debounce optimized (300ms)
- [ ] **AC 9.2.5.15**: Result pagination implemented (20 results per page)

---

## 🛠️ **Technical Specification**

### Database Migration: `20250129_search_optimization.sql`

```sql
-- ============================================
-- SEARCH PERFORMANCE OPTIMIZATION
-- Story 9.2.5: Search Performance Optimization
-- ============================================

-- Composite index for name search (GIN for full-text)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_fulltext_name 
ON users USING GIN (to_tsvector('english', full_name || ' ' || username));

-- Composite index for location + timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location_created 
ON users (location, created_at DESC);

-- Partial index for active users only (reduces index size)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
ON users (id, full_name, username) 
WHERE deleted_at IS NULL;

-- Index for mutual friends count (used in sorting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friendships_user_ids 
ON friendships (user1_id, user2_id) 
WHERE status = 'accepted';

-- Index for PYMK scoring factors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location_interests 
ON users (location, interests) 
WHERE deleted_at IS NULL;

-- Index for contact sync
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_hashes_hash 
ON contact_hashes (contact_hash);

-- Index for deal categories (used in shared interests filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_category_active 
ON deals (category) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorite_deals_composite 
ON favorite_deals (user_id, deal_id, created_at DESC);

-- ============================================
-- QUERY OPTIMIZATION: Rewrite search_users function with better performance
-- ============================================

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
  -- Get current user's location once (performance optimization)
  SELECT coordinates INTO current_user_location
  FROM users
  WHERE id = current_user_id;

  RETURN QUERY
  WITH matching_users AS (
    -- Use full-text search index (much faster than ILIKE)
    SELECT 
      u.id,
      u.full_name,
      u.username,
      u.avatar_url,
      u.location,
      -- Text search ranking (0-1)
      ts_rank(
        to_tsvector('english', u.full_name || ' ' || u.username),
        plainto_tsquery('english', search_query)
      ) AS text_rank
    FROM users u
    WHERE 
      u.id != current_user_id
      AND u.deleted_at IS NULL
      AND to_tsvector('english', u.full_name || ' ' || u.username) @@ plainto_tsquery('english', search_query)
    LIMIT 100 -- Limit early for performance
  ),
  user_scores AS (
    SELECT
      mu.id,
      mu.full_name,
      mu.username,
      mu.avatar_url,
      mu.location,
      -- Mutual friends count (subquery optimized with index)
      (
        SELECT COUNT(*)::INT
        FROM friendships f1
        JOIN friendships f2 ON f1.user2_id = f2.user2_id
        WHERE f1.user1_id = current_user_id
          AND f2.user1_id = mu.id
          AND f1.status = 'accepted'
          AND f2.status = 'accepted'
      ) AS mutual_friends_count,
      -- Distance calculation (uses PostGIS)
      CASE 
        WHEN current_user_location IS NOT NULL AND u2.coordinates IS NOT NULL
        THEN ST_Distance(current_user_location, u2.coordinates) / 1000.0 -- meters to km
        ELSE NULL
      END AS distance_km,
      -- Relevance scoring
      (
        -- Text match (50% weight)
        (mu.text_rank * 50) +
        -- Mutual friends bonus (30% weight, max 10 friends)
        (LEAST((
          SELECT COUNT(*)::INT
          FROM friendships f1
          JOIN friendships f2 ON f1.user2_id = f2.user2_id
          WHERE f1.user1_id = current_user_id
            AND f2.user1_id = mu.id
            AND f1.status = 'accepted'
            AND f2.status = 'accepted'
        ), 10) * 3) +
        -- Location proximity bonus (20% weight, max 50km)
        CASE 
          WHEN current_user_location IS NOT NULL AND u2.coordinates IS NOT NULL
          THEN GREATEST(0, 20 - (ST_Distance(current_user_location, u2.coordinates) / 2500.0))
          ELSE 0
        END
      ) AS relevance_score
    FROM matching_users mu
    LEFT JOIN users u2 ON u2.id = mu.id
  )
  SELECT *
  FROM user_scores
  ORDER BY relevance_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MAINTENANCE: Schedule VACUUM ANALYZE
-- ============================================

-- Note: This requires pg_cron extension (enabled in Supabase)
-- Schedule weekly VACUUM ANALYZE on Sundays at 2 AM
SELECT cron.schedule(
  'weekly-search-vacuum',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$VACUUM ANALYZE users, friendships, contact_hashes, deals, favorite_deals;$$
);

-- ============================================
-- MONITORING: Create slow query logging view
-- ============================================

CREATE OR REPLACE VIEW slow_search_queries AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%search_users%'
  AND mean_exec_time > 500 -- Queries slower than 500ms
ORDER BY mean_exec_time DESC;
```

### Service Layer: Update `src/services/searchService.ts`

```typescript
/**
 * Search Service - Performance Optimized
 * Story 9.2.5: Search Performance Optimization
 */

// Add result caching
const SEARCH_CACHE_TTL = 30000; // 30 seconds

/**
 * Search users with client-side caching
 */
export async function searchUsers(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Use optimized search function
  const { data, error } = await supabase.rpc('search_users', {
    search_query: query.trim(),
    current_user_id: user.id,
    limit_count: options.limit || 20,
    offset_count: options.offset || 0,
  });

  if (error) {
    console.error('Search error:', error);
    throw new Error('Search failed. Please try again.');
  }

  // Save to history (async, non-blocking)
  saveSearchQuery(query.trim()).catch(console.error);

  return data || [];
}

/**
 * Performance monitoring: Log slow searches
 */
export async function logSlowSearch(
  query: string,
  duration: number,
  resultCount: number
): Promise<void> {
  if (duration > 500) {
    // Log to monitoring service (e.g., Sentry, LogRocket)
    console.warn('Slow search detected', {
      query,
      duration,
      resultCount,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### React Hook: Update `src/hooks/useSearch.ts`

```typescript
/**
 * Search Hook - Performance Optimized
 * Story 9.2.5: Search Performance Optimization
 */

import { useQuery } from '@tanstack/react-query';
import { searchUsers, logSlowSearch } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Optimized search hook with performance monitoring
 */
export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300); // Optimized debounce
  
  return useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      const startTime = performance.now();
      const results = await searchUsers(debouncedQuery);
      const duration = performance.now() - startTime;
      
      // Log slow searches
      logSlowSearch(debouncedQuery, duration, results.length);
      
      return results;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds (matches cache TTL)
    gcTime: 60000, // 1 minute (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
```

---

## 🎯 **MCP Integration**

### Supabase MCP

```bash
# Apply optimization migration
warp mcp run supabase "apply_migration mobile-app-setup 20250129_search_optimization ..."

# Analyze query performance
warp mcp run supabase "execute_sql mobile-app-setup EXPLAIN ANALYZE SELECT * FROM search_users('john', auth.uid(), 20, 0)"

# Check index usage
warp mcp run supabase "execute_sql mobile-app-setup SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes WHERE tablename IN ('users', 'friendships', 'contact_hashes') ORDER BY idx_scan DESC"

# View slow queries
warp mcp run supabase "execute_sql mobile-app-setup SELECT * FROM slow_search_queries"

# Manual VACUUM ANALYZE
warp mcp run supabase "execute_sql mobile-app-setup VACUUM ANALYZE users, friendships, contact_hashes, deals, favorite_deals"
```

### Puppeteer MCP (Load Testing)

```bash
# Load test: 1000 concurrent searches
warp mcp run puppeteer "navigate to search page, run load test with 1000 concurrent searches, measure p95 latency"

# Performance test: search with filters
warp mcp run puppeteer "navigate to search, apply all filters, measure response time, verify < 100ms"
```

### Context7 MCP (Code Analysis)

```bash
# Analyze search service performance
warp mcp run context7 "analyze src/services/searchService.ts for performance bottlenecks"

# Review React Query configuration
warp mcp run context7 "analyze src/hooks/useSearch.ts caching strategy"
```

---

## 📊 **Performance Metrics**

### Target Metrics (Post-Optimization)
| Query Type | p50 | p95 | p99 |
|------------|-----|-----|-----|
| Base Search | < 30ms | < 50ms | < 100ms |
| Filtered Search | < 60ms | < 100ms | < 200ms |
| PYMK Query | < 100ms | < 150ms | < 250ms |

### Database Index Efficiency
- **Full-text search**: 10x faster with GIN index
- **Location filtering**: 5x faster with composite index
- **Mutual friends**: 3x faster with friendship index

### React Query Caching
- **Cache hit rate**: > 60% (30-second staleTime)
- **Network requests**: -40% reduction
- **Perceived latency**: -50% (instant from cache)

---

## 🔍 **Monitoring Dashboard**

Create a performance monitoring dashboard (e.g., using Grafana, Supabase Dashboard, or custom):

**Metrics to Track:**
1. Search query latency (p50, p95, p99)
2. Cache hit rate
3. Slow query count (> 500ms)
4. Concurrent search count
5. Index usage statistics
6. Database connection pool usage

---

## ✅ **Definition of Done**

- [ ] All 15 acceptance criteria met
- [ ] Database migration applied with all indexes created
- [ ] Query execution plan analyzed (EXPLAIN ANALYZE)
- [ ] Load test passes (1000 concurrent searches, p95 < 50ms)
- [ ] React Query caching optimized
- [ ] Performance monitoring dashboard created
- [ ] Slow query alerts configured
- [ ] Documentation updated with performance benchmarks
- [ ] Code reviewed and approved

---

## 📚 **Related Documentation**

- [Epic 9.2 Overview](../epics/EPIC_9.2_Friend_Discovery_Search.md)
- [Story 9.2.1 - Global Friend Search](./STORY_9.2.1_Global_Friend_Search.md)
- [Story 9.2.4 - Search Filters](./STORY_9.2.4_Search_Filters_Advanced.md)

---

## 🧪 **Load Testing Script**

```typescript
/**
 * Load Testing Script for Search Performance
 * Run with: node scripts/loadtest-search.js
 */

import { chromium } from 'playwright';

async function loadTest() {
  const CONCURRENT_USERS = 1000;
  const SEARCH_QUERIES = ['john', 'test', 'alice', 'bob', 'charlie'];
  
  console.log(`Starting load test with ${CONCURRENT_USERS} concurrent users...`);
  
  const browsers = await Promise.all(
    Array.from({ length: CONCURRENT_USERS }, () => chromium.launch())
  );
  
  const results = [];
  const startTime = Date.now();
  
  await Promise.all(
    browsers.map(async (browser, i) => {
      const page = await browser.newPage();
      const query = SEARCH_QUERIES[i % SEARCH_QUERIES.length];
      
      const searchStart = Date.now();
      await page.goto('http://localhost:5173/search');
      await page.fill('input[name="search"]', query);
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      const searchEnd = Date.now();
      
      results.push(searchEnd - searchStart);
      await browser.close();
    })
  );
  
  const totalTime = Date.now() - startTime;
  const sortedResults = results.sort((a, b) => a - b);
  
  console.log('Load Test Results:');
  console.log(`Total time: ${totalTime}ms`);
  console.log(`p50: ${sortedResults[Math.floor(results.length * 0.5)]}ms`);
  console.log(`p95: ${sortedResults[Math.floor(results.length * 0.95)]}ms`);
  console.log(`p99: ${sortedResults[Math.floor(results.length * 0.99)]}ms`);
  
  if (sortedResults[Math.floor(results.length * 0.95)] < 50) {
    console.log('✅ Load test PASSED (p95 < 50ms)');
  } else {
    console.log('❌ Load test FAILED (p95 >= 50ms)');
  }
}

loadTest();
```

---

**Next Story:** [STORY 9.2.6 - Deal Sharing Integration](./STORY_9.2.6_Deal_Sharing_Integration.md)
