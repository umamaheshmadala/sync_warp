// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Hook: useInfiniteReviews - Infinite scroll pagination for reviews
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { BusinessReviewWithDetails } from '../types/review';

const PAGE_SIZE = 10;

export interface UseInfiniteReviewsOptions {
  businessId: string;
  filters?: {
    sort_by?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated';
    recommendation?: boolean;
  };
}

/**
 * Hook for infinite scroll pagination of reviews
 * 
 * Features:
 * - Loads reviews in pages of 10
 * - Supports sorting and filtering
 * - Tracks if more reviews available
 * - Provides loadMore function for infinite scroll
 * 
 * @param options - Configuration options
 * @returns Object with reviews, loading state, and loadMore function
 */
export function useInfiniteReviews({ businessId, filters }: UseInfiniteReviewsOptions) {
  const [reviews, setReviews] = useState<BusinessReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch a page of reviews
   */
  const fetchReviews = useCallback(async (pageNum: number) => {
    const offset = (pageNum - 1) * PAGE_SIZE;

    try {
      let query = supabase
        .from('business_reviews_with_details')
        .select('*')
        .eq('business_id', businessId);

      // Apply filters
      if (filters?.recommendation !== undefined) {
        query = query.eq('recommendation', filters.recommendation);
      }

      // Apply sorting
      if (filters?.sort_by) {
        switch (filters.sort_by) {
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          case 'highest_rated':
            // For binary reviews, we can sort by recommendation (true first)
            query = query.order('recommendation', { ascending: false });
            break;
          case 'lowest_rated':
            query = query.order('recommendation', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching reviews:', err);
      throw err;
    }
  }, [businessId, filters]);

  /**
   * Load initial page of reviews
   */
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchReviews(1);
      setReviews(data);
      setHasMore(data.length === PAGE_SIZE);
      setPage(1);
    } catch (err) {
      console.error('Failed to load initial reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [fetchReviews]);

  /**
   * Load next page of reviews
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const data = await fetchReviews(nextPage);

      setReviews(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load more reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more reviews');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchReviews, hasMore, loading, loadingMore, page]);

  /**
   * Refresh all reviews (reset to page 1)
   */
  const refresh = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  // Load initial reviews on mount or when filters change
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    reviews,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    page,
    totalLoaded: reviews.length,
  };
}

export default useInfiniteReviews;
