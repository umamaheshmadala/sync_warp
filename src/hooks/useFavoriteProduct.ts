// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Hook: useFavoriteProduct - Toggle product favorite status
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

/**
 * Hook to manage product favorite status
 * 
 * Features:
 * - Checks if product is currently favorited
 * - Toggles favorite status with optimistic UI
 * - Shows toast notifications
 * - Handles authentication state
 * 
 * @param productId - The product ID to favorite/unfavorite
 * @param productName - Optional product name for toast messages
 * @returns Object with favorite state and toggle function
 */
export function useFavoriteProduct(productId: string, productName?: string) {
  const { user } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  /**
   * Check if product is currently favorited
   */
  const checkFavoriteStatus = useCallback(async () => {
    if (!user) {
      setIsFavorited(false);
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error);
      }

      setIsFavorited(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setChecking(false);
    }
  }, [user, productId]);

  // Check favorite status on mount and when dependencies change
  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback(async () => {
    // Check authentication
    if (!user) {
      toast.error('Please sign in to favorite products');
      return false;
    }

    // Prevent multiple simultaneous requests
    if (loading) {
      return false;
    }

    setLoading(true);

    // Optimistic UI update
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      if (previousState) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorite_products')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) throw error;

        toast.success(
          productName 
            ? `${productName} removed from favorites` 
            : 'Removed from favorites'
        );
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorite_products')
          .insert({
            user_id: user.id,
            product_id: productId,
          });

        if (error) {
          // Handle duplicate error gracefully
          if (error.code === '23505') {
            console.log('Product already favorited');
            setIsFavorited(true);
            return true;
          }
          throw error;
        }

        toast.success(
          productName 
            ? `❤️ ${productName} added to favorites!` 
            : '❤️ Added to favorites!',
          {
            duration: 3000,
            icon: '❤️',
          }
        );
      }

      return true;
    } catch (error) {
      // Revert optimistic update on error
      setIsFavorited(previousState);
      
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites. Please try again.');
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, productId, productName, isFavorited, loading]);

  return {
    isFavorited,
    loading,
    checking,
    toggleFavorite,
    refetch: checkFavoriteStatus,
  };
}

export default useFavoriteProduct;
