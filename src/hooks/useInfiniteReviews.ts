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
    sort_by?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most-helpful';
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
      // Use service function instead of direct Supabase query
      const { getBusinessReviewsPaginated } = await import('../services/reviewService');

      const data = await getBusinessReviewsPaginated(businessId, {
        offset,
        limit: PAGE_SIZE,
        filters: {
          recommendation: filters?.recommendation,
          sort_by: filters?.sort_by === 'highest_rated' || filters?.sort_by === 'lowest_rated'
            ? 'newest' // Service doesn't support rating sort yet, fallback to newest
            : filters?.sort_by as any
        }
      });

      return data;
    } catch (err) {
      console.error('Error fetching reviews:', err);
      throw err;
    }
  }, [businessId, filters?.sort_by, filters?.recommendation]);

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
