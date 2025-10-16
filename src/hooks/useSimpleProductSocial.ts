// useSimpleProductSocial.ts
// Simplified product social features using the existing favorites table
// This hook provides favorite/wishlist/share functionality without requiring enhanced favorites tables

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { simpleFavoritesService, SimpleFavorite } from '../services/simpleFavoritesService';
import type { Product } from '../types/product';
import { useAuthStore } from '../store/authStore';

interface UseSimpleProductSocialReturn {
  // Favorite operations
  isFavorited: (productId: string) => boolean;
  toggleFavorite: (product: Product) => Promise<void>;
  
  // Wishlist operations (for now, we'll store wishlist in localStorage)
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  
  // Counts
  favoriteCount: number;
  wishlistCount: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for product-specific social features (favorites and wishlist)
 * Uses the simple existing favorites table
 */
export const useSimpleProductSocial = (): UseSimpleProductSocialReturn => {
  const user = useAuthStore((state) => state.user);
  const [favorites, setFavorites] = useState<SimpleFavorite[]>([]);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load favorites on mount and when user changes
  useEffect(() => {
    if (user) {
      loadFavorites();
      loadWishlist();
    } else {
      setFavorites([]);
      setWishlist(new Set());
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const data = await simpleFavoritesService.getFavorites('product');
      setFavorites(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load favorites:', err);
      setError('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWishlist = () => {
    try {
      const stored = localStorage.getItem(`wishlist_${user?.id}`);
      if (stored) {
        setWishlist(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    }
  };

  const saveWishlist = (newWishlist: Set<string>) => {
    try {
      localStorage.setItem(`wishlist_${user?.id}`, JSON.stringify([...newWishlist]));
      setWishlist(newWishlist);
    } catch (err) {
      console.error('Failed to save wishlist:', err);
    }
  };

  // Check if product is favorited
  const isFavorited = useCallback(
    (productId: string): boolean => {
      return favorites.some(fav => fav.entity_id === productId);
    },
    [favorites]
  );

  // Check if product is in wishlist
  const isInWishlist = useCallback(
    (productId: string): boolean => {
      return wishlist.has(productId);
    },
    [wishlist]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (product: Product): Promise<void> => {
      if (!user) {
        toast.error('Please sign in to save favorites');
        return;
      }

      try {
        const currentlyFavorited = isFavorited(product.id);
        
        if (currentlyFavorited) {
          // Remove from favorites
          await simpleFavoritesService.removeByEntity('product', product.id);
          setFavorites(prev => prev.filter(fav => fav.entity_id !== product.id));
          toast.success('Removed from favorites');
        } else {
          // Add to favorites
          const newFavorite = await simpleFavoritesService.addToFavorites('product', product.id);
          setFavorites(prev => [newFavorite, ...prev]);
          toast.success('Added to favorites!');
        }
      } catch (error) {
        console.error('Failed to toggle product favorite:', error);
        toast.error('Failed to update favorites');
        throw error;
      }
    },
    [user, isFavorited]
  );

  // Toggle wishlist status
  const toggleWishlist = useCallback(
    async (product: Product): Promise<void> => {
      if (!user) {
        toast.error('Please sign in to manage wishlist');
        return;
      }

      try {
        const currentlyInWishlist = isInWishlist(product.id);
        const newWishlist = new Set(wishlist);
        
        if (currentlyInWishlist) {
          newWishlist.delete(product.id);
          saveWishlist(newWishlist);
          toast.success('Removed from wishlist');
        } else {
          newWishlist.add(product.id);
          saveWishlist(newWishlist);
          toast.success('Added to wishlist!');
        }
      } catch (error) {
        console.error('Failed to toggle product wishlist:', error);
        toast.error('Failed to update wishlist');
        throw error;
      }
    },
    [user, isInWishlist, wishlist]
  );

  return {
    // Favorite operations
    isFavorited,
    toggleFavorite,
    
    // Wishlist operations
    isInWishlist,
    toggleWishlist,
    
    // Counts
    favoriteCount: favorites.length,
    wishlistCount: wishlist.size,
    
    // States
    isLoading,
    error,
  };
};

export default useSimpleProductSocial;
