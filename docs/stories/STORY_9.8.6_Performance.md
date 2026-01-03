# Story 9.8.6: Performance Benchmarks & Optimization

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🛢 Supabase MCP (Heavy), 🧠 Context7 MCP (Medium)  
**Dependencies:** Stories 9.8.1-9.8.5, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Measure and optimize performance of all critical operations in the Friends Module. Run Lighthouse audits, optimize Core Web Vitals, and ensure all performance targets are met.

---

## ✅ Acceptance Criteria

### Performance Targets
- [ ] Friends list load: < 300ms (100, 500, 1000 friends)
- [ ] Search response: < 50ms
- [ ] PYMK generation: < 100ms
- [ ] Friend request send: < 200ms
- [ ] Deal sharing: < 300ms

### Lighthouse Audit
- [ ] Performance score > 90
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90

### Core Web Vitals
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] INP (Interaction to Next Paint) < 200ms

### Database Optimization
- [ ] All queries use indexes (no sequential scans)
- [ ] Query execution time < 50ms
- [ ] Connection pool properly configured
- [ ] Prepared statements used

---

## 🎨 Implementation

### Test File Structure

```
src/__tests__/performance/
├── friends-list.perf.test.ts
├── search.perf.test.ts
├── pymk.perf.test.ts
├── database-queries.perf.test.ts
└── lighthouse.test.ts

scripts/
├── benchmark-friends.ts
├── lighthouse-audit.ts
└── analyze-bundle.ts
```

### Example Test: friends-list.perf.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Friends List Performance', () => {
  it('should load 100 friends in < 300ms', async () => {
    const start = performance.now();

    const friends = await getFriends({ limit: 100 });

    const end = performance.now();
    const duration = end - start;

    expect(friends).toHaveLength(100);
    expect(duration).toBeLessThan(300);

    console.log(`✓ Loaded 100 friends in ${duration.toFixed(2)}ms`);
  });

  it('should load 500 friends in < 300ms', async () => {
    const start = performance.now();

    const friends = await getFriends({ limit: 500 });

    const end = performance.now();
    const duration = end - start;

    expect(friends).toHaveLength(500);
    expect(duration).toBeLessThan(300);

    console.log(`✓ Loaded 500 friends in ${duration.toFixed(2)}ms`);
  });

  it('should load 1000 friends in < 300ms', async () => {
    const start = performance.now();

    const friends = await getFriends({ limit: 1000 });

    const end = performance.now();
    const duration = end - start;

    expect(friends).toHaveLength(1000);
    expect(duration).toBeLessThan(300);

    console.log(`✓ Loaded 1000 friends in ${duration.toFixed(2)}ms`);
  });

  it('should render friends list without layout shift', async () => {
    const { container } = render(<FriendsList friends={mockFriends} />);

    // Measure CLS
    const cls = await measureCLS(container);

    expect(cls).toBeLessThan(0.1);
  });
});
```

### Example Test: search.perf.test.ts

```typescript
import { describe, it, expect } from 'vitest';

describe('Search Performance', () => {
  it('should return search results in < 50ms', async () => {
    const start = performance.now();

    const results = await searchUsers('John');

    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(50);
    console.log(`✓ Search completed in ${duration.toFixed(2)}ms`);
  });

  it('should handle fuzzy search efficiently', async () => {
    const start = performance.now();

    const results = await searchUsers('Jon Doe'); // Typo

    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(100);
    expect(results.length).toBeGreaterThan(0);
  });
});
```

### Database Query Performance

```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT p.*
FROM profiles p
JOIN friendships f ON f.friend_id = p.id
WHERE f.user_id = 'test-user-id'
  AND f.status = 'active'
ORDER BY p.full_name
LIMIT 100;

-- Expected: Execution time < 50ms, uses index scan

-- Test search query performance
EXPLAIN ANALYZE
SELECT * FROM search_users('john', 'test-user-id', 20);

-- Expected: Execution time < 50ms, uses GIN index

-- Test PYMK query performance
EXPLAIN ANALYZE
SELECT * FROM get_friend_recommendations('test-user-id', 10);

-- Expected: Execution time < 100ms
```

### Lighthouse Audit Script

```typescript
// scripts/lighthouse-audit.ts
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runLighthouseAudit() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  const options = {
    logLevel: 'info',
    output: 'html',
    port: chrome.port,
  };

  const urls = [
    'http://localhost:5173/friends',
    'http://localhost:5173/friends/search',
    'http://localhost:5173/friends/requests',
  ];

  for (const url of urls) {
    const runnerResult = await lighthouse(url, options);

    const { lhr } = runnerResult;

    console.log(`\n=== Lighthouse Audit: ${url} ===`);
    console.log(`Performance: ${lhr.categories.performance.score * 100}`);
    console.log(`Accessibility: ${lhr.categories.accessibility.score * 100}`);
    console.log(`Best Practices: ${lhr.categories['best-practices'].score * 100}`);
    console.log(`SEO: ${lhr.categories.seo.score * 100}`);

    // Core Web Vitals
    console.log(`\nCore Web Vitals:`);
    console.log(`LCP: ${lhr.audits['largest-contentful-paint'].displayValue}`);
    console.log(`FID: ${lhr.audits['max-potential-fid'].displayValue}`);
    console.log(`CLS: ${lhr.audits['cumulative-layout-shift'].displayValue}`);

    // Assert scores
    expect(lhr.categories.performance.score).toBeGreaterThan(0.9);
    expect(lhr.categories.accessibility.score).toBeGreaterThan(0.9);
  }

  await chrome.kill();
}

runLighthouseAudit();
```

### Bundle Size Analysis

```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer

# Check for large dependencies
npx depcheck

# Analyze tree-shaking
npx webpack-bundle-analyzer dist/stats.json
```

---

## 🎯 MCP Integration

### Supabase MCP Commands

```bash
# Test query performance
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM friendships WHERE user_id = 'test-id'"

# Check index usage
warp mcp run supabase "execute_sql SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public'"

# Analyze slow queries
warp mcp run supabase "execute_sql SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10"
```

### Context7 MCP Commands

```bash
# Find performance bottlenecks
warp mcp run context7 "analyze performance bottlenecks in src/services/friendsService.ts"

# Find large dependencies
warp mcp run context7 "list dependencies by size"

# Find unused code
warp mcp run context7 "find dead code in src/"
```

---

## 📦 Deliverables

1. **Performance Test Files:**
   - `src/__tests__/performance/friends-list.perf.test.ts`
   - `src/__tests__/performance/search.perf.test.ts`
   - `src/__tests__/performance/pymk.perf.test.ts`
   - `src/__tests__/performance/database-queries.perf.test.ts`

2. **Audit Scripts:**
   - `scripts/lighthouse-audit.ts`
   - `scripts/benchmark-friends.ts`
   - `scripts/analyze-bundle.ts`

3. **Reports:**
   - Lighthouse audit HTML reports
   - Performance benchmark results
   - Bundle size analysis
   - Database query performance report

---

## 📈 Success Metrics

- **All Performance Targets Met:** 100%
- **Lighthouse Scores:** > 90 for all categories
- **Core Web Vitals:** All green
- **Database Queries:** All using indexes

---

**Next Story:** [STORY 9.8.7: RLS Security Audit & Penetration Testing](./STORY_9.8.7_Security_Audit.md)
