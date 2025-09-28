// useAdvancedSearch.ts
// Custom hook for advanced search functionality with filters, location, and recommendations

import { useState, useEffect, useCallback, useMemo } from 'react';
import advancedSearchService, {
  SearchFilters,
  BusinessSearchResult,
  CouponSearchResult,
  SearchSuggestion,
  DiscoverySection
} from '../services/advancedSearchService';
import { useAdvancedLocation } from './useAdvancedLocation';
import { useFavoriteChecker } from './useEnhancedFavorites';

interface SearchState {
  businesses: BusinessSearchResult[];
  coupons: CouponSearchResult[];
  suggestions: SearchSuggestion[];
  discoverySections: DiscoverySection[];
  categories: Array<{
    name: string;
    count: number;
    description?: string;
    icon?: string;
  }>;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
}

interface UseAdvancedSearchReturn extends SearchState {
  // Search methods
  searchBusinesses: (filters: SearchFilters) => Promise<void>;
  searchMore: () => Promise<void>;
  clearSearch: () => void;
  
  // Discovery methods
  loadDiscoverySections: () => Promise<void>;
  getPersonalizedRecommendations: () => Promise<BusinessSearchResult[]>;
  getTrendingCoupons: (limit?: number) => Promise<CouponSearchResult[]>;
  
  // Suggestion methods
  getSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;
  
  // Category methods
  loadCategories: () => Promise<void>;
  searchByCategory: (category: string) => Promise<void>;
  
  // Filter helpers
  currentFilters: SearchFilters;
  updateFilters: (newFilters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  
  // Location helpers
  searchNearby: (radius?: number) => Promise<void>;
  
  // Favorites integration
  isFavorited: (itemId: string, itemType: string) => boolean;
  toggleFavorite: (itemId: string, itemType: string, itemData?: any) => Promise<void>;
}

export const useAdvancedSearch = (): UseAdvancedSearchReturn => {
  const { currentLocation } = useAdvancedLocation();
  const { isFavorited, toggleFavorite } = useFavoriteChecker();
  
  const [state, setState] = useState<SearchState>({
    businesses: [],
    coupons: [],
    suggestions: [],
    discoverySections: [],
    categories: [],
    isLoading: false,
    isSearching: false,
    error: null,
    total: 0,
    hasMore: false
  });

  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [searchOffset, setSearchOffset] = useState(0);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update businesses with favorites status when they change
  const businessesWithFavorites = useMemo(() => {
    return state.businesses.map(business => ({
      ...business,
      is_favorited: isFavorited(business.id, 'business')
    }));
  }, [state.businesses, isFavorited]);

  const loadInitialData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await Promise.all([
        loadCategories(),
        loadDiscoverySections()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load initial data'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchBusinesses = useCallback(async (filters: SearchFilters) => {
    setState(prev => ({ ...prev, isSearching: true, error: null }));
    setCurrentFilters(filters);
    setSearchOffset(0);
    
    try {
      // Add location from GPS if not provided but available
      const searchFilters = {
        ...filters,
        location: filters.location || (currentLocation ? {
          latitude: currentLocation.coordinates.latitude,
          longitude: currentLocation.coordinates.longitude,
          radius: filters.location?.radius || 50
        } : undefined)
      };

      const result = await advancedSearchService.searchBusinesses(searchFilters);
      
      setState(prev => ({
        ...prev,
        businesses: result.businesses,
        total: result.total,
        hasMore: result.hasMore,
        isSearching: false
      }));
      
      setSearchOffset(result.businesses.length);
    } catch (error) {
      console.error('Search businesses error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to search businesses',
        isSearching: false
      }));
    }
  }, [currentLocation]);

  const searchMore = useCallback(async () => {
    if (!state.hasMore || state.isSearching) return;
    
    setState(prev => ({ ...prev, isSearching: true }));
    
    try {
      const filters = {
        ...currentFilters,
        offset: searchOffset
      };

      const result = await advancedSearchService.searchBusinesses(filters);
      
      setState(prev => ({
        ...prev,
        businesses: [...prev.businesses, ...result.businesses],
        hasMore: result.hasMore,
        isSearching: false
      }));
      
      setSearchOffset(prev => prev + result.businesses.length);
    } catch (error) {
      console.error('Search more error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load more results',
        isSearching: false
      }));
    }
  }, [currentFilters, searchOffset, state.hasMore, state.isSearching]);

  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      businesses: [],
      total: 0,
      hasMore: false,
      error: null
    }));
    setCurrentFilters({});
    setSearchOffset(0);
  }, []);

  const loadDiscoverySections = useCallback(async () => {
    try {
      const userLocation = currentLocation ? {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude
      } : undefined;

      const sections = await advancedSearchService.getDiscoverySections(userLocation);
      
      setState(prev => ({
        ...prev,
        discoverySections: sections
      }));
    } catch (error) {
      console.error('Load discovery sections error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load discovery sections'
      }));
    }
  }, [currentLocation]);

  const getPersonalizedRecommendations = useCallback(async (): Promise<BusinessSearchResult[]> => {
    try {
      return await advancedSearchService.getPersonalizedRecommendations();
    } catch (error) {
      console.error('Get personalized recommendations error:', error);
      return [];
    }
  }, []);

  const getTrendingCoupons = useCallback(async (limit: number = 10): Promise<CouponSearchResult[]> => {
    try {
      const coupons = await advancedSearchService.getTrendingCoupons(limit);
      setState(prev => ({ ...prev, coupons }));
      return coupons;
    } catch (error) {
      console.error('Get trending coupons error:', error);
      return [];
    }
  }, []);

  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setState(prev => ({ ...prev, suggestions: [] }));
      return;
    }
    
    try {
      const suggestions = await advancedSearchService.getSearchSuggestions(query);
      setState(prev => ({ ...prev, suggestions }));
    } catch (error) {
      console.error('Get suggestions error:', error);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, suggestions: [] }));
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const categories = await advancedSearchService.getBusinessCategories();
      setState(prev => ({ ...prev, categories }));
    } catch (error) {
      console.error('Load categories error:', error);
      throw error;
    }
  }, []);

  const searchByCategory = useCallback(async (category: string) => {
    const filters: SearchFilters = {
      categories: [category],
      sortBy: 'rating'
    };
    await searchBusinesses(filters);
  }, [searchBusinesses]);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...currentFilters, ...newFilters };
    searchBusinesses(updatedFilters);
  }, [currentFilters, searchBusinesses]);

  const resetFilters = useCallback(() => {
    setCurrentFilters({});
    clearSearch();
  }, [clearSearch]);

  const searchNearby = useCallback(async (radius: number = 10) => {
    if (!currentLocation) {
      setState(prev => ({
        ...prev,
        error: 'Location not available. Please enable location services.'
      }));
      return;
    }

    const filters: SearchFilters = {
      location: {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        radius
      },
      sortBy: 'distance'
    };
    
    await searchBusinesses(filters);
  }, [currentLocation, searchBusinesses]);

  return {
    // State
    businesses: businessesWithFavorites,
    coupons: state.coupons,
    suggestions: state.suggestions,
    discoverySections: state.discoverySections,
    categories: state.categories,
    isLoading: state.isLoading,
    isSearching: state.isSearching,
    error: state.error,
    total: state.total,
    hasMore: state.hasMore,
    
    // Search methods
    searchBusinesses,
    searchMore,
    clearSearch,
    
    // Discovery methods
    loadDiscoverySections,
    getPersonalizedRecommendations,
    getTrendingCoupons,
    
    // Suggestion methods
    getSuggestions,
    clearSuggestions,
    
    // Category methods
    loadCategories,
    searchByCategory,
    
    // Filter helpers
    currentFilters,
    updateFilters,
    resetFilters,
    
    // Location helpers
    searchNearby,
    
    // Favorites integration
    isFavorited,
    toggleFavorite
  };
};

export default useAdvancedSearch;