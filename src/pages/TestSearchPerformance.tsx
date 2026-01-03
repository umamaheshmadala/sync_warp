/**
 * Performance Test Page for Story 9.2.5
 * Tests search performance optimizations with metrics display
 */

import React, { useState } from 'react';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';

export function TestSearchPerformance() {
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<Array<{
    query: string;
    duration: number;
    resultCount: number;
    timestamp: number;
  }>>([]);

  const { data, isLoading, error, isFetching } = useOptimizedSearch(query);

  // Track search in history when data changes
  React.useEffect(() => {
    if (data && data.results) {
      setSearchHistory(prev => [
        {
          query: query,
          duration: data.duration,
          resultCount: data.results.length,
          timestamp: data.timestamp,
        },
        ...prev.slice(0, 9), // Keep last 10 searches
      ]);
    }
  }, [data, query]);

  // Calculate performance metrics
  const avgDuration = searchHistory.length > 0
    ? searchHistory.reduce((sum, s) => sum + s.duration, 0) / searchHistory.length
    : 0;

  const p95Duration = searchHistory.length > 0
    ? [...searchHistory].sort((a, b) => a.duration - b.duration)[Math.floor(searchHistory.length * 0.95)]?.duration || 0
    : 0;

  const p99Duration = searchHistory.length > 0
    ? [...searchHistory].sort((a, b) => a.duration - b.duration)[Math.floor(searchHistory.length * 0.99)]?.duration || 0
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Story 9.2.5: Search Performance Test
          </h1>
          <p className="text-gray-600 mt-2">
            Testing optimized search with GIN index, React Query caching, and performance monitoring
          </p>
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query (300ms debounce)
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search (min 2 characters)..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
          />
          {isFetching && (
            <p className="text-sm text-gray-500 mt-2">Searching...</p>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Latest Duration</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {data ? `${Math.round(data.duration)}ms` : '-'}
            </div>
            <div className={`text-sm mt-1 ${data && data.duration < 50 ? 'text-green-600' : data && data.duration < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
              Target: &lt; 50ms
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Average (p50)</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {searchHistory.length > 0 ? `${Math.round(avgDuration)}ms` : '-'}
            </div>
            <div className={`text-sm mt-1 ${avgDuration < 50 ? 'text-green-600' : avgDuration < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
              Target: &lt; 50ms
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">p95 Latency</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {searchHistory.length > 0 ? `${Math.round(p95Duration)}ms` : '-'}
            </div>
            <div className={`text-sm mt-1 ${p95Duration < 50 ? 'text-green-600' : p95Duration < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
              Target: &lt; 50ms
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">p99 Latency</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {searchHistory.length > 0 ? `${Math.round(p99Duration)}ms` : '-'}
            </div>
            <div className={`text-sm mt-1 ${p99Duration < 100 ? 'text-green-600' : p99Duration < 200 ? 'text-yellow-600' : 'text-red-600'}`}>
              Target: &lt; 100ms
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Search Results ({data?.results.length || 0})
          </h2>
          
          {error && (
            <p className="text-red-600">Error: {error instanceof Error ? error.message : 'Search failed'}</p>
          )}

          {isLoading && <p className="text-gray-600">Loading...</p>}

          {data && data.results.length > 0 ? (
            <div className="space-y-3">
              {data.results.map((user) => (
                <div key={user.user_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                      {user.location && (
                        <p className="text-xs text-gray-500 mt-1">{user.location}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {user.distance_km && <p>{user.distance_km.toFixed(1)} km away</p>}
                      {user.mutual_friends_count > 0 && (
                        <p>{user.mutual_friends_count} mutual friends</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Score: {user.relevance_score.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && query.length >= 2 && <p className="text-gray-600">No results found</p>
          )}
        </div>

        {/* Search History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Search History (Last 10)
          </h2>
          {searchHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Query</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Results</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchHistory.map((search, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {search.query}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${search.duration < 50 ? 'text-green-600' : search.duration < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round(search.duration)}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {search.resultCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(search.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No search history yet. Try searching for users.</p>
          )}
        </div>

        {/* Optimization Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Performance Optimizations Applied
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ Database: GIN full-text search index on users(full_name, username)</li>
            <li>✅ Database: Composite indexes for location + timestamp</li>
            <li>✅ Database: Partial indexes for active users only</li>
            <li>✅ Database: Optimized mutual friends count with friendship indexes</li>
            <li>✅ Query: Early limiting to 100 results before scoring</li>
            <li>✅ Query: Single user location lookup (DECLARE variable)</li>
            <li>✅ Frontend: 300ms debounce on search input</li>
            <li>✅ Frontend: React Query caching (30s staleTime, 60s gcTime)</li>
            <li>✅ Frontend: Performance timing and slow search logging (&gt; 500ms)</li>
            <li>✅ Maintenance: Weekly VACUUM ANALYZE scheduled (Sundays 2 AM)</li>
            <li>✅ Monitoring: slow_search_queries view created</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
