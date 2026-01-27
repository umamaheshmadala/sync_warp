// src/components/Search.tsx
// Enhanced search page with full functionality for finding businesses, deals, and products
// Includes advanced filtering, suggestions, and real-time search results

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Search as SearchIcon, Filter, MapPin, Star, ChevronDown, Grid, List, Plus, Navigation, Loader2, AlertCircle, Store, Tag, Package, TrendingUp } from 'lucide-react'
import { useSearch } from '../hooks/useSearch'
import { useSearchTracking } from '../hooks/useSearchAnalytics'
import { CouponCard, BusinessCard, FilterPanel, FilterButton, SearchSuggestions } from './search/index'
import { SearchSortField, SearchSuggestion } from '../services/searchService'
import { useAuthStore } from '../store/authStore'
import CouponDetailsModal from './modals/CouponDetailsModal'

export default function Search() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // ... (rest of component)

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
  const [couponsViewMode, setCouponsViewMode] = useState<'grid' | 'list'>('grid')
  const [businessesViewMode, setBusinessesViewMode] = useState<'grid' | 'list'>('grid')
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

  useEffect(() => {
    // @ts-ignore
    if (search.instanceId) {
      // @ts-ignore
      console.log(`🖼️ [Search.tsx] Rendered with useSearch instance: ${search.instanceId}, isSearching: ${search.isSearching}`);
    }
    // @ts-ignore
  }, [search.instanceId, search.isSearching]);
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
  const handleSuggestionSelect = (suggestion: string | SearchSuggestion) => {
    if (typeof suggestion === 'string') {
      performSearch(suggestion);
    } else {
      if (suggestion.type === 'business' && suggestion.id) {
        navigate(`/business/${suggestion.id}`, { state: { from: 'search', query: search.query } });
        // Optional: Close suggestions or update query if needed
      } else {
        performSearch(suggestion.text);
      }
    }
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
    <div className="w-full max-w-7xl mx-auto px-[2.5vw] sm:px-4 md:px-6 lg:px-8 pt-2 pb-4">
      {/* Filters and Controls - Single Row, scrollable on mobile */}
      <div className="mb-3 overflow-x-auto">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Nearby Toggle Button */}
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
              disabled={search.location.isLoading || !search.location.isSupported}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-sm transition-colors ${search.location.enabled
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : search.location.error
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
            >
              {search.location.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className={`h-4 w-4 ${search.location.enabled ? 'text-blue-600' : 'text-gray-500'}`} />
              )}
              <span className="hidden sm:inline font-medium">Nearby</span>
            </button>

            {/* Enhanced Location Tooltip */}
            {isLocationTooltipVisible && (search.location.error || (!search.location.hasPermission && !search.location.enabled)) && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm z-20 w-72 max-w-[calc(100vw-2rem)]">
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

          {/* Filter Button - Inside scrollable row */}
          <FilterButton
            isOpen={isFilterPanelOpen}
            onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            activeFiltersCount={search.activeFiltersCount}
          />
          {search.hasSearched && (
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveTab(activeTab === 'coupons' ? 'all' : 'coupons')}
                className={`px-2 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'coupons'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Tag className="h-4 w-4 sm:hidden inline" />
                <span className="hidden sm:inline">Coupons ({search.totalCoupons})</span>
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'businesses' ? 'all' : 'businesses')}
                className={`px-2 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors whitespace-nowrap ${activeTab === 'businesses'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Store className="h-4 w-4 sm:hidden inline" />
                <span className="hidden sm:inline">Businesses ({search.totalBusinesses})</span>
              </button>
            </div>
          )}

          <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Filter Panel Dropdown - Outside scrollable row to avoid clipping */}
      <div className="relative">
        <FilterPanel
          filters={search.filters}
          onFiltersChange={search.setFilters}
          onClearFilters={search.clearFilters}
          isOpen={isFilterPanelOpen}
          onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          activeFiltersCount={search.activeFiltersCount}
        />
      </div>

      {/* Results Section */}
      {search.hasSearched ? (
        <div className="w-full">
          {/* Search Status */}
          {search.isSearching && !hasResults ? (
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12px] sm:text-lg font-semibold text-gray-900 flex items-center">
                        <span>Coupons & Deals</span>
                        <span className="ml-2 text-sm font-normal text-gray-500">({coupons.length})</span>
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCouponsViewMode('grid')}
                          className={`p-1.5 w-7 h-7 rounded flex items-center justify-center transition-colors ${couponsViewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                          <Grid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCouponsViewMode('list')}
                          className={`p-1.5 w-7 h-7 rounded flex items-center justify-center transition-colors ${couponsViewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={couponsViewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6'
                    : 'space-y-3 sm:space-y-4'
                  }>
                    {coupons.map((coupon) => (
                      <CouponCard
                        key={coupon.id}
                        coupon={coupon}
                        variant={couponsViewMode === 'grid' ? 'default' : 'compact'}
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
                          search.goToBusiness(businessId, coupon.business?.business_name);
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
                        showDistance={!!(search.location.enabled && search.location.coords)}
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12px] sm:text-lg font-semibold text-gray-900 flex items-center">
                        <span>Businesses</span>
                        <span className="ml-2 text-sm font-normal text-gray-500">({businesses.length})</span>
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBusinessesViewMode('grid')}
                          className={`p-1.5 w-7 h-7 rounded flex items-center justify-center transition-colors ${businessesViewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                          <Grid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setBusinessesViewMode('list')}
                          className={`p-1.5 w-7 h-7 rounded flex items-center justify-center transition-colors ${businessesViewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={businessesViewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6'
                    : 'space-y-3 sm:space-y-4'
                  }>
                    {businesses.map((business) => (
                      <BusinessCard
                        key={business.id}
                        business={business}
                        variant={businessesViewMode === 'grid' ? 'default' : 'compact'}
                        onBusinessClick={(businessId) => {
                          // Track click for analytics
                          if (search.query) {
                            trackResultClick({
                              searchTerm: search.query,
                              resultId: businessId,
                              resultType: 'business'
                            });
                          }
                          search.goToBusiness(businessId, business.business_name);
                        }}
                        showDistance={!!(search.location.enabled && search.location.coords)}
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
      )
      }

      {/* Coupon Details Modal */}
      {
        showCouponModal && selectedCoupon && (
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
          />
        )
      }
    </div >
  );
}


