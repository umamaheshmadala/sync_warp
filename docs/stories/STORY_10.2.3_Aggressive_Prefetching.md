# 📝 STORY 10.2.3: Aggressive Prefetching Logic

**Story Owner:** Frontend Engineering  
**Epic:** [Epic 10.2: Local-First Architecture](../epics/EPIC_10.2_Local_First_Architecture.md)  
**Status:** 📝 **PLANNING**  
**Priority:** Medium (After 10.2.2)

---

## 🎯 **Goal**

Pre-load likely next screens based on user behavior patterns, achieving **zero-latency navigation** by having data ready before the user taps.

**Effect:** When the user navigates to a new screen, the data is *already cached*. No loading spinner, instant content.

---

## 📋 **Implementation Tasks**

### 1. **Smart AppDataPrefetcher Enhancement**
- [ ] Update `src/components/AppDataPrefetcher.tsx` to prioritize data based on user context.
- [ ] Implement priority queue for prefetch requests.
- [ ] Add idle detection to prefetch during user inactivity.

```typescript
// Prefetch priorities
const PREFETCH_PRIORITIES = {
  CRITICAL: 1,    // Current screen data
  HIGH: 2,        // Likely next screens
  MEDIUM: 3,      // Recently visited
  LOW: 4          // Background refresh
};

interface PrefetchItem {
  queryKey: QueryKey;
  priority: number;
  staleTime?: number;
}
```

### 2. **Context-Aware Prefetching Rules**

| User Location | Prefetch Targets | Priority |
|--------------|------------------|----------|
| Chat List | Top 3 active conversation messages | HIGH |
| Chat Conversation | Recipient's profile | MEDIUM |
| Feed/Home | First 5 post details | HIGH |
| Business List | Top 3 business profiles | MEDIUM |
| Business Profile | Products & Offers tabs | HIGH |
| Product View | Related products | LOW |
| Friends List | Top 5 friend profiles | MEDIUM |

### 3. **Hover/Touch-Start Prefetching**
- [ ] Add `onMouseEnter` / `onTouchStart` handlers to navigation links.
- [ ] Prefetch destination data on hover/touch (200ms debounce).
- [ ] Implement for key navigation elements:
  - Chat conversation items
  - Business cards
  - Product cards
  - Friend cards
  - Tab headers

```typescript
// usePrefetchOnHover hook
export function usePrefetchOnHover(
  queryKey: QueryKey,
  queryFn: () => Promise<unknown>,
  options?: { delay?: number }
) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const onMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 30_000 // 30 seconds
      });
    }, options?.delay ?? 200);
  }, [queryKey, queryFn]);
  
  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  return { onMouseEnter, onMouseLeave, onTouchStart: onMouseEnter };
}
```

### 4. **Idle-Time Prefetching**
- [ ] Detect user idle state (no interaction for 5+ seconds).
- [ ] Use `requestIdleCallback` to prefetch stale queries.
- [ ] Respect battery/data saver modes.

```typescript
// useIdlePrefetch hook
export function useIdlePrefetch() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;
    
    const scheduleIdlePrefetch = () => {
      idleTimeout = setTimeout(() => {
        // Use requestIdleCallback if available
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            prefetchStaleQueries(queryClient);
          }, { timeout: 2000 });
        } else {
          prefetchStaleQueries(queryClient);
        }
      }, 5000); // 5 seconds idle
    };
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimeout);
      scheduleIdlePrefetch();
    };
    
    // Listen for user activity
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    
    scheduleIdlePrefetch();
    
    return () => {
      clearTimeout(idleTimeout);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
    };
  }, [queryClient]);
}

function prefetchStaleQueries(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  const staleQueries = cache.findAll({
    predicate: (query) => query.isStale() && !query.isFetching()
  });
  
  // Revalidate top 5 stale queries
  staleQueries.slice(0, 5).forEach(query => {
    queryClient.prefetchQuery({
      queryKey: query.queryKey,
      queryFn: query.options.queryFn
    });
  });
}
```

### 5. **Navigation Prediction**
- [ ] Track navigation patterns per user session.
- [ ] Predict likely next navigation based on history.
- [ ] Prefetch predicted destinations.

```typescript
// Simple navigation predictor
class NavigationPredictor {
  private history: string[] = [];
  private patterns: Map<string, Map<string, number>> = new Map();
  
  recordNavigation(path: string) {
    if (this.history.length > 0) {
      const lastPath = this.history[this.history.length - 1];
      this.updatePattern(lastPath, path);
    }
    this.history.push(path);
  }
  
  predictNext(currentPath: string): string | null {
    const transitions = this.patterns.get(currentPath);
    if (!transitions) return null;
    
    // Return most common next path
    let maxCount = 0;
    let predicted: string | null = null;
    transitions.forEach((count, path) => {
      if (count > maxCount) {
        maxCount = count;
        predicted = path;
      }
    });
    
    return predicted;
  }
  
  private updatePattern(from: string, to: string) {
    if (!this.patterns.has(from)) {
      this.patterns.set(from, new Map());
    }
    const current = this.patterns.get(from)!.get(to) || 0;
    this.patterns.get(from)!.set(to, current + 1);
  }
}
```

### 6. **Bandwidth-Aware Prefetching**
- [ ] Check `navigator.connection` API for network type.
- [ ] Reduce prefetching on slow/metered connections.
- [ ] Respect `navigator.connection.saveData` flag.

```typescript
function shouldPrefetch(): boolean {
  const connection = (navigator as any).connection;
  
  if (!connection) return true; // Assume good connection
  
  // Don't prefetch on save-data mode
  if (connection.saveData) return false;
  
  // Reduce on slow connections
  if (connection.effectiveType === '2g') return false;
  if (connection.effectiveType === 'slow-2g') return false;
  
  return true;
}
```

---

## 📁 **Files to Create/Modify**

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/usePrefetchOnHover.ts` | Hover/touch prefetch hook |
| `src/hooks/useIdlePrefetch.ts` | Idle-time prefetch hook |
| `src/lib/navigationPredictor.ts` | Navigation pattern tracking |
| `src/utils/networkUtils.ts` | Bandwidth detection utilities |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/AppDataPrefetcher.tsx` | Add priority queue, context awareness |
| `src/components/messaging/ConversationItem.tsx` | Add hover prefetch |
| `src/components/business/BusinessCard.tsx` | Add hover prefetch |
| `src/components/products/ProductCard.tsx` | Add hover prefetch |
| `src/components/friends/FriendCard.tsx` | Add hover prefetch |

---

## 🧪 **Testing Strategy**

### Performance Testing
- [ ] Measure Time to Interactive (TTI) for navigations.
- [ ] Compare with/without prefetching enabled.
- [ ] Monitor network waterfall in DevTools.

### Manual Testing
| Test | Expected Result |
|------|-----------------|
| Hover over chat item for 300ms | Messages prefetched (check Network tab) |
| Navigate to prefetched chat | Instant content, no loading spinner |
| Leave app idle for 10s | Stale queries refresh in background |
| Enable mobile data saver | Prefetching reduced/disabled |

### Metrics to Track
- Cache hit rate (prefetched vs. fresh fetches)
- Average navigation latency (ms)
- Data prefetched vs. data used ratio
- Battery impact (mobile)

---

## 🛑 **Risks & Mitigations**

| Risk | Mitigation |
|------|------------|
| Over-fetching wastes bandwidth | Limit to 5 concurrent prefetches |
| Battery drain on mobile | Use `requestIdleCallback`, respect saveData |
| Cache bloat | Set aggressive staleTime, limit cache size |
| Prefetch racing with user | Cancel on navigation start |

---

## ✅ **Acceptance Criteria**

- [ ] Hover/touch prefetching works on key navigation elements
- [ ] Context-aware prefetching based on current screen
- [ ] Idle-time revalidation of stale data
- [ ] Bandwidth-aware (respects saveData mode)
- [ ] No visible performance regression
- [ ] Cache hit rate > 60% for navigations
- [ ] Documentation updated

---

## 📝 **Notes**

- Start with chat conversations (highest impact)
- Measure before/after for clear metrics
- Consider A/B testing prefetch strategies
- Watch for rate limiting from Supabase
- Memory usage should be monitored on low-end devices
