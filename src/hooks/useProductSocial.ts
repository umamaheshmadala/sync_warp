// useProductSocial.ts
// Product-specific social features hook
// Wraps useEnhancedFavorites to provide product favorite, wishlist, and share functionality

import { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useEnhancedFavorites } from './useEnhancedFavorites';
import type { Product } from '../types/product';

interface UseProductSocialReturn {
  // Favorite operations
  isFavorited: (productId: string) => boolean;
  toggleFavorite: (product: Product) => Promise<void>;
  
  // Wishlist operations
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  
  // Counts and stats
  favoritedProducts: Array<{ id: string; name: string; metadata: any }>;
  wishlistProducts: Array<{ id: string; name: string; metadata: any }>;
  favoriteCount: number;
  wishlistCount: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for product-specific social features (favorites and wishlist)
 * Leverages the existing enhanced favorites infrastructure
 */
export const useProductSocial = (): UseProductSocialReturn => {
  const {
    favorites,
    isFavorited: checkFavorited,
    toggleFavorite: toggleFavoriteBase,
    updateFavorite,
    isLoading,
    error,
  } = useEnhancedFavorites();

  // Filter product favorites and wishlists
  const productFavorites = useMemo(
    () => favorites.filter(fav => fav.item_type === 'product'),
    [favorites]
  );

  const favoritedProducts = useMemo(
    () => productFavorites
      .filter(fav => !fav.is_wishlist)
      .map(fav => ({
        id: fav.item_id,
        name: fav.metadata?.name || 'Unknown Product',
        metadata: fav.metadata,
      })),
    [productFavorites]
  );

  const wishlistProducts = useMemo(
    () => productFavorites
      .filter(fav => fav.is_wishlist)
      .map(fav => ({
        id: fav.item_id,
        name: fav.metadata?.name || 'Unknown Product',
        metadata: fav.metadata,
      })),
    [productFavorites]
  );

  // Check if product is favorited (not in wishlist)
  const isFavorited = useCallback(
    (productId: string): boolean => {
      const favorite = productFavorites.find(fav => fav.item_id === productId);
      return favorite ? !favorite.is_wishlist : false;
    },
    [productFavorites]
  );

  // Check if product is in wishlist
  const isInWishlist = useCallback(
    (productId: string): boolean => {
      const favorite = productFavorites.find(fav => fav.item_id === productId);
      return favorite ? favorite.is_wishlist : false;
    },
    [productFavorites]
  );

  // Toggle favorite status (regular favorite, not wishlist)
  const toggleFavorite = useCallback(
    async (product: Product): Promise<void> => {
      try {
        const currentlyFavorited = isFavorited(product.id);
        const inWishlist = isInWishlist(product.id);

        // If in wishlist, convert to regular favorite
        if (inWishlist) {
          const wishlistItem = productFavorites.find(
            fav => fav.item_id === product.id && fav.is_wishlist
          );
          if (wishlistItem) {
            await updateFavorite(wishlistItem.id, { is_wishlist: false });
            toast.success('Moved to favorites!');
            return;
          }
        }

        // Create metadata for the product
        const productMetadata = {
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          image_url: product.image_urls?.[0],
          business_id: product.business_id,
          is_available: product.is_available,
        };

        // Toggle favorite
        await toggleFavoriteBase(product.id, 'product', productMetadata);
        
        if (currentlyFavorited) {
          toast.success('Removed from favorites');
        } else {
          toast.success('Added to favorites!');
        }
      } catch (error) {
        console.error('Failed to toggle product favorite:', error);
        toast.error('Failed to update favorites');
        throw error;
      }
    },
    [isFavorited, isInWishlist, productFavorites, toggleFavoriteBase, updateFavorite]
  );

  // Toggle wishlist status
  const toggleWishlist = useCallback(
    async (product: Product): Promise<void> => {
      try {
        const currentlyInWishlist = isInWishlist(product.id);
        const isFav = isFavorited(product.id);

        // If it's a regular favorite, convert to wishlist
        if (isFav) {
          const favoriteItem = productFavorites.find(
            fav => fav.item_id === product.id && !fav.is_wishlist
          );
          if (favoriteItem) {
            await updateFavorite(favoriteItem.id, { is_wishlist: true });
            toast.success('Moved to wishlist!');
            return;
          }
        }

        // Create metadata for the product
        const productMetadata = {
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          image_url: product.image_urls?.[0],
          business_id: product.business_id,
          is_available: product.is_available,
        };

        if (currentlyInWishlist) {
          // Remove from wishlist (and favorites entirely)
          await toggleFavoriteBase(product.id, 'product', productMetadata);
          toast.success('Removed from wishlist');
        } else {
          // Add as wishlist item
          const existing = productFavorites.find(fav => fav.item_id === product.id);
          if (existing) {
            await updateFavorite(existing.id, { is_wishlist: true });
          } else {
            await toggleFavoriteBase(product.id, 'product', productMetadata);
            const newItem = productFavorites.find(fav => fav.item_id === product.id);
            if (newItem) {
              await updateFavorite(newItem.id, { is_wishlist: true });
            }
          }
          toast.success('Added to wishlist!');
        }
      } catch (error) {
        console.error('Failed to toggle product wishlist:', error);
        toast.error('Failed to update wishlist');
        throw error;
      }
    },
    [isInWishlist, isFavorited, productFavorites, toggleFavoriteBase, updateFavorite]
  );

  // Add to wishlist (always sets wishlist flag)
  const addToWishlist = useCallback(
    async (product: Product): Promise<void> => {
      if (isInWishlist(product.id)) {
        toast.info('Already in wishlist');
        return;
      }
      await toggleWishlist(product);
    },
    [isInWishlist, toggleWishlist]
  );

  // Remove from wishlist
  const removeFromWishlist = useCallback(
    async (productId: string): Promise<void> => {
      const wishlistItem = productFavorites.find(
        fav => fav.item_id === productId && fav.is_wishlist
      );
      
      if (!wishlistItem) {
        toast.info('Not in wishlist');
        return;
      }

      try {
        // Remove entirely (toggle off)
        await toggleFavoriteBase(productId, 'product', wishlistItem.metadata);
        toast.success('Removed from wishlist');
      } catch (error) {
        console.error('Failed to remove from wishlist:', error);
        toast.error('Failed to remove from wishlist');
        throw error;
      }
    },
    [productFavorites, toggleFavoriteBase]
  );

  return {
    // Favorite operations
    isFavorited,
    toggleFavorite,
    
    // Wishlist operations
    isInWishlist,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    
    // Counts and data
    favoritedProducts,
    wishlistProducts,
    favoriteCount: favoritedProducts.length,
    wishlistCount: wishlistProducts.length,
    
    // States
    isLoading,
    error,
  };
};

export default useProductSocial;
