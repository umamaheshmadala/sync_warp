// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Hook: useFavoriteProducts - Fetch all favorite products
// =====================================================

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  // Query key
  const queryKey = ['favoriteProducts', user?.id];

  // Fetch function
  const fetchFavorites = async (): Promise<FavoriteProduct[]> => {
    if (!user) return [];

    try {
      // First get favorite product IDs
      const { data: favoriteData, error: fetchError } = await supabase
        .from('favorites')
        .select('entity_id, created_at')
        .eq('user_id', user.id)
        .eq('entity_type', 'product')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!favoriteData || favoriteData.length === 0) return [];

      // Get product details
      const productIds = favoriteData.map(f => f.entity_id);
      const { data, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          currency,
          images,
          category,
          status,
          business_id,
          businesses (
            business_name
          )
        `)
        .in('id', productIds);

      if (productsError) throw productsError;

      // Create a map of product ID to favorited_at timestamp
      const favoritedAtMap = new Map(
        favoriteData.map(f => [f.entity_id, f.created_at])
      );

      // Transform data to flat structure and sort by favorited_at
      const transformedProducts: FavoriteProduct[] = (data || [])
        .map(product => {
          // Extract image URLs form images JSONB
          let imageUrls: string[] = [];
          if (product.images && Array.isArray(product.images)) {
            imageUrls = product.images.map((img: any) =>
              typeof img === 'string' ? img : img.url
            ).filter(Boolean);
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency || 'INR',
            image_urls: imageUrls,
            category: product.category,
            is_available: product.status === 'published',
            business_id: product.business_id,
            business_name: Array.isArray(product.businesses) ? product.businesses[0]?.business_name : (product.businesses as any)?.business_name || 'Unknown Business',
            favorited_at: favoritedAtMap.get(product.id) || new Date().toISOString(),
          };
        })
        .sort((a, b) => new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime());

      return transformedProducts;
    } catch (err) {
      console.error('Error fetching favorite products:', err);
      throw err;
    }
  };

  // React Query hook
  const {
    data: products = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey,
    queryFn: fetchFavorites,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Set up real-time subscription for favorite_products changes
  useEffect(() => {
    if (!user) return;

    console.log('[useFavoriteProducts] Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel(`favorites_products_swr_${user.id}`)
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
          // Invalidate query to refetch
          queryClient.invalidateQueries({ queryKey });
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
  }, [user, queryClient]); // queryKey stable via closure

  /**
   * Remove a product from favorites
   */
  const removeFavorite = useCallback(async (productId: string) => {
    if (!user) {
      toast.error('Please log in to manage favorites');
      return false;
    }

    try {
      // Optimistic update
      const previousData = queryClient.getQueryData<FavoriteProduct[]>(queryKey);

      queryClient.setQueryData(queryKey, (old: FavoriteProduct[] | undefined) => {
        return (old || []).filter(p => p.id !== productId);
      });

      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('entity_type', 'product')
        .eq('entity_id', productId);

      if (deleteError) {
        // Revert optimistic update
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
        throw deleteError;
      }

      toast.success('Removed from favorites');
      return true;
    } catch (err) {
      console.error('Error removing favorite:', err);
      toast.error('Failed to remove from favorites');
      // Invalidate on error to ensure correct state
      queryClient.invalidateQueries({ queryKey });
      return false;
    }
  }, [user, queryClient, queryKey]);

  return {
    products,
    loading: isLoading,
    error: queryError instanceof Error ? queryError.message : (queryError as string | null),
    refetch: async () => { await refetch() },
    removeFavorite,
    count: products.length,
  };
}

export default useFavoriteProducts;
