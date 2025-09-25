# Search Inconsistencies Fix

## Issues Found

### 1. **Time-based Filtering Issues**
- The `validOnly: true` filter automatically excludes expired coupons
- "Burger Special - 30% Off" expires Oct 5, 2025
- Current time: 2025-09-25T10:52:28Z (still valid)
- But near expiry date, this coupon may get filtered out

### 2. **Default Filters Always Applied**
- `useSearch.ts` lines 81, 306 always apply:
  - `validOnly: true` 
  - `isPublic: true`
- Even when user doesn't specify filters

### 3. **Empty Query Handling**
- `useSearch.ts` lines 126-140 return empty results for empty queries
- Even when default filters should show public coupons

### 4. **Search Service Mismatch**
- App uses `simpleSearchService` instead of full `searchService`
- Different filtering logic between services

## Root Cause Analysis

The search results differ because:

1. **Date Sensitivity**: Results change based on current date vs coupon expiry
2. **Forced Default Filters**: Always applying filters even for "browse all" scenarios  
3. **Service Inconsistency**: Using simplified service vs comprehensive service
4. **Empty Query Logic**: Returning nothing instead of filtered results

## Recommended Fixes

### Fix 1: Make Default Filters Optional
```typescript
// In useSearch.ts - allow browsing without search term
const hasActiveFilters = Object.values(filters).some(value => 
  value && value !== true // Don't count default true values
);

if (!queryToUse.q.trim() && !hasActiveFilters) {
  // Show recent/popular coupons instead of empty results
}
```

### Fix 2: Consistent Date Handling
```typescript
// Use consistent timezone and date comparison
const now = new Date().toISOString();
query = query.gt('valid_until', now);
```

### Fix 3: Service Alignment
- Either use `searchService` consistently 
- Or enhance `simpleSearchService` to match filtering logic

### Fix 4: Debug Mode
Add search debugging to track what filters are applied:
```typescript
console.log('Search filters applied:', JSON.stringify(filters, null, 2));
console.log('Search query:', queryToUse);
```

## Immediate Actions Needed

1. **Check Current Date Context**: Verify what date the client thinks it is
2. **Add Search Debug Mode**: Log all applied filters and queries
3. **Test with Empty Query**: Ensure browsing works without search terms
4. **Align Service Logic**: Make both search services return consistent results