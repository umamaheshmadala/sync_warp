// src/components/Search.tsx
// Enhanced search page with full functionality for finding businesses, deals, and products
// Includes advanced filtering, suggestions, and real-time search results

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Filter, MapPin, Star, ArrowUpDown, Grid, List, Plus } from 'lucide-react'
import { useSearch } from '../hooks/useSearch'
import { CouponCard, BusinessCard, FilterPanel, SearchSuggestions } from './search/index'
import { SearchSortField } from '../services/searchService'

export default function Search() {
  // Search hook with all functionality
  const search = useSearch({
    autoSearch: true,
    debounceMs: 300,
    pageSize: 20,
    saveToUrl: true
  })

  // Local state for UI
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'all' | 'coupons' | 'businesses'>('all')
  const [localQuery, setLocalQuery] = useState(search.query)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches')
    return saved ? JSON.parse(saved) : []
  })

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout>()

  // Update local query when search query changes
  useEffect(() => {
    setLocalQuery(search.query)
  }, [search.query])

  // Handle input changes with debounced suggestions
  const handleInputChange = async (value: string) => {
    setLocalQuery(value)
    
    // Show suggestions dropdown
    setIsSuggestionsVisible(true)
    
    // Clear previous timeout
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current)
    }
    
    // Debounce suggestions fetch
    if (value.length >= 2) {
      setSuggestionsLoading(true)
      suggestionsTimeoutRef.current = setTimeout(async () => {
        try {
          await search.getSuggestions(value)
        } finally {
          setSuggestionsLoading(false)
        }
      }, 200)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (localQuery.trim()) {
      performSearch(localQuery.trim())
    }
  }

  // Perform search and save to recent searches
  const performSearch = (query: string) => {
    search.setQuery(query)
    setIsSuggestionsVisible(false)
    
    // Save to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(term => term !== query)].slice(0, 5)
    setRecentSearches(newRecentSearches)
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    performSearch(suggestion)
  }

  // Handle sort change
  const handleSortChange = (field: SearchSortField) => {
    const newOrder = search.sort.field === field && search.sort.order === 'desc' ? 'asc' : 'desc'
    search.setSort({ field, order: newOrder })
  }

  // Get filtered results based on active tab
  const getFilteredResults = () => {
    switch (activeTab) {
      case 'coupons':
        return { coupons: search.results, businesses: [] }
      case 'businesses':
        return { coupons: [], businesses: search.businesses }
      default:
        return { coupons: search.results, businesses: search.businesses }
    }
  }

  const { coupons, businesses } = getFilteredResults()
  const hasResults = coupons.length > 0 || businesses.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Local Deals</h1>
        <p className="text-gray-600">Discover amazing businesses, products, and offers in your area</p>
      </div>

      {/* Search Form */}
      <div className="mb-8">
        <form onSubmit={handleSubmit} className="max-w-2xl relative">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={localQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setIsSuggestionsVisible(true)}
              placeholder="Search for businesses, deals, or products..."
              className="w-full px-4 py-3 pl-12 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoComplete="off"
            />
            <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <button
              type="submit"
              disabled={search.isSearching}
              className="absolute right-2 top-2 px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {search.isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {/* Search Suggestions */}
          <SearchSuggestions
            searchTerm={localQuery}
            suggestions={search.suggestions}
            isLoading={suggestionsLoading}
            isVisible={isSuggestionsVisible}
            onSuggestionSelect={handleSuggestionSelect}
            onClose={() => setIsSuggestionsVisible(false)}
            recentSearches={recentSearches}
          />
        </form>
      </div>

      {/* Filters and Controls */}
      <div className="mb-8 space-y-4">
        {/* Filter Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Filter Panel Toggle */}
            <FilterPanel
              filters={search.filters}
              onFiltersChange={search.setFilters}
              onClearFilters={search.clearFilters}
              isOpen={isFilterPanelOpen}
              onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              activeFiltersCount={search.activeFiltersCount}
            />
            
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={search.sort.field}
                onChange={(e) => handleSortChange(e.target.value as SearchSortField)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="relevance">Most Relevant</option>
                <option value="discount_value">Highest Discount</option>
                <option value="created_at">Newest First</option>
                <option value="valid_until">Expiring Soon</option>
                <option value="usage_count">Most Popular</option>
                <option value="business_name">Business Name</option>
              </select>
              <ArrowUpDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {search.hasSearched ? (
        <div>
          {/* Results Header with Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {search.query ? `Search results for "${search.query}"` : 'Search Results'}
              </h2>
              <div className="text-sm text-gray-600">
                {search.totalResults} results found
                {search.searchTime > 0 && ` in ${search.searchTime}ms`}
              </div>
            </div>
            
            {/* Result Type Tabs */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                All ({search.totalResults})
              </button>
              <button
                onClick={() => setActiveTab('coupons')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                  activeTab === 'coupons'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Coupons ({search.totalCoupons})
              </button>
              <button
                onClick={() => setActiveTab('businesses')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                  activeTab === 'businesses'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Businesses ({search.totalBusinesses})
              </button>
            </div>
          </div>
          
          {/* Search Status */}
          {search.isSearching ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          ) : search.error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">Search failed</div>
              <div className="text-gray-600 text-sm">{search.error}</div>
              <button
                onClick={() => search.search()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          ) : hasResults ? (
            <div>
              {/* Coupon Results */}
              {coupons.length > 0 && (
                <div className="mb-8">
                  {activeTab === 'all' && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span>Coupons & Deals</span>
                      <span className="ml-2 text-sm font-normal text-gray-500">({coupons.length})</span>
                    </h3>
                  )}
                  
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                    : 'space-y-4'
                  }>
                    {coupons.map((coupon) => (
                      <CouponCard
                        key={coupon.id}
                        coupon={coupon}
                        variant={viewMode === 'grid' ? 'default' : 'compact'}
                        onCollect={search.collectCoupon}
                        onBusinessClick={search.goToBusiness}
                        onCouponClick={search.goToCoupon}
                        showBusiness={true}
                        showDistance={false}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Business Results */}
              {businesses.length > 0 && (
                <div className="mb-8">
                  {activeTab === 'all' && coupons.length > 0 && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span>Businesses</span>
                      <span className="ml-2 text-sm font-normal text-gray-500">({businesses.length})</span>
                    </h3>
                  )}
                  
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                    : 'space-y-4'
                  }>
                    {businesses.map((business) => (
                      <BusinessCard
                        key={business.id}
                        business={business}
                        variant={viewMode === 'grid' ? 'default' : 'compact'}
                        onBusinessClick={search.goToBusiness}
                        showDistance={false}
                        showCouponCount={true}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Load More Button */}
              {search.hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={search.loadMore}
                    disabled={search.isSearching}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {search.isSearching ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                {search.query 
                  ? `No results found for "${search.query}"` 
                  : 'Try adjusting your search terms or filters'
                }
              </p>
              {search.activeFiltersCount > 0 && (
                <button
                  onClick={search.clearFilters}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <SearchIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start your search</h3>
          <p className="text-gray-600">Enter keywords to find businesses, deals, and products</p>
        </div>
      )}
    </div>
  );
}
