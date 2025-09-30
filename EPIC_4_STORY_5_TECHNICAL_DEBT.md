# Epic 4 - Story 5: Technical Debt Resolution & Code Quality Improvements

## 📋 Story Overview

**Epic:** 4 - Business Features  
**Story:** 5 - Technical Debt Resolution  
**Priority:** HIGH  
**Estimated Effort:** 10 weeks  
**Status:** 🟡 IN PROGRESS

## 🎯 Story Goals

Based on the comprehensive audit report, this story addresses critical technical debt, security vulnerabilities, and code quality issues that must be resolved before production deployment.

---

## 📦 Tasks Breakdown

### Phase 1: Critical Fixes (Week 1-2) 🔴

#### Task 5.1: Remove Mock Data Fallbacks
**Priority:** 🔴 CRITICAL  
**Estimated:** 3 days  
**Files:**
- `src/services/advancedSearchService.ts`
- `src/services/searchAnalyticsService.ts`

**Subtasks:**
- [ ] Complete coupon analytics database schema
- [ ] Implement real `getTrendingCoupons()` query
- [ ] Implement real `getBusinessCategories()` with counts
- [ ] Remove all mock data functions
- [ ] Add proper error handling without mock fallbacks
- [ ] Test with real database data

**Database Schema:**
```sql
-- Add to migration
CREATE TABLE IF NOT EXISTS coupon_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  used_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  popularity_score NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE coupons 
  ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0;

CREATE INDEX idx_coupon_analytics_popularity 
  ON coupon_analytics(popularity_score DESC);
```

---

#### Task 5.2: Implement Rate Limiting
**Priority:** 🔴 CRITICAL (Security)  
**Estimated:** 2 days  
**Files:**
- New: `src/middleware/rateLimiter.ts`
- Database: Add rate limiting policies

**Subtasks:**
- [ ] Install rate limiting dependencies
- [ ] Create rate limiter middleware
- [ ] Add Supabase RLS policies for rate limiting
- [ ] Implement per-endpoint rate limits
- [ ] Add user-friendly rate limit messages
- [ ] Test rate limiting behavior

**Implementation:**
```typescript
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15min
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const checkinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 check-ins per hour
  message: 'Check-in limit reached. Please try again later.',
});
```

---

#### Task 5.3: Add React Error Boundaries
**Priority:** 🔴 HIGH  
**Estimated:** 2 days  
**Files:**
- New: `src/components/ErrorBoundary.tsx`
- New: `src/components/ErrorFallback.tsx`
- Update: All main route components

**Subtasks:**
- [ ] Create ErrorBoundary component
- [ ] Create ErrorFallback UI component
- [ ] Wrap critical routes with error boundaries
- [ ] Add error logging service integration
- [ ] Add error recovery mechanisms
- [ ] Test error scenarios

---

#### Task 5.4: Increase Test Coverage
**Priority:** 🔴 HIGH  
**Estimated:** 5 days  
**Files:**
- New: Multiple test files across components

**Subtasks:**
- [ ] Add BusinessQRCodePage tests
- [ ] Add BusinessRegistration tests
- [ ] Add BusinessAnalytics tests
- [ ] Add Search service tests
- [ ] Add Coupon management tests
- [ ] Add Product catalog tests
- [ ] Add Authentication flow tests
- [ ] Add Favorites system tests
- [ ] Set up test coverage reporting
- [ ] Target: 60% coverage minimum

---

### Phase 2: Performance & Stability (Week 3-4) 🟡

#### Task 5.5: Fix QR Code Canvas Rendering
**Priority:** 🟡 MEDIUM  
**Estimated:** 3 days  
**Files:**
- `src/components/business/BusinessQRCodePage.tsx`

**Subtasks:**
- [ ] Investigate root cause of canvas failure
- [ ] Rewrite canvas drawing with proper error handling
- [ ] Remove bypass flag
- [ ] Add canvas state validation
- [ ] Consider using fabric.js for canvas operations
- [ ] Add unit tests for canvas rendering
- [ ] Test across different browsers

---

#### Task 5.6: Implement Caching Strategy
**Priority:** 🟡 MEDIUM  
**Estimated:** 3 days  
**Files:**
- New: React Query setup
- Update: All data fetching hooks

**Subtasks:**
- [ ] Install @tanstack/react-query
- [ ] Set up QueryClient configuration
- [ ] Convert data hooks to use React Query
- [ ] Add cache invalidation logic
- [ ] Implement optimistic updates
- [ ] Add loading and error states
- [ ] Test caching behavior

**Implementation:**
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
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

---

#### Task 5.7: Add Image Optimization
**Priority:** 🟡 MEDIUM  
**Estimated:** 2 days  
**Files:**
- New: `src/utils/imageOptimization.ts`
- Update: Image upload components

**Subtasks:**
- [ ] Install image optimization library
- [ ] Create image optimization utility
- [ ] Add lazy loading for images
- [ ] Implement responsive images
- [ ] Add image compression on upload
- [ ] Convert images to WebP format
- [ ] Test image loading performance

---

#### Task 5.8: Standardize Database Types
**Priority:** 🟡 MEDIUM  
**Estimated:** 2 days  
**Files:**
- Database migrations

**Subtasks:**
- [ ] Audit all database column types
- [ ] Create migration to standardize types
- [ ] Update nearby_businesses function
- [ ] Remove unnecessary type casting
- [ ] Test all database functions
- [ ] Update TypeScript interfaces

---

### Phase 3: Enhancements (Week 5+) 🟢

#### Task 5.9: Implement Real Analytics
**Priority:** 🟢 LOW  
**Estimated:** 4 days  
**Files:**
- `src/services/searchAnalyticsService.ts`
- Database: analytics tables

**Subtasks:**
- [ ] Create analytics database schema
- [ ] Implement event tracking
- [ ] Create analytics aggregation jobs
- [ ] Build real-time analytics queries
- [ ] Update analytics dashboard
- [ ] Add export functionality

---

#### Task 5.10: International Phone Support
**Priority:** 🟢 LOW  
**Estimated:** 2 days  
**Files:**
- `src/components/onboarding/Step1BasicInfo.tsx`

**Subtasks:**
- [ ] Install libphonenumber-js
- [ ] Add country selector
- [ ] Implement international validation
- [ ] Update phone formatting
- [ ] Test with various countries
- [ ] Update database schema if needed

---

#### Task 5.11: Advanced Image Handling
**Priority:** 🟢 LOW  
**Estimated:** 3 days  
**Files:**
- Image upload components
- CDN integration

**Subtasks:**
- [ ] Set up CDN (Cloudflare/CloudFront)
- [ ] Implement CDN upload
- [ ] Add image resizing pipeline
- [ ] Implement progressive image loading
- [ ] Add image placeholder generation
- [ ] Test CDN performance

---

## 📊 Success Metrics

### Code Quality
- [ ] Test Coverage: 5% → 80%
- [ ] Mock Data Usage: High → Zero
- [ ] Bypass Flags: 2 → Zero
- [ ] ESLint Errors: ? → Zero

### Performance
- [ ] API Response Time: Unknown → <200ms
- [ ] Image Load Time: Unoptimized → <1s
- [ ] Cache Hit Rate: 0% → >70%
- [ ] Lighthouse Score: ? → >90

### Security
- [ ] Rate Limiting: None → All endpoints
- [ ] Error Handling: Basic → Comprehensive
- [ ] Input Validation: Partial → Complete
- [ ] Security Audit: Not done → Passed

### User Experience
- [ ] Error Recovery: None → Automatic
- [ ] Loading States: Inconsistent → Consistent
- [ ] Offline Support: None → Basic
- [ ] Accessibility Score: ? → >95

---

## 🔧 Technical Implementation Plan

### Dependencies to Add
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "express-rate-limit": "^7.0.0",
    "libphonenumber-js": "^1.10.0",
    "react-lazy-load-image-component": "^1.6.0",
    "fabric": "^5.3.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^1.0.0",
    "msw": "^2.0.0"
  }
}
```

### Database Migrations Needed
1. `20250130_add_coupon_analytics.sql`
2. `20250130_add_rate_limiting_policies.sql`
3. `20250130_standardize_column_types.sql`
4. `20250130_add_analytics_tables.sql`

### New Files to Create
```
src/
  components/
    ErrorBoundary.tsx
    ErrorFallback.tsx
    __tests__/
      [Multiple test files]
  middleware/
    rateLimiter.ts
  utils/
    imageOptimization.ts
    errorTracking.ts
  lib/
    queryClient.ts
```

---

## 🚀 Deployment Checklist

### Pre-Production
- [ ] All Phase 1 tasks completed
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Error tracking integrated
- [ ] Monitoring dashboards created

### Production Deployment
- [ ] Run all migrations
- [ ] Deploy rate limiting
- [ ] Enable error boundaries
- [ ] Activate caching layer
- [ ] Monitor for issues

### Post-Production
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review security logs
- [ ] Gather user feedback
- [ ] Plan Phase 2 deployment

---

## 📝 Testing Strategy

### Unit Tests
- Business logic in services
- Utility functions
- React hooks
- Database functions

### Integration Tests
- API endpoints with rate limiting
- Database queries
- Authentication flows
- Cache behavior

### E2E Tests
- Critical user journeys
- Business registration
- Check-in flow
- QR code generation

### Performance Tests
- Load testing with rate limits
- Cache hit rate validation
- Image load performance
- Database query performance

---

## 🐛 Known Issues & Risks

### High Risk
1. **Canvas rendering fix** - May require significant refactoring
2. **Rate limiting** - Could impact legitimate users
3. **Cache invalidation** - Complex scenarios need testing

### Medium Risk
1. **Database type changes** - Requires careful migration
2. **Test coverage** - Time-consuming to achieve 80%
3. **Image optimization** - May need CDN costs

### Low Risk
1. **Phone formatting** - Isolated change
2. **Analytics** - Non-critical feature
3. **Error boundaries** - Well-documented pattern

---

## 📈 Progress Tracking

### Week 1-2: Critical Fixes
- [ ] Day 1-3: Remove mock data
- [ ] Day 4-5: Add rate limiting
- [ ] Day 6-7: Error boundaries
- [ ] Day 8-10: Start test coverage

### Week 3-4: Performance
- [ ] Day 11-13: Fix QR code canvas
- [ ] Day 14-16: Implement caching
- [ ] Day 17-18: Image optimization
- [ ] Day 19-20: Database cleanup

### Week 5+: Enhancements
- [ ] Week 5: Real analytics
- [ ] Week 6: International features
- [ ] Week 7: Advanced images
- [ ] Week 8-10: Testing & refinement

---

## 🎓 Learnings & Best Practices

### Avoid in Future
- ❌ Mock data fallbacks in production code
- ❌ Bypassing complex features instead of fixing
- ❌ Deploying without rate limiting
- ❌ Skipping error boundaries
- ❌ Ignoring test coverage

### Follow Moving Forward
- ✅ Write tests alongside features
- ✅ Add error boundaries by default
- ✅ Implement caching from start
- ✅ Use proper libraries for complex tasks
- ✅ Regular code audits

---

## 📚 References

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Rate Limiting Best Practices](https://www.npmjs.com/package/express-rate-limit)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)

---

**Story Created:** 2025-01-30  
**Target Completion:** 2025-04-15 (10 weeks)  
**Owner:** Development Team  
**Reviewer:** Tech Lead

---

*This story will be tracked in the project management system with individual tasks assigned to team members.*