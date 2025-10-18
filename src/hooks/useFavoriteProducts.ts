// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Hook: useFavoriteProducts - Fetch all favorite products
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export interface FavoriteProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_urls: string[];
  category: string | null;
  is_available: boolean;
  business_id: string;
  business_name: string;
  favorited_at: string;
}

/**
 * Hook to fetch all favorite products for the current user
 * 
 * Features:
 * - Fetches favorite products with product and business details
 * - Automatically refetches when user changes
 * - Provides loading and error states
 * - Ordered by most recently favorited
 * 
 * @returns Object with products array, loading state, error, and refetch function
 */
export function useFavoriteProducts() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch favorite products from database
   */
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First get favorite product IDs
      const { data: favoriteData, error: fetchError } = await supabase
        .from('favorites')
        .select('entity_id, created_at')
        .eq('user_id', user.id)
        .eq('entity_type', 'product')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (!favoriteData || favoriteData.length === 0) {
        setProducts([]);
        return;
      }

      // Get product details
      const productIds = favoriteData.map(f => f.entity_id);
      const { data, error: productsError } = await supabase
        .from('business_products')
        .select(`
          id,
          name,
          description,
          price,
          currency,
          image_urls,
          category,
          is_available,
          business_id,
          businesses (
            business_name
          )
        `)
        .in('id', productIds);

      if (productsError) {
        throw productsError;
      }

      if (fetchError) {
        throw fetchError;
      }

      // Create a map of product ID to favorited_at timestamp
      const favoritedAtMap = new Map(
        favoriteData.map(f => [f.entity_id, f.created_at])
      );

      // Transform data to flat structure and sort by favorited_at
      const transformedProducts: FavoriteProduct[] = (data || [])
        .map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency || 'INR',
          image_urls: product.image_urls || [],
          category: product.category,
          is_available: product.is_available ?? true,
          business_id: product.business_id,
          business_name: product.businesses?.business_name || 'Unknown Business',
          favorited_at: favoritedAtMap.get(product.id) || new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime());

      setProducts(transformedProducts);
    } catch (err) {
      console.error('Error fetching favorite products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch favorite products');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Set up real-time subscription for favorite_products changes
  useEffect(() => {
    if (!user) return;

    console.log('[useFavoriteProducts] Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel(`favorites_products_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${user.id}.and(entity_type=eq.product)`
        },
        (payload) => {
          console.log('[useFavoriteProducts] Realtime change:', payload.eventType);
          // Refetch favorites on any change
          fetchFavorites();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useFavoriteProducts] ✅ Realtime subscription active');
        }
      });

    return () => {
      console.log('[useFavoriteProducts] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, fetchFavorites]);

  /**
   * Remove a product from favorites
   */
  const removeFavorite = useCallback(async (productId: string) => {
    if (!user) {
      toast.error('Please log in to manage favorites');
      return false;
    }

    try {
      // Optimistic update - remove from local state immediately
      setProducts(prev => prev.filter(p => p.id !== productId));

      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('entity_type', 'product')
        .eq('entity_id', productId);

      if (deleteError) {
        // Revert optimistic update on error
        await fetchFavorites();
        throw deleteError;
      }

      toast.success('Removed from favorites');
      return true;
    } catch (err) {
      console.error('Error removing favorite:', err);
      toast.error('Failed to remove from favorites');
      return false;
    }
  }, [user, fetchFavorites]);

  return {
    products,
    loading,
    error,
    refetch: fetchFavorites,
    removeFavorite,
    count: products.length,
  };
}

export default useFavoriteProducts;
