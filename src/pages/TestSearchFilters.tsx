/**
 * Test Page for Story 9.2.4: Search Filters & Advanced Search
 * Tests all filter combinations, persistence, and URL sync
 */

import React, { useState } from 'react';
import { SearchFilters } from '../components/search/SearchFilters';
import { FilterChips } from '../components/search/FilterChips';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { useFilteredSearch } from '../hooks/useSearchFilters';
import { FriendSearchFilters } from '../services/searchService';

export function TestSearchFilters() {
  const { filters, updateFilters, clearFilters, removeFilter, filterCount } = useSearchFilters();
  const [query, setQuery] = useState('');
  
  const { data: results, isLoading, error } = useFilteredSearch(query, filters);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Story 9.2.4: Search Filters Test
          </h1>
          <p className="text-gray-600 mt-2">
            Testing filter combinations, persistence, and URL sync
          </p>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filter Count Badge */}
        {filterCount > 0 && (
          <div className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
            {filterCount} active filter{filterCount > 1 ? 's' : ''}
          </div>
        )}

        {/* Filter Chips */}
        <FilterChips filters={filters} onRemoveFilter={removeFilter} />

        {/* Search Filters Component */}
        <SearchFilters
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
        />

        {/* Test Info */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Test Status</h2>
          
          {/* Current Filters JSON */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Filters (JSON):</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>

          {/* URL Params Check */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">URL Parameters:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {window.location.search || '(none)'}
            </pre>
          </div>

          {/* LocalStorage Check */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">LocalStorage:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {localStorage.getItem('searchFilters') || '(none)'}
            </pre>
          </div>
        </div>

        {/* Search Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Results</h2>
          
          {isLoading && <p className="text-gray-600">Loading...</p>}
          {error && <p className="text-red-600">Error: {error.message}</p>}
          
          {results && results.length > 0 ? (
            <div className="space-y-3">
              {results.map((user) => (
                <div key={user.user_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {user.distance_km && <p>{user.distance_km.toFixed(1)} km away</p>}
                      {user.mutual_friends_count > 0 && (
                        <p>{user.mutual_friends_count} mutual friends</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Relevance: {user.relevance_score.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && <p className="text-gray-600">No results found</p>
          )}
        </div>

        {/* Test Checklist */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Acceptance Criteria Checklist
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ Database: search_users_with_filters() function created</li>
            <li>✅ Database: Indexes on deals category and favorite_deals</li>
            <li>✅ Service: searchUsersWithFilters() function</li>
            <li>✅ Service: Filter persistence in localStorage</li>
            <li>✅ Hooks: useSearchFilters() with URL sync</li>
            <li>✅ Hooks: useFilteredSearch() with React Query</li>
            <li>✅ UI: SearchFilters component with all controls</li>
            <li>✅ UI: FilterChips component with remove capability</li>
            <li>⏳ Testing: Location filter (requires manual geolocation permission)</li>
            <li>⏳ Testing: Mutual friends filter</li>
            <li>⏳ Testing: Shared interests filter</li>
            <li>⏳ Testing: Filter combinations</li>
            <li>⏳ Testing: URL sync on filter changes</li>
            <li>⏳ Testing: LocalStorage persistence across refreshes</li>
            <li>⏳ Testing: Clear all filters functionality</li>
            <li>⏳ Testing: Remove individual filters via chips</li>
            <li>⏳ Testing: Query performance &lt; 100ms</li>
            <li>⏳ Testing: Filter count badge visibility</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
