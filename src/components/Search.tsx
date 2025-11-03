// src/components/Search.tsx
// Enhanced search page with full functionality for finding businesses, deals, and products
// Includes advanced filtering, suggestions, and real-time search results

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search as SearchIcon, Filter, MapPin, Star, ArrowUpDown, Grid, List, Plus, Navigation, Loader2, AlertCircle, Store, Tag, Package, TrendingUp } from 'lucide-react'
import { useSearch } from '../hooks/useSearch'
import { useSearchTracking } from '../hooks/useSearchAnalytics'
import { CouponCard, BusinessCard, FilterPanel, SearchSuggestions } from './search/index'
import { SearchSortField } from '../services/searchService'
import { useAuthStore } from '../store/authStore'
import CouponDetailsModal from './modals/CouponDetailsModal'

export default function Search() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Search hook with all functionality
  const search = useSearch({
    autoSearch: true,
    debounceMs: 300,
    pageSize: 20,
    saveToUrl: true
  })
  
  // Analytics tracking
  const { trackSearch, trackResultClick } = useSearchTracking()

  // Local state for UI
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'all' | 'coupons' | 'businesses'>('all')
  const [localQuery, setLocalQuery] = useState(search.query)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [isLocationTooltipVisible, setIsLocationTooltipVisible] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const recentSearchKey = user?.id ? `recentSearches_${user.id}` : 'recentSearches_guest'
    const saved = localStorage.getItem(recentSearchKey)
    return saved ? JSON.parse(saved) : []
  })

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout>()
  const locationTooltipRef = useRef<HTMLDivElement>(null)

  // Update local query when search query changes
  useEffect(() => {
    setLocalQuery(search.query)
  }, [search.query])
  
  // Update recent searches when user changes
  useEffect(() => {
    const recentSearchKey = user?.id ? `recentSearches_${user.id}` : 'recentSearches_guest'
    const saved = localStorage.getItem(recentSearchKey)
    setRecentSearches(saved ? JSON.parse(saved) : [])
  }, [user?.id])
  
  // Hide location tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationTooltipRef.current && !locationTooltipRef.current.contains(event.target as Node)) {
        setIsLocationTooltipVisible(false)
      }
    }
    
    if (isLocationTooltipVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isLocationTooltipVisible])

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
    console.log('🔍 [Search] Form submitted with query:', localQuery);
    
    // Allow empty queries for browse mode
    const queryToSearch = localQuery.trim();
    console.log('🔍 [Search] Processing query (empty = browse mode):', queryToSearch || '[BROWSE MODE]');
    performSearch(queryToSearch); // Pass empty string for browse mode
  }

  // Perform search and save to recent searches
  const performSearch = async (query: string) => {
    console.log('🔍 [Search.tsx] performSearch called with:', query || '[BROWSE MODE]');
    
    // Update local query first
    setLocalQuery(query);
    setIsSuggestionsVisible(false);
    
    // Track search start time for analytics
    const searchStartTime = Date.now();
    
    // Set the query in search hook (this will trigger the actual search)
    // Empty queries are allowed for browse mode
    search.setQuery(query);
    
    // Save to recent searches (only non-empty queries)
    if (query.trim()) {
      const newRecentSearches = [query, ...recentSearches.filter(term => term !== query)].slice(0, 5);
      setRecentSearches(newRecentSearches);
      const recentSearchKey = user?.id ? `recentSearches_${user.id}` : 'recentSearches_guest';
      localStorage.setItem(recentSearchKey, JSON.stringify(newRecentSearches));
    }
    
    // Track search analytics after results are loaded
    // This will be called after the search hook completes
    setTimeout(async () => {
      if (query.trim()) {
        const searchEndTime = Date.now();
        const searchTimeMs = searchEndTime - searchStartTime;
        
        await trackSearch({
          searchTerm: query,
          filters: search.filters,
          resultsCount: search.totalResults,
          searchTimeMs: searchTimeMs
        });
      }
    }, 100); // Small delay to ensure search results are updated
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    performSearch(suggestion)
  }

  // Handle coupon click to show modal
  const handleCouponClick = (coupon: any) => {
    setSelectedCoupon(coupon)
    setShowCouponModal(true)
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

  // Filter tabs configuration
  const filterTabs = [
    { id: 'all', label: 'All', icon: Grid },
    { id: 'businesses', label: 'Businesses', icon: Store },
    { id: 'coupons', label: 'Offers', icon: Tag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* LinkedIn-Style Horizontal Filter Tabs */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
          {filterTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
                {tab.id === activeTab && (
                  <span className="ml-1 px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs rounded-full">
                    {search.totalResults}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Find Local Deals</h1>
            <p className="text-sm sm:text-base text-gray-600">Discover amazing businesses, products, and offers in your area</p>
          </div>
          <div className="hidden md:flex flex-col space-y-2">
            <button
              onClick={() => navigate('/search/advanced')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Advanced Search
            </button>
            <button
              onClick={() => navigate('/discovery')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Discover
            </button>
          </div>
        </div>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const queryToSearch = localQuery.trim();
                  console.log('🔍 [Search] Enter key pressed, performing search with:', queryToSearch || '[BROWSE MODE]');
                  performSearch(queryToSearch); // Allow empty for browse mode
                }
              }}
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
        
        {/* Browse All Button */}
        {!search.hasSearched && (
          <div className="mt-4 text-center">
            <button
              onClick={() => performSearch('')}
              disabled={search.isSearching}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {search.isSearching ? 'Loading...' : 'Browse All Deals'}
            </button>
            <p className="text-sm text-gray-500 mt-1">Or search for specific deals above</p>
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="mb-8 space-y-4">
        {/* Filter Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Near Me Toggle Button */}
            <div className="relative" ref={locationTooltipRef}>
              <button
                onClick={() => {
                  if (search.location.error) {
                    setIsLocationTooltipVisible(!isLocationTooltipVisible)
                  } else if (search.location.enabled) {
                    search.disableLocationSearch();
                    setIsLocationTooltipVisible(false)
                  } else {
                    search.enableLocationSearch();
                    setIsLocationTooltipVisible(false)
                  }
                }}
                onMouseEnter={() => {
                  if (!search.location.enabled && !search.location.isLoading) {
                    setIsLocationTooltipVisible(true)
                  }
                }}
                onMouseLeave={() => {
                  if (!search.location.error) {
                    setIsLocationTooltipVisible(false)
                  }
                }}
                disabled={search.location.isLoading || !search.location.isSupported}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  search.location.enabled
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : search.location.error
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {search.location.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : search.location.error ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Navigation className={`h-4 w-4 ${
                    search.location.enabled ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                )}
                <span className="text-sm font-medium">
                  {search.location.isLoading
                    ? 'Locating...'
                    : search.location.error
                    ? 'Location Denied'
                    : search.location.enabled
                    ? 'Near Me'
                    : 'Enable Location'
                  }
                </span>
                {search.location.enabled && search.location.coords && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    {search.location.radius}km
                  </span>
                )}
              </button>
              
              {/* Enhanced Location Tooltip */}
              {isLocationTooltipVisible && (search.location.error || (!search.location.hasPermission && !search.location.enabled)) && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm z-20 w-80">
                  {search.location.error ? (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-700">Location Access Issue</span>
                      </div>
                      <p className="text-red-600 text-xs mb-3">{search.location.error.message}</p>
                      <div className="text-xs text-gray-600">
                        <p className="mb-2"><strong>To enable location:</strong></p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Click the location icon in your browser's address bar</li>
                          <li>Select "Allow" for location access</li>
                          <li>Refresh the page and try again</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Navigation className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-blue-700">Location Services</span>
                      </div>
                      <p className="text-gray-600 text-xs mb-2">
                        Enable location to see nearby businesses and get personalized recommendations.
                      </p>
                      <p className="text-xs text-gray-500">
                        Your location data stays private and is only used to improve search results.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
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
                {search.location.enabled && search.location.coords && (
                  <option value="distance">Nearest First</option>
                )}
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
                        onBusinessClick={(businessId) => {
                          // Track click for analytics
                          if (search.query) {
                            trackResultClick({
                              searchTerm: search.query,
                              resultId: businessId,
                              resultType: 'business'
                            });
                          }
                          search.goToBusiness(businessId);
                        }}
                  onCouponClick={(couponId) => {
                    // Track click for analytics
                    if (search.query) {
                      trackResultClick({
                        searchTerm: search.query,
                        resultId: couponId,
                        resultType: 'coupon'
                      });
                    }
                    // Open coupon modal instead of navigating
                    handleCouponClick(coupon);
                  }}
                        showBusiness={true}
                        showDistance={search.location.enabled && search.location.coords}
                        getFormattedDistance={search.getFormattedDistance}
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
                        onBusinessClick={(businessId) => {
                          // Track click for analytics
                          if (search.query) {
                            trackResultClick({
                              searchTerm: search.query,
                              resultId: businessId,
                              resultType: 'business'
                            });
                          }
                          search.goToBusiness(businessId);
                        }}
                        showDistance={search.location.enabled && search.location.coords}
                        showCouponCount={true}
                        getFormattedDistance={search.getFormattedDistance}
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

      {/* Coupon Details Modal */}
      {showCouponModal && selectedCoupon && (
        <CouponDetailsModal
          coupon={selectedCoupon}
          isOpen={showCouponModal}
          onClose={() => {
            setShowCouponModal(false);
            setSelectedCoupon(null);
          }}
          onCollect={async (couponId) => {
            const success = await search.collectCoupon(couponId);
            if (success) {
              // Update the selected coupon to reflect collected state
              setSelectedCoupon(prev => ({ ...prev, isCollected: true }));
            }
            return success;
          }}
          showCollectButton={true}
          showShareButton={true}
        />
      )}
    </div>
  );
}
