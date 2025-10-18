// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Hook: useFavoriteProducts - Fetch all favorite products
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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
      const { data, error: fetchError } = await supabase
        .from('favorite_products')
        .select(`
          id,
          created_at,
          product_id,
          business_products (
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
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to flat structure
      const transformedProducts: FavoriteProduct[] = (data || [])
        .filter(fav => fav.business_products) // Filter out any null products
        .map(fav => ({
          id: fav.business_products.id,
          name: fav.business_products.name,
          description: fav.business_products.description,
          price: fav.business_products.price,
          currency: fav.business_products.currency || 'INR',
          image_urls: fav.business_products.image_urls || [],
          category: fav.business_products.category,
          is_available: fav.business_products.is_available ?? true,
          business_id: fav.business_products.business_id,
          business_name: fav.business_products.businesses?.business_name || 'Unknown Business',
          favorited_at: fav.created_at,
        }));

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

  return {
    products,
    loading,
    error,
    refetch: fetchFavorites,
    count: products.length,
  };
}

export default useFavoriteProducts;
