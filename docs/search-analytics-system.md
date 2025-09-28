# Search Analytics System Documentation

## Overview

The Search Analytics System provides comprehensive tracking and insights for search behavior in the SynC application. It captures user search patterns, performance metrics, and engagement data to help improve the search experience and provide business insights.

## Architecture

### Components

1. **SearchAnalyticsService** (`src/services/searchAnalyticsService.ts`)
   - Core service for tracking search analytics
   - Handles data insertion and retrieval
   - Manages session tracking and user identification

2. **SearchAnalyticsDashboard** (`src/components/SearchAnalyticsDashboard.tsx`)
   - React component for displaying analytics insights
   - Interactive charts and metrics visualization
   - Date range filtering and real-time updates

3. **useSearchAnalytics Hook** (`src/hooks/useSearchAnalytics.ts`)
   - Custom React hooks for analytics integration
   - Three specialized hooks for different use cases
   - State management and error handling

4. **Database Schema** (`database/migrations/008_search_analytics.sql`)
   - PostgreSQL tables and views for data storage
   - Materialized views for performance optimization
   - Row-level security policies

### Data Flow

```
User Search → Search Component → Analytics Tracking → Database → Dashboard
```

1. User performs a search
2. Search component captures the action
3. Analytics service tracks the data
4. Data is stored in PostgreSQL
5. Dashboard displays insights

## Features

### Tracking Capabilities

- **Search Queries**: Track search terms, filters, and results count
- **Search Performance**: Measure search execution time
- **User Interactions**: Track clicks on search results
- **Session Management**: Group searches by user session
- **Filter Usage**: Analyze which filters are most popular

### Analytics Insights

- **Popular Search Terms**: Most searched keywords and phrases
- **Search Success Rate**: Percentage of searches that return results
- **Conversion Rate**: Percentage of successful searches that lead to clicks
- **Peak Usage Hours**: When users search most actively
- **Filter Analytics**: Which filters are used most frequently
- **Search Trends**: Historical search volume and patterns

### Dashboard Features

- **Real-time Metrics**: Live search statistics and KPIs
- **Interactive Charts**: Visual representation of search data
- **Date Range Filtering**: Analyze data for specific time periods
- **Responsive Design**: Works on desktop and mobile devices
- **Export Capabilities**: Download insights for further analysis

## Implementation Guide

### 1. Database Setup

Run the migration to create the necessary tables and views:

```sql
-- Run the migration file
\i database/migrations/008_search_analytics.sql
```

This creates:
- `search_analytics` table for raw data
- `popular_search_terms` materialized view
- Various analytical views for insights
- RLS policies for data security

### 2. Service Integration

The analytics service is already integrated into the Search component:

```typescript
// In Search.tsx
import { useSearchTracking } from '../hooks/useSearchAnalytics';

const { trackSearch, trackResultClick } = useSearchTracking();

// Track searches
await trackSearch({
  searchTerm: query,
  filters: search.filters,
  resultsCount: search.totalResults,
  searchTimeMs: searchTimeMs
});

// Track result clicks
await trackResultClick({
  searchTerm: search.query,
  resultId: resultId,
  resultType: 'business' // or 'coupon'
});
```

### 3. Dashboard Access

The analytics dashboard is available at `/analytics/search` and requires authentication.

### 4. Hook Usage

Three hooks are available depending on your needs:

```typescript
// Full analytics functionality
const analytics = useSearchAnalytics();

// Tracking only (lightweight)
const { trackSearch, trackResultClick } = useSearchTracking();

// Dashboard data only
const { insights, trends } = useSearchInsights(dateRange);
```

## Database Schema

### Main Table

```sql
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    search_term TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER NOT NULL DEFAULT 0,
    clicked_result_id UUID NULL,
    clicked_result_type TEXT CHECK (clicked_result_type IN ('business', 'coupon')),
    search_time_ms INTEGER DEFAULT 0,
    session_id TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Views

- `popular_search_terms`: Materialized view of trending search terms
- `search_insights_30d`: 30-day analytics summary
- `search_by_hour`: Hourly search distribution
- `search_trends_daily`: Daily search trends
- `filter_usage_stats`: Filter usage analytics

## API Reference

### SearchAnalyticsService Methods

#### `trackSearch(params)`
Records a search query with metadata.

**Parameters:**
- `searchTerm: string` - The search query
- `filters?: Record<string, any>` - Applied filters
- `resultsCount: number` - Number of results returned
- `searchTimeMs: number` - Search execution time
- `userId?: string` - User ID (optional)

#### `trackResultClick(params)`
Records when a user clicks on a search result.

**Parameters:**
- `searchTerm: string` - The original search query
- `resultId: string` - ID of clicked result
- `resultType: 'business' | 'coupon'` - Type of result
- `userId?: string` - User ID (optional)

#### `getSearchInsights(dateRange?)`
Returns comprehensive search analytics.

**Returns:** `SearchInsight` object with:
- `total_searches: number`
- `unique_users: number`
- `avg_search_time: number`
- `top_terms: SearchTrend[]`
- `search_success_rate: number`
- `conversion_rate: number`

#### `getPopularSearchTerms(limit?)`
Returns popular search terms with trend data.

#### `getSearchTrends(days?)`
Returns search volume trends over time.

## Security & Privacy

### Row Level Security (RLS)
- Users can only see their own search data
- Admin users can view all analytics
- Anonymous tracking is supported

### Data Retention
- Automatic cleanup of data older than 1 year
- Option to manually clean up via `cleanup_old_search_analytics()`

### Privacy Considerations
- IP addresses are optionally stored
- User agents are tracked for debugging
- Personal search terms are anonymized in aggregate views

## Performance Optimization

### Materialized Views
- `popular_search_terms` is materialized for fast access
- Refresh manually or set up automated refresh jobs

### Indexing
- Optimized indexes on frequently queried columns
- Composite indexes for complex queries

### Caching Strategy
- Service-level caching of insights data
- React Query integration for client-side caching

## Monitoring & Maintenance

### Regular Tasks
1. **Refresh Materialized Views**: Run `refresh_popular_search_terms()` daily
2. **Data Cleanup**: Run `cleanup_old_search_analytics()` monthly
3. **Index Maintenance**: Monitor and rebuild indexes as needed

### Health Checks
- Monitor search tracking success rate
- Check dashboard load times
- Verify data consistency

### Troubleshooting

**Common Issues:**

1. **Analytics not tracking**
   - Check network connectivity
   - Verify user permissions
   - Check browser console for errors

2. **Dashboard loading slowly**
   - Refresh materialized views
   - Check date range filters
   - Monitor database performance

3. **Missing search data**
   - Verify tracking integration
   - Check RLS policies
   - Ensure proper user authentication

## Future Enhancements

### Planned Features
1. **Advanced Filtering**: More granular analytics filters
2. **Export Functionality**: CSV/Excel export of analytics data
3. **Real-time Updates**: WebSocket-based live analytics
4. **Machine Learning**: Search query suggestions and optimization
5. **A/B Testing**: Search result ranking experiments

### Integration Opportunities
1. **Business Intelligence**: Connect to BI tools like Tableau
2. **Marketing Analytics**: Integration with marketing platforms
3. **User Behavior**: Cross-feature analytics correlation
4. **Performance Monitoring**: APM integration for search performance

## Contributing

When adding new analytics features:

1. Update the database schema if needed
2. Extend the service interfaces
3. Add corresponding hook methods
4. Update dashboard components
5. Write tests for new functionality
6. Update this documentation

## Examples

### Basic Search Tracking

```typescript
// Track a search
await trackSearch({
  searchTerm: "pizza restaurants",
  filters: { location: "New York", validOnly: true },
  resultsCount: 15,
  searchTimeMs: 250
});

// Track a result click
await trackResultClick({
  searchTerm: "pizza restaurants",
  resultId: "business-123",
  resultType: "business"
});
```

### Dashboard Integration

```typescript
const SearchPage = () => {
  const { insights, loading } = useSearchInsights({
    start: new Date('2024-01-01'),
    end: new Date()
  });

  if (loading) return <Spinner />;

  return (
    <div>
      <h1>Search Analytics</h1>
      <p>Total Searches: {insights.total_searches}</p>
      <p>Success Rate: {insights.search_success_rate}%</p>
    </div>
  );
};
```

This analytics system provides a solid foundation for understanding user search behavior and optimizing the search experience in the SynC application.