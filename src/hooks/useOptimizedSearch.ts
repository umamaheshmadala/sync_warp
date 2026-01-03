/**
 * Optimized Search Hook - Performance Optimized
 * Story 9.2.5: Search Performance Optimization
 * 
 * This hook provides optimized search for friend discovery with:
 * - 300ms debounce
 * - React Query caching (30s staleTime, 60s gcTime)
 * - Performance timing and monitoring
 * - Slow search logging (> 500ms)
 */

import { useQuery } from '@tanstack/react-query';
import { searchUsers, logSlowSearch } from '../services/searchService';
import { useState, useEffect } from 'react';

/**
 * Debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Optimized search hook with performance monitoring
 * 
 * @param query - Search query string
 * @param options - Search options (limit, offset)
 * @returns React Query result with performance monitoring
 */
export function useOptimizedSearch(
  query: string,
  options: { limit?: number; offset?: number } = {}
) {
  // Optimized debounce (300ms)
  const debouncedQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['optimized-search', debouncedQuery, options],
    queryFn: async () => {
      // Performance timing
      const startTime = performance.now();
      
      try {
        const results = await searchUsers(debouncedQuery, options);
        const duration = performance.now() - startTime;
        
        // Log slow searches (> 500ms)
        await logSlowSearch(debouncedQuery, duration, results.length);
        
        return {
          results,
          duration,
          timestamp: Date.now(),
        };
      } catch (error) {
        const duration = performance.now() - startTime;
        console.error('Search failed:', { query: debouncedQuery, duration, error });
        throw error;
      }
    },
    enabled: debouncedQuery.length >= 2,
    
    // Performance-optimized caching
    staleTime: 30000, // 30 seconds (matches SEARCH_CACHE_TTL)
    gcTime: 60000, // 1 minute (formerly cacheTime)
    
    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    
    // Refetch configuration (optimized for performance)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting
  });
}
