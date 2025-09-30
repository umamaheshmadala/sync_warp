# Phase 4: Performance Optimization & Monitoring

## Executive Summary

Phase 4 focuses on optimizing application performance through monitoring, code splitting, caching strategies, and best practices implementation. This phase establishes a foundation for continuous performance improvement and monitoring.

---

## ✅ Completed: Performance Monitoring Infrastructure

### 1. Web Vitals Integration

**Installed Package**: `web-vitals` for tracking Core Web Vitals

**Core Metrics Tracked**:
- **LCP** (Largest Contentful Paint) - Loading performance
- **FID** (First Input Delay) - Interactivity
- **CLS** (Cumulative Layout Shift) - Visual stability
- **FCP** (First Contentful Paint) - Initial render
- **TTFB** (Time to First Byte) - Server response time

### 2. Performance Monitoring Utility

**File**: `src/utils/performanceMonitoring.ts`

**Features**:
```typescript
// Core functionality
- Track Web Vitals automatically
- Custom metric tracking
- Async operation measurement
- Performance mark & measure API integration
- Metric statistics and reporting
- Real-time metric subscriptions
- Analytics integration ready

// Usage examples
trackMetric('api-response', 150, 'ms', { endpoint: '/api/coupons' });
await measureAsync('fetch-coupons', () => fetchCoupons());
performanceMonitor.logReport();
```

**Key Capabilities**:
- ✅ Automatic Web Vitals collection
- ✅ Custom metric tracking
- ✅ Function execution timing
- ✅ Performance marks and measures
- ✅ Metric aggregation and statistics
- ✅ Development mode logging
- ✅ Production analytics integration
- ✅ Subscription-based updates

### 3. Performance Hooks

**File**: `src/hooks/usePerformance.ts`

**Available Hooks**:

```typescript
// Component render performance
useRenderPerformance('MyComponent')

// Async operation measurement  
const { measureAsync, trackMetric } = usePerformanceMeasure()

// Real-time metrics tracking
const { metrics, customMetrics, getReport } = usePerformanceMetrics()

// Page/route performance
usePagePerformance('DashboardPage')

// API call tracking
const { trackAPICall } = useAPIPerformance()

// Component lifecycle tracking
useLifecyclePerformance('ExpensiveComponent')

// Image loading performance
const { trackImageLoad } = useImagePerformance()

// Performance budget enforcement
const { violations, hasViolations } = usePerformanceBudget({
  LCP: 2500,
  FID: 100,
  CLS: 0.1,
})
```

---

## 🎯 Code Splitting & Lazy Loading

### Current Implementation

The application already has route-based code splitting implemented:

```typescript
// ✅ Already lazy-loaded components
const NotFound = lazy(() => import('../components/NotFound'))
const Profile = lazy(() => import('../components/Profile'))
const Search = lazy(() => import('../components/Search'))
const Settings = lazy(() => import('../components/Settings'))
const Wallet = lazy(() => import('../components/Wallet'))
const Social = lazy(() => import('../components/Social'))
// ... and many more
```

### Optimization Opportunities

#### 1. Additional Components to Lazy Load

**Should be lazy-loaded**:
```typescript
// Heavy business components
const BusinessRegistration = lazy(() => import('../components/business/BusinessRegistration'))
const BusinessDashboard = lazy(() => import('../components/business/BusinessDashboard'))
const CouponManagerPage = lazy(() => import('../components/business/CouponManagerPage'))

// Social components  
const FriendsManagementPage = lazy(() => import('../components/FriendsManagementPage'))

// Core user components (only if not critical for first paint)
const Dashboard = lazy(() => import('../components/Dashboard'))
const Onboarding = lazy(() => import('../components/Onboarding'))
```

#### 2. Component-Level Code Splitting

For large components with multiple sub-components:

```typescript
// Instead of importing all at once
import { Modal, Dialog, Drawer, Tooltip } from './components/ui'

// Import only what's needed
import Modal from './components/ui/Modal'
```

#### 3. Dynamic Import Patterns

```typescript
// Conditional feature loading
const loadFeature = async (featureName: string) => {
  if (featureName === 'advanced-analytics') {
    const module = await import('./features/advanced-analytics');
    return module.default;
  }
};

// Load on interaction
<button onClick={async () => {
  const { openChat } = await import('./features/chat');
  openChat();
}}>
  Open Chat
</button>
```

### Bundle Size Analysis

**Recommended Commands**:
```bash
# Analyze bundle size
npm run build
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({
    open: true,
    gzipSize: true,
    brotliSize: true,
  })
]
```

---

## 📊 Performance Budget

### Recommended Budgets

```typescript
const PERFORMANCE_BUDGETS = {
  // Web Vitals thresholds
  LCP: 2500, // ms - Good: < 2.5s
  FID: 100,   // ms - Good: < 100ms
  CLS: 0.1,   // score - Good: < 0.1
  FCP: 1800,  // ms - Good: < 1.8s
  TTFB: 600,  // ms - Good: < 600ms

  // Custom metrics
  'page-load': 3000,        // ms
  'api-response': 500,      // ms
  'component-mount': 100,   // ms
  'image-load': 2000,       // ms
};
```

### Implementation

```typescript
// In your app root
function App() {
  const { violations, hasViolations } = usePerformanceBudget({
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 600,
  });

  useEffect(() => {
    if (hasViolations) {
      console.warn('Performance budget violations:', violations);
      // Send to monitoring service
    }
  }, [hasViolations, violations]);

  return <YourApp />;
}
```

---

## 🚀 React Performance Optimization

### 1. React.memo for Expensive Components

```typescript
// Before
export function ExpensiveList({ items }) {
  return <div>{items.map(renderItem)}</div>;
}

// After
export const ExpensiveList = React.memo(function ExpensiveList({ items }) {
  return <div>{items.map(renderItem)}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.items.length === nextProps.items.length;
});
```

### 2. useMemo for Expensive Computations

```typescript
function CouponList({ coupons, filter }) {
  // ✅ Memoize expensive filtering
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => c.type === filter)
      .sort((a, b) => b.discount - a.discount);
  }, [coupons, filter]);

  return <List items={filteredCoupons} />;
}
```

### 3. useCallback for Event Handlers

```typescript
function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  // ✅ Prevent unnecessary re-renders of child components
  const handleSearch = useCallback(() => {
    onSearch(query);
  }, [query, onSearch]);

  return <SearchInput onSubmit={handleSearch} />;
}
```

### 4. Virtual Scrolling for Long Lists

```typescript
import { FixedSizeList } from 'react-window';

function LongCouponList({ coupons }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={coupons.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <CouponCard coupon={coupons[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

## 💾 Caching Strategies

### 1. React Query (Already Implemented!)

The app already uses @tanstack/react-query for data caching:

```typescript
// src/App.tsx
const queryClient = new QueryClient()

// Optimize cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### 2. Service-Level Caching

Already implemented in couponService.ts:

```typescript
// Existing cache implementation
private cache = new Map<string, CachedData>();
private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

fetchCoupons(filters?: CouponFilters, useCache = true) {
  const cacheKey = JSON.stringify(filters);
  
  if (useCache && this.cache.has(cacheKey)) {
    const cached = this.cache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
  }
  
  // Fetch and cache...
}
```

### 3. localStorage Caching

```typescript
// Cache user preferences
const cacheUserPreferences = (prefs: UserPreferences) => {
  localStorage.setItem('user-prefs', JSON.stringify({
    data: prefs,
    timestamp: Date.now(),
    expiry: 24 * 60 * 60 * 1000, // 24 hours
  }));
};

const getCachedPreferences = (): UserPreferences | null => {
  const cached = localStorage.getItem('user-prefs');
  if (!cached) return null;
  
  const { data, timestamp, expiry } = JSON.parse(cached);
  if (Date.now() - timestamp > expiry) {
    localStorage.removeItem('user-prefs');
    return null;
  }
  
  return data;
};
```

---

## 🖼️ Image Optimization

### 1. Lazy Image Loading

```typescript
// Create LazyImage component
function LazyImage({ src, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { trackImageLoad } = useImagePerformance();

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = imgRef.current!;
          const startTime = performance.now();
          
          img.src = src;
          img.onload = () => {
            setLoaded(true);
            const loadTime = performance.now() - startTime;
            trackImageLoad(src, loadTime);
          };
          
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src, trackImageLoad]);

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={loaded ? 'loaded' : 'loading'}
      {...props}
    />
  );
}
```

### 2. Responsive Images

```typescript
<picture>
  <source
    srcSet="/images/coupon-400.webp 400w,
            /images/coupon-800.webp 800w,
            /images/coupon-1200.webp 1200w"
    type="image/webp"
  />
  <img
    src="/images/coupon-800.jpg"
    alt="Coupon"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### 3. Image CDN Integration

```typescript
// Use Cloudinary, Imgix, or similar
const getOptimizedImageUrl = (
  src: string,
  width: number,
  quality = 80
) => {
  return `https://cdn.example.com/${src}?w=${width}&q=${quality}&format=auto`;
};
```

---

## 🗄️ Database Query Optimization

### 1. Supabase Query Optimization

```typescript
// ❌ Inefficient - Multiple queries
const getCouponWithBusiness = async (couponId: string) => {
  const coupon = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single();
    
  const business = await supabase
    .from('businesses')
    .select('*')
    .eq('id', coupon.data.business_id)
    .single();
    
  return { coupon, business };
};

// ✅ Efficient - Single query with join
const getCouponWithBusiness = async (couponId: string) => {
  return await supabase
    .from('coupons')
    .select(`
      *,
      business:businesses(*)
    `)
    .eq('id', couponId)
    .single();
};
```

### 2. Pagination & Limiting

```typescript
// ✅ Always use pagination for large datasets
const getCoupons = async (page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  return await supabase
    .from('coupons')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
};
```

### 3. Database Indexes

**Recommended Indexes** (to be created in Supabase):

```sql
-- Coupons table
CREATE INDEX idx_coupons_business_id ON coupons(business_id);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_valid_dates ON coupons(valid_from, valid_until);
CREATE INDEX idx_coupons_created_at ON coupons(created_at DESC);

-- Businesses table
CREATE INDEX idx_businesses_city ON businesses(city);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_location ON businesses USING GIST (location);

-- User coupons table
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);

-- Search analytics
CREATE INDEX idx_search_analytics_timestamp ON search_analytics(searched_at DESC);
CREATE INDEX idx_search_analytics_query ON search_analytics USING GIN (query gin_trgm_ops);
```

---

## 📈 Performance Monitoring Dashboard

### Usage in Components

```typescript
// Track page performance
function DashboardPage() {
  usePagePerformance('Dashboard');
  useRenderPerformance('Dashboard');
  
  return <div>Dashboard content</div>;
}

// Track API calls
function useCoupons() {
  const { trackAPICall } = useAPIPerformance();
  
  const fetchCoupons = async () => {
    return trackAPICall('/api/coupons', async () => {
      const response = await fetch('/api/coupons');
      return response.json();
    });
  };
  
  return { fetchCoupons };
}

// Monitor component performance
function ExpensiveComponent() {
  const { renderCount } = useRenderPerformance('ExpensiveComponent');
  
  useEffect(() => {
    if (renderCount > 5) {
      console.warn('Component rendering too frequently!');
    }
  }, [renderCount]);
  
  return <div>Content</div>;
}
```

### Accessing Performance Reports

```typescript
// In DevTools console or monitoring dashboard
import { getPerformanceReport } from '@/utils/performanceMonitoring';

// Get full report
const report = getPerformanceReport();
console.log('Performance Report:', report);

// View in formatted console output
import { logPerformanceReport } from '@/utils/performanceMonitoring';
logPerformanceReport();
```

---

## 🎯 Quick Wins & Best Practices

### Immediate Actions

1. **✅ Add React.memo to these components**:
   - CouponCard
   - BusinessCard
   - SearchResultItem
   - MapMarker
   - NotificationItem

2. **✅ Use useMemo for these computations**:
   - Filtered/sorted lists
   - Complex calculations
   - Derived state

3. **✅ Use useCallback for these handlers**:
   - Event handlers passed to child components
   - Debounced functions
   - API calls

4. **✅ Implement virtual scrolling**:
   - Coupon lists (> 50 items)
   - Search results
   - Business directories

5. **✅ Optimize images**:
   - Use WebP format
   - Implement lazy loading
   - Add proper sizing attributes

### Code Review Checklist

- [ ] Are expensive components wrapped in React.memo?
- [ ] Are computed values memoized with useMemo?
- [ ] Are callbacks memoized with useCallback?
- [ ] Are images lazy-loaded and optimized?
- [ ] Are lists virtualized if they have > 50 items?
- [ ] Are database queries using proper joins?
- [ ] Are database queries paginated?
- [ ] Is API response data cached appropriately?
- [ ] Are performance metrics being tracked?
- [ ] Is bundle size analyzed regularly?

---

## 📊 Performance Metrics to Track

### Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤ 2.5s | 2.5s - 4.0s | > 4.0s |
| FID | ≤ 100ms | 100ms - 300ms | > 300ms |
| CLS | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP | ≤ 1.8s | 1.8s - 3.0s | > 3.0s |
| TTFB | ≤ 600ms | 600ms - 1500ms | > 1500ms |

### Custom Metrics

- **Page Load Time**: < 3s (goal)
- **API Response Time**: < 500ms (goal)
- **Component Mount Time**: < 100ms (goal)
- **Image Load Time**: < 2s (goal)
- **Bundle Size**: Monitor and set limits per route

---

## 🔄 Continuous Monitoring

### Development Workflow

1. **Local Monitoring**:
   - Check console for performance logs
   - Use React DevTools Profiler
   - Monitor Network tab
   - Use Lighthouse in Chrome DevTools

2. **Build Analysis**:
   - Analyze bundle size after each build
   - Check for duplicate dependencies
   - Review chunk sizes

3. **Production Monitoring**:
   - Set up Google Analytics with Web Vitals
   - Monitor error rates
   - Track slow API calls
   - Review user experience metrics

---

## 📝 Next Steps

### Phase 4 Remaining Tasks

1. **Optimize React Components**:
   - Add React.memo to identified components
   - Implement useMemo/useCallback
   - Profile and optimize re-renders

2. **Implement Advanced Caching**:
   - Service worker for offline support
   - Advanced React Query configuration
   - IndexedDB for large datasets

3. **Image Optimization**:
   - Lazy loading component
   - Responsive image system
   - CDN integration

4. **Database Optimization**:
   - Create recommended indexes
   - Optimize complex queries
   - Implement query result caching

5. **Monitoring Dashboard**:
   - Create dev-mode performance dashboard
   - Add performance alerts
   - Document performance metrics

---

## 🎉 Summary

Phase 4 has successfully established:

✅ **Complete Performance Monitoring Infrastructure**
- Web Vitals tracking
- Custom metric collection
- React performance hooks
- Performance budget enforcement

✅ **Optimization Guidelines**
- Code splitting best practices
- React optimization patterns
- Caching strategies
- Database query optimization

✅ **Continuous Improvement Process**
- Performance budgets
- Monitoring hooks
- Analysis tools
- Best practice checklist

The application now has a solid foundation for performance monitoring and optimization. All subsequent development can leverage these tools to maintain and improve application performance.

---

**Phase 4 Status**: ✅ **INFRASTRUCTURE COMPLETE** - Ready for implementation

**Date**: January 2025
**Impact**: High - Foundation for all performance improvements
**Priority**: Critical for production readiness