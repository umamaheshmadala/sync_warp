/**
 * Search Filters Hook
 * Story 9.2.4: Search Filters & Advanced Search
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  searchUsersWithFilters,
  saveSearchFilters,
  loadSearchFilters,
  clearSearchFilters as clearFiltersFromStorage,
  type FriendSearchFilters,
} from '../services/searchService';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

/**
 * Hook for managing search filters with URL sync and persistence
 */
export function useSearchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FriendSearchFilters>(() => {
    // Initialize from URL params or localStorage
    const urlRadius = searchParams.get('radius');
    const urlMutual = searchParams.get('mutual');
    
    if (urlRadius || urlMutual) {
      return {
        location: urlRadius ? { 
          lat: 0, lng: 0, // Will be set from user's location
          radius: parseInt(urlRadius) as 5 | 10 | 25 | 50 
        } : undefined,
        hasMutualFriends: urlMutual === 'true',
      };
    }
    
    return loadSearchFilters();
  });

  // Save filters to localStorage on change
  useEffect(() => {
    saveSearchFilters(filters);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (filters.location?.radius) {
      newParams.set('radius', filters.location.radius.toString());
    } else {
      newParams.delete('radius');
    }
    if (filters.hasMutualFriends) {
      newParams.set('mutual', 'true');
    } else {
      newParams.delete('mutual');
    }
    setSearchParams(newParams, { replace: true });
  }, [filters]);

  const updateFilters = (newFilters: Partial<FriendSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
    clearFiltersFromStorage();
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = () => {
    return !!(filters.location?.radius || filters.hasMutualFriends || filters.sharedInterests?.length);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.location?.radius) count++;
    if (filters.hasMutualFriends) count++;
    if (filters.sharedInterests?.length) count++;
    return count;
  };

  return {
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    activeFilterCount: getActiveFilterCount(),
  };
}

/**
 * Hook for filtered search with debouncing
 */
export function useFilteredSearch(query: string, filters: FriendSearchFilters) {
  const debouncedQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['search', 'filtered', debouncedQuery, filters],
    queryFn: () => searchUsersWithFilters(debouncedQuery, filters),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}
