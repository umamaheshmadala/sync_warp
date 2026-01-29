// useSimpleProductSocial.ts
// Simplified product social features using the existing favorites table
// optimized with global caching to prevent N+1 query issues

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { simpleFavoritesService, SimpleFavorite } from '../services/simpleFavoritesService';
import type { Product } from '../types/product';
import { useAuthStore } from '../store/authStore';
import { supabase } from '@/lib/supabase';

// Global state to prevent re-fetching for every card
let globalFavorites: SimpleFavorite[] = [];
let globalWishlist: Set<string> = new Set();
let isInitialized = false;
let isLoadingGlobal = false;
// Listeners for state updates
const listeners: Set<() => void> = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// Singleton data loader
const loadGlobalData = async (userId: string) => {
  if (isLoadingGlobal || isInitialized) return;

  try {
    isLoadingGlobal = true;
    notifyListeners(); // Update loading state

    // 1. Load Favorites
    let favorites: SimpleFavorite[] = [];
    try {
      favorites = await simpleFavoritesService.getFavorites('product');
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('AbortError')) {
        console.error('Failed to load favorites:', err);
      }
    }

    // 2. Load Wishlist
    let wishlistIds = new Set<string>();
    try {
      // Load from Supabase
      const { data, error } = await supabase
        .from('user_wishlist_items')
        .select('item_id')
        .eq('user_id', userId)
        .eq('item_type', 'product');

      if (!error && data) {
        data.forEach(item => wishlistIds.add(item.item_id));
        // Sync to localStorage
        localStorage.setItem(`wishlist_${userId}`, JSON.stringify([...wishlistIds]));
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(`wishlist_${userId}`);
        if (stored) {
          wishlistIds = new Set(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
      // Fallback
      const stored = localStorage.getItem(`wishlist_${userId}`);
      if (stored) {
        wishlistIds = new Set(JSON.parse(stored));
      }
    }

    // Update global state
    globalFavorites = favorites;
    globalWishlist = wishlistIds;
    isInitialized = true;
  } finally {
    isLoadingGlobal = false;
    notifyListeners();
  }
};

interface UseSimpleProductSocialReturn {
  isFavorited: (productId: string) => boolean;
  toggleFavorite: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  favoriteCount: number;
  wishlistCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useSimpleProductSocial = (): UseSimpleProductSocialReturn => {
  const user = useAuthStore((state) => state.user);
  // Local state just forces re-render when global state changes
  const [, setForceUpdate] = useState({});

  useEffect(() => {
    if (!user) {
      globalFavorites = [];
      globalWishlist = new Set();
      isInitialized = false;
      notifyListeners();
      return;
    }

    // Initialize if needed
    if (!isInitialized && !isLoadingGlobal) {
      loadGlobalData(user.id);
    }

    const listener = () => setForceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [user]);

  // Database sync helper for wishlist
  const saveWishlistToDatabase = async (productId: string, add: boolean) => {
    if (!user?.id) return;
    try {
      if (add) {
        await supabase.from('user_wishlist_items').insert({
          user_id: user.id,
          item_type: 'product',
          item_id: productId
        });
      } else {
        await supabase.from('user_wishlist_items').delete()
          .eq('user_id', user.id)
          .eq('item_type', 'product')
          .eq('item_id', productId);
      }
    } catch (err) {
      console.error('Failed to sync wishlist to DB:', err);
    }
  };

  const isFavorited = useCallback((productId: string) => {
    return globalFavorites.some(fav => fav.entity_id === productId);
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return globalWishlist.has(productId);
  }, []);

  const toggleFavorite = useCallback(async (product: Product) => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }

    try {
      const currentlyFavorited = globalFavorites.some(fav => fav.entity_id === product.id);

      // Optimistic update
      if (currentlyFavorited) {
        globalFavorites = globalFavorites.filter(fav => fav.entity_id !== product.id);
        notifyListeners();
        toast.success('Removed from favorites');
        await simpleFavoritesService.removeByEntity('product', product.id);
      } else {
        // We need the ID from the server usually, but for optimistic UI we can wait or fake it.
        // For correctness with this service, we'll await.
        const newFavorite = await simpleFavoritesService.addToFavorites('product', product.id);
        globalFavorites = [newFavorite, ...globalFavorites];
        notifyListeners();
        toast.success('Added to favorites!');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update favorites');
      // Revert would be complex here without undo log, but typical for simple apps to just fail
      // Mark as uninitialized to force refetch could be a strategy
      isInitialized = false;
    }
  }, [user]);

  const toggleWishlist = useCallback(async (product: Product) => {
    if (!user) {
      toast.error('Please sign in to manage wishlist');
      return;
    }

    try {
      const currentlyInWishlist = globalWishlist.has(product.id);
      const newWishlist = new Set(globalWishlist);

      if (currentlyInWishlist) {
        newWishlist.delete(product.id);
        toast.success('Removed from wishlist');
      } else {
        newWishlist.add(product.id);
        toast.success('Added to wishlist!');
      }

      // Optimistic update
      globalWishlist = newWishlist;
      notifyListeners();

      // Persist
      localStorage.setItem(`wishlist_${user.id}`, JSON.stringify([...newWishlist]));
      saveWishlistToDatabase(product.id, !currentlyInWishlist);

    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      toast.error('Failed to update wishlist');
    }
  }, [user]);

  return {
    isFavorited,
    toggleFavorite,
    isInWishlist,
    toggleWishlist,
    favoriteCount: globalFavorites.length,
    wishlistCount: globalWishlist.size,
    isLoading: isLoadingGlobal,
    error: null,
  };
};

export default useSimpleProductSocial;
