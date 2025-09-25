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

  // Search state
  const [searchState, setSearchState] = useState<SearchState>(() => {
    // Initialize from URL params if available
    const urlQuery = searchParams.get('q') || '';
    const urlSort = searchParams.get('sort') as SearchSortField || defaultSort.field;
    const urlOrder = searchParams.get('order') as 'asc' | 'desc' || defaultSort.order;
    const urlPage = parseInt(searchParams.get('page') || '1');

    return {
      query: urlQuery,
      filters: { ...defaultFilters, validOnly: true, isPublic: true },
      sort: { field: urlSort, order: urlOrder },
      pagination: { page: urlPage, limit: pageSize },
      isSearching: false,
      hasSearched: false,
      error: null
    };
  });

  // Search results
  const [results, setResults] = useState<SearchResults>({
    coupons: [],
    businesses: [],
    totalCoupons: 0,
    totalBusinesses: 0,
    suggestions: [],
    searchTime: 0,
    hasMore: false
  });

  // Refs for managing state updates
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController>();

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
      filters: searchState.filters,
      sort: searchState.sort,
      pagination: searchState.pagination
    };

    // Don't search empty queries or only whitespace
    if (!queryToUse.q.trim() && Object.keys(queryToUse.filters).filter(key => queryToUse.filters[key]).length === 0) {
      console.log('🔍 Skipping search - empty query and no filters');
      setResults({
        coupons: [],
        businesses: [],
        totalCoupons: 0,
        totalBusinesses: 0,
        suggestions: [],
        searchTime: 0,
        hasMore: false
      });
      setSearchState(prev => ({ ...prev, hasSearched: false, isSearching: false }));
      return null;
    }

    setSearchState(prev => ({ 
      ...prev, 
      isSearching: true, 
      error: null,
      hasSearched: true 
    }));

    try {
      // Temporarily using simple search service for testing
      const simpleResult = await simpleSearchService.search({
        q: queryToUse.q,
        limit: queryToUse.pagination.limit
      });
      
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
    setSearchState(prev => ({
      ...prev,
      query,
      pagination: { ...prev.pagination, page: 1 } // Reset to first page
    }));

    if (autoSearch) {
      debouncedSearch();
    }
  }, [autoSearch, debouncedSearch]);

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

    // Computed
    activeFiltersCount,
    
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