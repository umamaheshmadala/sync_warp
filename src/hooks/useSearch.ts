// useSearch.ts
// Custom hook for search functionality with state management
// Provides search operations, filters, and results management for React components

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUserCoupons } from './useCoupons';
// Temporarily using simple search service for testing
import simpleSearchService from '../services/simpleSearchService';
import searchService, { 
  SearchQuery, 
  SearchResult, 
  SearchFilters, 
  SearchSort, 
  SearchPagination,
  SearchCoupon,
  SearchBusiness,
  SearchSuggestion,
  SearchSortField
} from '../services/searchService';
import { toast } from 'react-hot-toast';
import { useGeolocation, LocationCoords } from './useGeolocation';
import { calculateDistance, formatDistance, getPreferredDistanceUnit, sortByDistance } from '../utils/locationUtils';

// Hook configuration
interface UseSearchOptions {
  autoSearch?: boolean; // Auto-search when query changes
  debounceMs?: number; // Debounce delay for search
  pageSize?: number; // Number of results per page
  defaultSort?: SearchSort;
  defaultFilters?: Partial<SearchFilters>;
  saveToUrl?: boolean; // Save search params to URL
}

// Search state interface
interface SearchState {
  query: string;
  filters: SearchFilters;
  sort: SearchSort;
  pagination: SearchPagination;
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
}

// Search results interface
interface SearchResults {
  coupons: SearchCoupon[];
  businesses: SearchBusiness[];
  totalCoupons: number;
  totalBusinesses: number;
  suggestions: SearchSuggestion[];
  searchTime: number;
  hasMore: boolean;
}

// Location search state
interface LocationSearchState {
  enabled: boolean;
  coords: LocationCoords | null;
  radius: number; // in km
  sortByDistance: boolean;
}

export const useSearch = (options: UseSearchOptions = {}) => {
  const {
    autoSearch = true,
    debounceMs = 300,
    pageSize = 20,
    defaultSort = { field: 'relevance', order: 'desc' },
    defaultFilters = {},
    saveToUrl = true
  } = options;

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { collectCoupon } = useUserCoupons();
  
  // Geolocation hook
  const geolocation = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000 // 5 minutes
  });
  
  // Location search state
  const [locationSearch, setLocationSearch] = useState<LocationSearchState>({
    enabled: false,
    coords: null,
    radius: 10, // 10km default
    sortByDistance: false
  });

  // Search state
  const [searchState, setSearchState] = useState<SearchState>(() => {
    // Try to restore from localStorage first
    const searchStateKey = user?.id ? `searchState_${user.id}` : 'searchState_guest';
    const savedSearchState = localStorage.getItem(searchStateKey);
    if (savedSearchState) {
      try {
        const parsed = JSON.parse(savedSearchState);
        // Only restore if saved within the last 30 minutes
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          return {
            ...parsed.state,
            isSearching: false, // Reset loading state
            error: null // Reset error state
          };
        }
      } catch (error) {
        console.warn('Failed to restore search state:', error);
      }
    }

    // Fallback to URL params if available
    const urlQuery = searchParams.get('q') || '';
    const urlSort = searchParams.get('sort') as SearchSortField || defaultSort.field;
    const urlOrder = searchParams.get('order') as 'asc' | 'desc' || defaultSort.order;
    const urlPage = parseInt(searchParams.get('page') || '1');

    return {
      query: urlQuery,
      filters: { 
        ...defaultFilters, 
        // Only apply default filters if no URL query to allow browsing
        validOnly: true, 
        isPublic: true 
      },
      sort: { field: urlSort, order: urlOrder },
      pagination: { page: urlPage, limit: pageSize },
      isSearching: false,
      hasSearched: urlQuery.length > 0,
      error: null
    };
  });

  // Search results with persistence
  const [results, setResults] = useState<SearchResults>(() => {
    // Try to restore search results from localStorage
    const searchResultsKey = user?.id ? `searchResults_${user.id}` : 'searchResults_guest';
    const savedResults = localStorage.getItem(searchResultsKey);
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        // Only restore if saved within the last 30 minutes
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          return parsed.results;
        }
      } catch (error) {
        console.warn('Failed to restore search results:', error);
      }
    }

    return {
      coupons: [],
      businesses: [],
      totalCoupons: 0,
      totalBusinesses: 0,
      suggestions: [],
      searchTime: 0,
      hasMore: false
    };
  });

  // Refs for managing state updates
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController>();
  
  // Reload search state and results when user changes
  useEffect(() => {
    const searchStateKey = user?.id ? `searchState_${user.id}` : 'searchState_guest';
    const searchResultsKey = user?.id ? `searchResults_${user.id}` : 'searchResults_guest';
    
    // Load user-specific search state
    try {
      const savedSearchState = localStorage.getItem(searchStateKey);
      if (savedSearchState) {
        const parsed = JSON.parse(savedSearchState);
        // Only restore if saved within the last 30 minutes
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setSearchState({
            ...parsed.state,
            isSearching: false,
            error: null
          });
        }
      }
      
      // Load user-specific search results
      const savedResults = localStorage.getItem(searchResultsKey);
      if (savedResults) {
        const parsed = JSON.parse(savedResults);
        // Only restore if saved within the last 30 minutes
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setResults(parsed.results);
        }
      }
    } catch (error) {
      console.warn('Failed to reload user-specific search data:', error);
    }
  }, [user?.id]);

  // Persist search state and results to localStorage
  useEffect(() => {
    if (searchState.hasSearched && !searchState.isSearching) {
      try {
        const searchStateKey = user?.id ? `searchState_${user.id}` : 'searchState_guest';
        localStorage.setItem(searchStateKey, JSON.stringify({
          state: searchState,
          timestamp: Date.now()
        }));
        
        if (results.coupons.length > 0 || results.businesses.length > 0) {
          const searchResultsKey = user?.id ? `searchResults_${user.id}` : 'searchResults_guest';
          localStorage.setItem(searchResultsKey, JSON.stringify({
            results: results,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.warn('Failed to persist search state:', error);
      }
    }
  }, [searchState, results]);

  /**
   * Perform search with current state
   */
  const performSearch = useCallback(async (
    customQuery?: SearchQuery,
    append: boolean = false
  ): Promise<SearchResult | null> => {
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const queryToUse: SearchQuery = customQuery || {
      q: searchState.query,
      location: locationSearch.enabled && locationSearch.coords ? {
        latitude: locationSearch.coords.latitude,
        longitude: locationSearch.coords.longitude,
        radius: locationSearch.radius
      } : undefined,
      filters: searchState.filters,
      sort: searchState.sort,
      pagination: searchState.pagination
    };

    // Check if we have meaningful search criteria
    const hasSearchQuery = queryToUse.q.trim().length > 0;
    const hasSignificantFilters = Object.keys(queryToUse.filters).filter(key => {
      const value = queryToUse.filters[key];
      // Don't count default filters as significant
      return value && key !== 'validOnly' && key !== 'isPublic';
    }).length > 0;
    
    // Debug logging
    console.log('🔍 [useSearch] Search criteria check:', {
      hasSearchQuery,
      hasSignificantFilters,
      query: queryToUse.q,
      filters: queryToUse.filters
    });
    
    // For now, allow default filter searches to proceed (browse mode)
    // This will show all public, active coupons when no search term is provided
    if (!hasSearchQuery && !hasSignificantFilters) {
      console.log('🔍 [useSearch] Browse mode - showing all public active coupons');
    }

    setSearchState(prev => ({ 
      ...prev, 
      isSearching: true, 
      error: null,
      hasSearched: true 
    }));

    try {
      // Debug: Log search parameters
      console.log('🔍 [useSearch] Executing search with:', {
        query: queryToUse.q,
        filters: queryToUse.filters,
        pagination: queryToUse.pagination,
        userId: user?.id
      });
      
      // Log the search parameters being sent
      console.log('📍 [useSearch] Calling simpleSearchService with:', {
        query: queryToUse.q,
        limit: queryToUse.pagination.limit,
        locationEnabled: locationSearch.enabled,
        locationCoords: locationSearch.coords,
        locationRadius: locationSearch.radius,
        locationParam: queryToUse.location
      });
      
      // Use simple search service with proper location data
      const simpleResult = await simpleSearchService.search({
        q: queryToUse.q,
        limit: queryToUse.pagination.limit,
        location: queryToUse.location ? {
          latitude: queryToUse.location.latitude,
          longitude: queryToUse.location.longitude,
          radius: queryToUse.location.radius
        } : undefined
      });
      
      console.log('🔍 [useSearch] Raw search result:', simpleResult);
      
      // Convert to expected format
      const result: SearchResult = {
        coupons: simpleResult.coupons.map((coupon: any) => ({
          ...coupon,
          relevanceScore: 1,
          business: { id: coupon.business_id, business_name: 'Test Business' },
          isCollected: false,
          isUsed: false
        })),
        businesses: simpleResult.businesses.map((business: any) => ({
          ...business,
          activeCouponsCount: 0,
          relevanceScore: 1
        })),
        totalCoupons: simpleResult.coupons.length,
        totalBusinesses: simpleResult.businesses.length,
        facets: { couponTypes: [], discountRanges: [], businessTypes: [], locations: [], validityRanges: [] },
        suggestions: [],
        searchTime: simpleResult.searchTime,
        hasMore: false
      };
      // const result = await searchService.search(queryToUse, user?.id);
      
      // Check if this search was cancelled
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }

      // Update results
      if (append) {
        setResults(prev => ({
          ...result,
          coupons: [...prev.coupons, ...result.coupons],
          businesses: [...prev.businesses, ...result.businesses]
        }));
      } else {
        setResults(result);
      }
      
      // Enhance results with distance calculations and apply location filtering if enabled
      if (locationSearch.enabled && locationSearch.coords) {
        console.log('📍 [useSearch] Applying location filtering with coords:', locationSearch.coords);
        console.log('📍 [useSearch] Radius:', locationSearch.radius, 'km');
        
        setResults(prev => {
          // First calculate distances for all items
          const couponsWithDistance = prev.coupons.map(coupon => {
            const distance = coupon.business?.latitude && coupon.business?.longitude
              ? calculateDistance(
                  locationSearch.coords!,
                  { latitude: coupon.business.latitude, longitude: coupon.business.longitude }
                )
              : undefined;
            
            return { ...coupon, distance };
          });
          
          const businessesWithDistance = prev.businesses.map(business => {
            const distance = business.latitude && business.longitude
              ? calculateDistance(
                  locationSearch.coords!,
                  { latitude: business.latitude, longitude: business.longitude }
                )
              : undefined;
            
            return { ...business, distance };
          });
          
          // Then filter by radius (convert km to meters)
          const radiusInMeters = locationSearch.radius * 1000;
          
          const filteredCoupons = couponsWithDistance.filter(coupon => {
            if (coupon.distance === undefined) {
              console.log(`⚠️ [useSearch] Coupon "${coupon.title}" has no location - excluding`);
              return false;
            }
            
            const withinRadius = coupon.distance <= radiusInMeters;
            const distanceKm = (coupon.distance / 1000).toFixed(1);
            
            if (!withinRadius) {
              console.log(`📍 [useSearch] Coupon "${coupon.title}" is ${distanceKm}km away - outside ${locationSearch.radius}km radius`);
            } else {
              console.log(`📍 [useSearch] Coupon "${coupon.title}" is ${distanceKm}km away - within range`);
            }
            
            return withinRadius;
          });
          
          const filteredBusinesses = businessesWithDistance.filter(business => {
            if (business.distance === undefined) {
              console.log(`⚠️ [useSearch] Business "${business.business_name}" has no location - excluding`);
              return false;
            }
            
            const withinRadius = business.distance <= radiusInMeters;
            const distanceKm = (business.distance / 1000).toFixed(1);
            
            if (!withinRadius) {
              console.log(`📍 [useSearch] Business "${business.business_name}" is ${distanceKm}km away - outside ${locationSearch.radius}km radius`);
            } else {
              console.log(`📍 [useSearch] Business "${business.business_name}" is ${distanceKm}km away - within range`);
            }
            
            return withinRadius;
          });
          
          console.log(`📍 [useSearch] Location filtering results: ${prev.coupons.length} → ${filteredCoupons.length} coupons, ${prev.businesses.length} → ${filteredBusinesses.length} businesses`);
          
          return {
            ...prev,
            coupons: filteredCoupons,
            businesses: filteredBusinesses,
            totalCoupons: filteredCoupons.length,
            totalBusinesses: filteredBusinesses.length
          };
        });
        
        // Sort by distance if distance sort is selected
        if (searchState.sort.field === 'distance') {
          setResults(prev => ({
            ...prev,
            coupons: [...prev.coupons].sort((a, b) => {
              if (a.distance === undefined && b.distance === undefined) return 0;
              if (a.distance === undefined) return 1;
              if (b.distance === undefined) return -1;
              return a.distance - b.distance;
            }),
            businesses: [...prev.businesses].sort((a, b) => {
              if (a.distance === undefined && b.distance === undefined) return 0;
              if (a.distance === undefined) return 1;
              if (b.distance === undefined) return -1;
              return a.distance - b.distance;
            })
          }));
        }
      }

      // Save to URL if enabled
      if (saveToUrl && !customQuery) {
        updateUrlParams(queryToUse);
      }

      lastSearchRef.current = queryToUse.q;
      return result;
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : 'Search failed';
        setSearchState(prev => ({ ...prev, error: errorMessage }));
        toast.error(errorMessage);
      }
      return null;
    } finally {
      setSearchState(prev => ({ ...prev, isSearching: false }));
    }
  }, [searchState, user?.id, saveToUrl]);

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback((query?: SearchQuery) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  /**
   * Update URL parameters with search state (debounced to prevent loops)
   */
  const updateUrlParams = useCallback((query: SearchQuery) => {
    // Only update URL if we have a meaningful query
    if (!query.q.trim()) return;
    
    const params = new URLSearchParams();
    
    params.set('q', query.q);
    if (query.sort.field !== defaultSort.field) params.set('sort', query.sort.field);
    if (query.sort.order !== defaultSort.order) params.set('order', query.sort.order);
    if (query.pagination.page > 1) params.set('page', query.pagination.page.toString());

    // Add significant filters
    if (query.filters.couponTypes?.length) {
      params.set('types', query.filters.couponTypes.join(','));
    }
    if (query.filters.businessName) {
      params.set('business', query.filters.businessName);
    }

    // Prevent URL update loops by checking if params actually changed
    const currentParams = searchParams.toString();
    const newParams = params.toString();
    if (currentParams !== newParams) {
      setSearchParams(params, { replace: true });
    }
  }, [defaultSort, setSearchParams, searchParams]);

  /**
   * Set search query
   */
  const setQuery = useCallback((query: string) => {
    console.log('🔍 [useSearch] setQuery called with:', query);
    
    setSearchState(prev => ({
      ...prev,
      query,
      pagination: { ...prev.pagination, page: 1 } // Reset to first page
    }));

    // Use immediate search with the NEW query value to avoid stale closures
    if (autoSearch && query.trim()) {
      console.log('🔍 [useSearch] Triggering immediate search with query:', query);
      
      // Create query object with the NEW value, not from state
      const immediateQuery: SearchQuery = {
        q: query, // Use the fresh query value
        filters: searchState.filters,
        sort: searchState.sort,
        pagination: { page: 1, limit: searchState.pagination.limit }
      };
      
      performSearch(immediateQuery, false);
    }
  }, [autoSearch, performSearch, searchState.filters, searchState.sort, searchState.pagination.limit]);

  /**
   * Update filters
   */
  const setFilters = useCallback((filters: Partial<SearchFilters>) => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
      pagination: { ...prev.pagination, page: 1 } // Reset to first page
    }));

    if (autoSearch) {
      debouncedSearch();
    }
  }, [autoSearch, debouncedSearch]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...defaultFilters, validOnly: true, isPublic: true },
      pagination: { ...prev.pagination, page: 1 }
    }));

    if (autoSearch) {
      debouncedSearch();
    }
  }, [defaultFilters, autoSearch, debouncedSearch]);

  /**
   * Set sorting
   */
  const setSort = useCallback((sort: SearchSort) => {
    setSearchState(prev => ({
      ...prev,
      sort,
      pagination: { ...prev.pagination, page: 1 } // Reset to first page
    }));

    if (autoSearch) {
      performSearch();
    }
  }, [autoSearch, performSearch]);

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!results.hasMore || searchState.isSearching) return;

    const nextPage = searchState.pagination.page + 1;
    setSearchState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: nextPage }
    }));

    const query: SearchQuery = {
      q: searchState.query,
      filters: searchState.filters,
      sort: searchState.sort,
      pagination: { ...searchState.pagination, page: nextPage }
    };

    await performSearch(query, true); // Append results
  }, [results.hasMore, searchState, performSearch]);

  /**
   * Go to specific page
   */
  const goToPage = useCallback((page: number) => {
    setSearchState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }));

    if (autoSearch) {
      performSearch();
    }
  }, [autoSearch, performSearch]);

  /**
   * Trigger manual search
   */
  const search = useCallback(() => {
    performSearch();
  }, [performSearch]);

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setResults({
      coupons: [],
      businesses: [],
      totalCoupons: 0,
      totalBusinesses: 0,
      suggestions: [],
      searchTime: 0,
      hasMore: false
    });
    setSearchState(prev => ({ ...prev, hasSearched: false, error: null }));
  }, []);

  /**
   * Collect a coupon from search results
   */
  const handleCollectCoupon = useCallback(async (couponId: string) => {
    const success = await collectCoupon(couponId, 'direct_search');
    
    if (success) {
      // Update the coupon in results to show it's collected
      setResults(prev => ({
        ...prev,
        coupons: prev.coupons.map(coupon =>
          coupon.id === couponId ? { ...coupon, isCollected: true } : coupon
        )
      }));
    }

    return success;
  }, [collectCoupon]);

  /**
   * Get search suggestions
   */
  const getSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) return [];

    try {
      const suggestions = await simpleSearchService.getSuggestions(term);
      return suggestions.map(text => ({ text, type: 'coupon' as const, count: 1 }));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }, []);

  /**
   * Navigate to business profile
   */
  const goToBusiness = useCallback((businessId: string) => {
    navigate(`/business/${businessId}`);
  }, [navigate]);

  /**
   * Navigate to coupon details
   */
  const goToCoupon = useCallback((couponId: string) => {
    navigate(`/coupon/${couponId}`);
  }, [navigate]);
  
  /**
   * Enable location-based search
   */
  const enableLocationSearch = useCallback(async (radius: number = 10) => {
    console.log('📍 [useSearch] Enabling location search with radius:', radius);
    try {
      const coords = await geolocation.getCurrentPosition();
      console.log('📍 [useSearch] Got location coordinates:', coords);
      if (coords) {
        setLocationSearch({
          enabled: true,
          coords,
          radius,
          sortByDistance: false
        });
        
        console.log('📍 [useSearch] Location search enabled, autoSearch:', autoSearch);
        // Trigger search with location after state is set
        if (autoSearch) {
          // Use setTimeout to ensure state is updated before search
          setTimeout(() => {
            console.log('📍 [useSearch] Triggering search with location');
            performSearch();
          }, 10);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to enable location search:', error);
      toast.error('Could not access your location');
    }
    return false;
  }, [geolocation, autoSearch, performSearch]);
  
  /**
   * Disable location-based search
   */
  const disableLocationSearch = useCallback(() => {
    console.log('📍 [useSearch] Disabling location search');
    setLocationSearch({
      enabled: false,
      coords: null,
      radius: 10,
      sortByDistance: false
    });
    
    console.log('📍 [useSearch] Location search disabled, autoSearch:', autoSearch);
    // Trigger search without location after state is updated
    if (autoSearch) {
      // Use setTimeout to ensure state is updated before search
      setTimeout(() => {
        console.log('📍 [useSearch] Triggering search without location');
        performSearch();
      }, 10);
    }
  }, [autoSearch, performSearch]);
  
  /**
   * Set search radius for location-based search
   */
  const setSearchRadius = useCallback((radius: number) => {
    setLocationSearch(prev => ({
      ...prev,
      radius
    }));
    
    if (locationSearch.enabled && autoSearch) {
      performSearch();
    }
  }, [locationSearch.enabled, autoSearch, performSearch]);
  
  /**
   * Toggle distance-based sorting
   */
  const toggleDistanceSort = useCallback(() => {
    setLocationSearch(prev => ({
      ...prev,
      sortByDistance: !prev.sortByDistance
    }));
    
    if (locationSearch.enabled && autoSearch) {
      performSearch();
    }
  }, [locationSearch.enabled, autoSearch, performSearch]);
  
  /**
   * Get formatted distance for a result
   */
  const getFormattedDistance = useCallback((distanceInMeters?: number): string | null => {
    if (distanceInMeters === undefined) return null;
    const unit = getPreferredDistanceUnit();
    return formatDistance(distanceInMeters, unit);
  }, []);

  // Auto-search when URL params change (with debouncing to prevent excessive updates)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== searchState.query) {
      // Update query state directly without triggering auto-search to prevent loops
      setSearchState(prev => ({
        ...prev,
        query: urlQuery,
        pagination: { ...prev.pagination, page: 1 }
      }));
      
      // Only trigger search if auto-search is enabled and we have a valid query
      if (autoSearch && urlQuery.trim()) {
        debouncedSearch();
      }
    }
  }, [searchParams, searchState.query, autoSearch, debouncedSearch]);

  // Update location search when geolocation changes
  useEffect(() => {
    if (locationSearch.enabled && geolocation.coords && !locationSearch.coords) {
      console.log('📍 [useSearch] Updating location search coords:', geolocation.coords);
      setLocationSearch(prev => ({
        ...prev,
        coords: geolocation.coords
      }));
    }
  }, [geolocation.coords, locationSearch.enabled, locationSearch.coords]);

  // Debug location search state changes
  useEffect(() => {
    console.log('📍 [useSearch] Location search state updated:', {
      enabled: locationSearch.enabled,
      hasCoords: !!locationSearch.coords,
      coords: locationSearch.coords,
      radius: locationSearch.radius
    });
  }, [locationSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Computed values
  const hasResults = results.coupons.length > 0 || results.businesses.length > 0;
  const totalResults = results.totalCoupons + results.totalBusinesses;
  const activeFiltersCount = Object.values(searchState.filters).filter(Boolean).length;

  return {
    // State
    query: searchState.query,
    filters: searchState.filters,
    sort: searchState.sort,
    pagination: searchState.pagination,
    isSearching: searchState.isSearching,
    hasSearched: searchState.hasSearched,
    error: searchState.error,

    // Results
    results: results.coupons,
    businesses: results.businesses,
    suggestions: results.suggestions,
    totalCoupons: results.totalCoupons,
    totalBusinesses: results.totalBusinesses,
    totalResults,
    hasResults,
    hasMore: results.hasMore,
    searchTime: results.searchTime,

    // Actions
    setQuery,
    setFilters,
    clearFilters,
    setSort,
    search,
    loadMore,
    goToPage,
    clearResults,
    getSuggestions,

    // Coupon actions
    collectCoupon: handleCollectCoupon,
    goToBusiness,
    goToCoupon,
    
    // Location actions
    enableLocationSearch,
    disableLocationSearch,
    setSearchRadius,
    toggleDistanceSort,
    getFormattedDistance,

    // Computed
    activeFiltersCount,
    
    // Location state
    location: {
      enabled: locationSearch.enabled,
      coords: locationSearch.coords,
      radius: locationSearch.radius,
      sortByDistance: locationSearch.sortByDistance,
      isLoading: geolocation.loading,
      hasPermission: geolocation.permission === 'granted',
      isSupported: geolocation.supported,
      error: geolocation.error
    },
    
    // Utils
    searchState: {
      isEmpty: !searchState.query.trim() && activeFiltersCount === 0,
      hasQuery: !!searchState.query.trim(),
      hasFilters: activeFiltersCount > 0,
      isFirstPage: searchState.pagination.page === 1,
      currentPage: searchState.pagination.page,
      pageSize: searchState.pagination.limit
    }
  };
};

// Hook for getting popular search terms
export const usePopularSearchTerms = () => {
  const [terms, setTerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPopularTerms = useCallback(async (limit: number = 10) => {
    setLoading(true);
    try {
      const popularTerms = await searchService.getPopularSearchTerms(limit);
      setTerms(popularTerms);
    } catch (error) {
      console.error('Error fetching popular terms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPopularTerms();
  }, [fetchPopularTerms]);

  return {
    terms,
    loading,
    refresh: fetchPopularTerms
  };
};

// Hook for search analytics (for businesses)
export const useSearchAnalytics = () => {
  const [analytics, setAnalytics] = useState<{
    totalSearches: number;
    topTerms: { term: string; count: number }[];
    searchTrends: { date: string; count: number }[];
    avgResultsPerSearch: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async (dateRange?: { start: string; end: string }) => {
    setLoading(true);
    try {
      // This would be implemented in the search service
      // For now, returning placeholder data
      setAnalytics({
        totalSearches: 1234,
        topTerms: [
          { term: 'pizza', count: 123 },
          { term: 'coffee', count: 89 },
          { term: 'restaurant', count: 67 }
        ],
        searchTrends: [],
        avgResultsPerSearch: 8.5
      });
    } catch (error) {
      console.error('Error fetching search analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analytics,
    loading,
    fetchAnalytics
  };
};

export default useSearch;