// =====================================================
// Story 5.2: Binary Review System - useReviews Hook
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import reviewService from '../services/reviewService';
import type {
  BusinessReviewWithDetails,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewFilters,
} from '../types/review';

interface UseReviewsOptions {
  businessId?: string;
  userId?: string;
  filters?: ReviewFilters;
  realtime?: boolean; // Enable real-time subscriptions
}

interface UseReviewsReturn {
  reviews: BusinessReviewWithDetails[];
  loading: boolean;
  error: string | null;
  refreshReviews: () => Promise<void>;
  createReview: (input: CreateReviewInput) => Promise<void>;
  updateReview: (reviewId: string, input: UpdateReviewInput) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  hasUserReviewed: boolean;
  userReview: BusinessReviewWithDetails | null;
}

/**
 * Hook for managing reviews
 * Supports business reviews, user reviews, and real-time updates
 */
export function useReviews(options: UseReviewsOptions = {}): UseReviewsReturn {
  const { businessId, userId, filters, realtime = false } = options;

  const [reviews, setReviews] = useState<BusinessReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [userReview, setUserReview] = useState<BusinessReviewWithDetails | null>(null);

  /**
   * Load reviews based on options
   */
  const loadReviews = useCallback(async () => {
    console.log('🔄 Loading reviews with options:', options);
    setLoading(true);
    setError(null);

    try {
      if (businessId) {
        // Load reviews for a specific business
        const data = await reviewService.getBusinessReviews(businessId, filters);
        setReviews(data);

        // Check if current user has reviewed
        const userReviewData = await reviewService.getUserBusinessReview(businessId);
        setUserReview(userReviewData);
        setHasUserReviewed(!!userReviewData);
      } else if (userId) {
        // Load reviews by a specific user
        const data = await reviewService.getUserReviews(userId);
        setReviews(data);
      } else {
        // Load current user's reviews
        const data = await reviewService.getUserReviews();
        setReviews(data);
      }
    } catch (err) {
      console.error('❌ Load reviews error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [businessId, userId, filters]);

  /**
   * Create a new review
   */
  const createReviewHandler = useCallback(async (input: CreateReviewInput) => {
    console.log('📝 Creating review:', input);
    setError(null);

    try {
      await reviewService.createReview(input);
      
      // Reload reviews to show the new one
      await loadReviews();
      
      console.log('✅ Review created successfully');
    } catch (err) {
      console.error('❌ Create review error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create review';
      setError(errorMessage);
      throw err; // Re-throw so UI can handle it
    }
  }, [loadReviews]);

  /**
   * Update an existing review
   */
  const updateReviewHandler = useCallback(async (reviewId: string, input: UpdateReviewInput) => {
    console.log('✏️ Updating review:', reviewId, input);
    setError(null);

    try {
      await reviewService.updateReview(reviewId, input);
      
      // Reload reviews to show the updated one
      await loadReviews();
      
      console.log('✅ Review updated successfully');
    } catch (err) {
      console.error('❌ Update review error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update review';
      setError(errorMessage);
      throw err;
    }
  }, [loadReviews]);

  /**
   * Delete a review
   */
  const deleteReviewHandler = useCallback(async (reviewId: string) => {
    console.log('🗑️ Deleting review:', reviewId);
    setError(null);

    try {
      await reviewService.deleteReview(reviewId);
      
      // Reload reviews to remove the deleted one
      await loadReviews();
      
      console.log('✅ Review deleted successfully');
    } catch (err) {
      console.error('❌ Delete review error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete review';
      setError(errorMessage);
      throw err;
    }
  }, [loadReviews]);

  /**
   * Set up real-time subscriptions for review changes
   */
  useEffect(() => {
    if (!realtime || !businessId) {
      return;
    }

    console.log('🔴 Setting up realtime subscription for reviews');

    const channel = supabase
      .channel(`business_reviews_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_reviews',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('🔄 Review changed:', payload);
          
          // Reload reviews when any change occurs
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      console.log('🔴 Cleaning up realtime subscription');
      channel.unsubscribe();
    };
  }, [realtime, businessId, loadReviews]);

  /**
   * Load reviews on mount and when dependencies change
   */
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return {
    reviews,
    loading,
    error,
    refreshReviews: loadReviews,
    createReview: createReviewHandler,
    updateReview: updateReviewHandler,
    deleteReview: deleteReviewHandler,
    hasUserReviewed,
    userReview,
  };
}

export default useReviews;
