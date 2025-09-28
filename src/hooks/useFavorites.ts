// useFavorites.ts
// Custom hook for managing user favorites (businesses and coupons)
// Provides state management, CRUD operations, and real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

// Types for favorites
export interface FavoriteBusiness {
  business_id: string;
  business_name: string;
  business_type?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  active_coupons_count: number;
  favorited_at: string;
}

export interface FavoriteCoupon {
  coupon_id: string;
  title: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  valid_until: string;
  business_id: string;
  business_name: string;
  is_collected: boolean;
  favorited_at: string;
}

export interface WishlistItem {
  id: string;
  item_type: 'business' | 'coupon' | 'product';
  item_id: string;
  notes?: string;
  priority: number;
  created_at: string;
}

interface FavoritesState {
  businesses: FavoriteBusiness[];
  coupons: FavoriteCoupon[];
  wishlist: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  counts: {
    businesses: number;
    coupons: number;
    wishlist: number;
  };
}

interface UseFavoritesOptions {
  autoLoad?: boolean;
  enableRealtime?: boolean;
  pageSize?: number;
}

export const useFavorites = (options: UseFavoritesOptions = {}) => {
  const {
    autoLoad = true,
    enableRealtime = true,
    pageSize = 20
  } = options;

  const { user } = useAuthStore();
  const [state, setState] = useState<FavoritesState>({
    businesses: [],
    coupons: [],
    wishlist: [],
    isLoading: false,
    error: null,
    counts: {
      businesses: 0,
      coupons: 0,
      wishlist: 0
    }
  });

  // Cache for checking if items are favorited (for performance)
  const favoritesCache = useRef<{
    businesses: Set<string>;
    coupons: Set<string>;
    lastUpdated: number;
  }>({
    businesses: new Set(),
    coupons: new Set(),
    lastUpdated: 0
  });

  // Realtime subscription refs
  const subscriptions = useRef<any[]>([]);

  /**
   * Load user's favorite businesses
   */
  const loadFavoriteBusinesses = useCallback(async (
    offset: number = 0,
    limit: number = pageSize
  ): Promise<FavoriteBusiness[]> => {
    if (!user?.id) {
      return [];
    }

    try {
      
      // First check if tables exist by attempting a simple query
      const tableCheck = await supabase
        .from('user_favorites_businesses')
        .select('id', { count: 'exact' })
        .limit(0);
      
      if (tableCheck.error) {
        if (tableCheck.error.code === '42P01') {
          return [];
        }
      }

      // First try the database function, fallback to direct query
      let data, error;
      
      try {
        const result = await supabase
          .rpc('get_user_favorite_businesses', {
            user_uuid: user.id,
            limit_count: limit,
            offset_count: offset
          });
        data = result.data;
        error = result.error;
      } catch (funcError) {
        // Fallback to direct query with better error handling
        try {
          const result = await supabase
            .from('user_favorites_businesses')
            .select(`
              business_id,
              created_at,
              businesses!inner(
                id,
                business_name,
                business_type,
                description,
                address,
                latitude,
                longitude,
                rating
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
          if (result.error) {
            return [];
          }
          
          data = result.data?.map(item => ({
            business_id: item.business_id,
            business_name: item.businesses.business_name,
            business_type: item.businesses.business_type,
            description: item.businesses.description,
            address: item.businesses.address,
            latitude: item.businesses.latitude,
            longitude: item.businesses.longitude,
            rating: item.businesses.rating,
            active_coupons_count: 0, // Will be calculated separately if needed
            favorited_at: item.created_at
          }));
          error = result.error;
        } catch (directQueryError) {
          return [];
        }
      }

      if (error && error.code !== '42P01') {
        throw error;
      }
      return data || [];
    } catch (error) {
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  }, [user?.id, pageSize]);

  /**
   * Load user's favorite coupons
   */
  const loadFavoriteCoupons = useCallback(async (
    offset: number = 0,
    limit: number = pageSize
  ): Promise<FavoriteCoupon[]> => {
    if (!user?.id) return [];

    try {
      // First check if tables exist by attempting a simple query
      const tableCheck = await supabase
        .from('user_favorites_coupons')
        .select('id', { count: 'exact' })
        .limit(0);
      
      if (tableCheck.error && tableCheck.error.code === '42P01') {
        console.warn('Favorites coupon table does not exist yet');
        return [];
      }

      // First try the database function, fallback to direct query
      let data, error;
      
      try {
        const result = await supabase
          .rpc('get_user_favorite_coupons', {
            user_uuid: user.id,
            limit_count: limit,
            offset_count: offset
          });
        data = result.data;
        error = result.error;
      } catch (funcError) {
        console.warn('Function call failed, using direct query:', funcError);
        
        // Fallback to direct query
        const result = await supabase
          .from('user_favorites_coupons')
          .select(`
            coupon_id,
            created_at,
            business_coupons!inner(
              id,
              title,
              description,
              discount_type,
              discount_value,
              valid_until,
              business_id,
              businesses!inner(
                id,
                business_name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
          
        data = result.data?.map(item => ({
          coupon_id: item.coupon_id,
          title: item.business_coupons.title,
          description: item.business_coupons.description,
          discount_type: item.business_coupons.discount_type,
          discount_value: item.business_coupons.discount_value,
          valid_until: item.business_coupons.valid_until,
          business_id: item.business_coupons.business_id,
          business_name: item.business_coupons.businesses.business_name,
          is_collected: false, // Will be calculated separately if needed
          favorited_at: item.created_at
        }));
        error = result.error;
      }

      if (error && error.code !== '42P01') throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading favorite coupons:', error);
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  }, [user?.id, pageSize]);

  /**
   * Load user's wishlist items
   */
  const loadWishlist = useCallback(async (): Promise<WishlistItem[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('user_wishlist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error && error.code === '42P01') {
        console.warn('Wishlist table does not exist yet');
        return [];
      }
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading wishlist:', error);
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  }, [user?.id]);

  /**
   * Load all favorites data
   */
  const loadFavorites = useCallback(async (showLoading: boolean = true) => {
    if (!user?.id) {
      return;
    }

    if (showLoading) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // Load all three types concurrently but handle failures gracefully
      const [businesses, coupons, wishlist] = await Promise.allSettled([
        loadFavoriteBusinesses(),
        loadFavoriteCoupons(),
        loadWishlist()
      ]).then(results => [
        results[0].status === 'fulfilled' ? results[0].value : [],
        results[1].status === 'fulfilled' ? results[1].value : [],
        results[2].status === 'fulfilled' ? results[2].value : []
      ]);
      
      // Update cache
      favoritesCache.current = {
        businesses: new Set(businesses.map(b => b.business_id)),
        coupons: new Set(coupons.map(c => c.coupon_id)),
        lastUpdated: Date.now()
      };
      

      setState(prev => ({
        ...prev,
        businesses,
        coupons,
        wishlist,
        isLoading: false,
        error: null,
        counts: {
          businesses: businesses.length,
          coupons: coupons.length,
          wishlist: wishlist.length
        }
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load favorites';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [user?.id, loadFavoriteBusinesses, loadFavoriteCoupons, loadWishlist]);

  /**
   * Toggle business favorite status
   */
  const toggleBusinessFavorite = useCallback(async (businessId: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to save favorites');
      return false;
    }

    try {
      // Get current state before making changes
      const currentlyFavorited = favoritesCache.current.businesses.has(businessId);
      let isFavorited: boolean;
      
      try {
        // First try the database function first
        const { data, error } = await supabase
          .rpc('toggle_business_favorite', { business_uuid: businessId });

        if (error && error.code === '42P01') {
          toast.error('Favorites feature is not available yet. Please contact support.');
          return false;
        }
        if (error && error.code === '42883') {
          // Function doesn't exist, fall back to direct operations
          throw new Error('Function not available');
        }
        if (error) throw error;
        isFavorited = data;
      } catch (funcError) {
        console.warn('Function call failed, using direct operations:', funcError);
        
        // Check if table exists first
        const tableCheck = await supabase
          .from('user_favorites_businesses')
          .select('id', { count: 'exact' })
          .limit(0);
        
        if (tableCheck.error && tableCheck.error.code === '42P01') {
          toast.error('Favorites feature is not available yet. Please contact support.');
          return false;
        }
        
        // Fallback to direct database operations
        const { data: existing } = await supabase
          .from('user_favorites_businesses')
          .select('id')
          .eq('user_id', user.id)
          .eq('business_id', businessId)
          .maybeSingle();
          
        if (existing) {
          // Remove from favorites
          const { error } = await supabase
            .from('user_favorites_businesses')
            .delete()
            .eq('user_id', user.id)
            .eq('business_id', businessId);
          if (error) throw error;
          isFavorited = false;
        } else {
          // Add to favorites
          const { error } = await supabase
            .from('user_favorites_businesses')
            .insert({ user_id: user.id, business_id: businessId });
          if (error) throw error;
          isFavorited = true;
        }
      }

      // Update cache immediately for instant UI feedback
      if (isFavorited) {
        favoritesCache.current.businesses.add(businessId);
        toast.success('Added to favorites!');
      } else {
        favoritesCache.current.businesses.delete(businessId);
        toast.success('Removed from favorites');
      }

      // Update cache timestamp to trigger re-renders
      favoritesCache.current.lastUpdated = Date.now();

      // Update local state immediately to match cache
      setState(prev => {
        const newBusinesses = isFavorited
          ? prev.businesses // Will be populated by loadFavorites if needed
          : prev.businesses.filter(b => b.business_id !== businessId);
        
        const newCounts = {
          ...prev.counts,
          businesses: isFavorited
            ? prev.counts.businesses + (currentlyFavorited ? 0 : 1)
            : Math.max(0, prev.counts.businesses - 1)
        };
        
        return {
          ...prev,
          businesses: newBusinesses,
          counts: newCounts
        };
      });
      
      // Note: We don't reload here to avoid race conditions.
      // The cache and state are already updated above.
      // The Favorites page will load full data when needed.

      return isFavorited;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update favorites';
      toast.error(errorMessage);
      console.error('Error toggling business favorite:', error);
      return false;
    }
  }, [user?.id, loadFavorites]);

  /**
   * Toggle coupon favorite status
   */
  const toggleCouponFavorite = useCallback(async (couponId: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to save favorites');
      return false;
    }

    try {
      // Get current state before making changes
      const currentlyFavorited = favoritesCache.current.coupons.has(couponId);
      let isFavorited: boolean;
      
      try {
        // Try the database function first
        const { data, error } = await supabase
          .rpc('toggle_coupon_favorite', { coupon_uuid: couponId });

        if (error && error.code === '42P01') {
          toast.error('Favorites feature is not available yet. Please contact support.');
          return false;
        }
        if (error && error.code === '42883') {
          // Function doesn't exist, fall back to direct operations
          throw new Error('Function not available');
        }
        if (error) throw error;
        isFavorited = data;
      } catch (funcError) {
        console.warn('Function call failed, using direct operations:', funcError);
        
        // Check if table exists first
        const tableCheck = await supabase
          .from('user_favorites_coupons')
          .select('id', { count: 'exact' })
          .limit(0);
        
        if (tableCheck.error && tableCheck.error.code === '42P01') {
          toast.error('Favorites feature is not available yet. Please contact support.');
          return false;
        }
        
        // Fallback to direct database operations
        const { data: existing } = await supabase
          .from('user_favorites_coupons')
          .select('id')
          .eq('user_id', user.id)
          .eq('coupon_id', couponId)
          .maybeSingle();
          
        if (existing) {
          // Remove from favorites
          const { error } = await supabase
            .from('user_favorites_coupons')
            .delete()
            .eq('user_id', user.id)
            .eq('coupon_id', couponId);
          if (error) throw error;
          isFavorited = false;
        } else {
          // Add to favorites
          const { error } = await supabase
            .from('user_favorites_coupons')
            .insert({ user_id: user.id, coupon_id: couponId });
          if (error) throw error;
          isFavorited = true;
        }
      }

      // Update cache immediately for instant UI feedback
      if (isFavorited) {
        favoritesCache.current.coupons.add(couponId);
        toast.success('Added to favorites!');
      } else {
        favoritesCache.current.coupons.delete(couponId);
        toast.success('Removed from favorites');
      }

      // Update cache timestamp to trigger re-renders
      favoritesCache.current.lastUpdated = Date.now();

      // Update local state immediately to match cache
      setState(prev => {
        const newCoupons = isFavorited
          ? prev.coupons // Will be populated by loadFavorites if needed
          : prev.coupons.filter(c => c.coupon_id !== couponId);
        
        const newCounts = {
          ...prev.counts,
          coupons: isFavorited
            ? prev.counts.coupons + (currentlyFavorited ? 0 : 1)
            : Math.max(0, prev.counts.coupons - 1)
        };
        
        return {
          ...prev,
          coupons: newCoupons,
          counts: newCounts
        };
      });
      
      // Note: We don't reload here to avoid race conditions.
      // The cache and state are already updated above.
      // The Favorites page will load full data when needed.

      return isFavorited;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update favorites';
      toast.error(errorMessage);
      console.error('Error toggling coupon favorite:', error);
      return false;
    }
  }, [user?.id, loadFavorites]);

  /**
   * Add item to wishlist
   */
  const addToWishlist = useCallback(async (
    itemType: 'business' | 'coupon' | 'product',
    itemId: string,
    notes?: string,
    priority: number = 3
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to save to wishlist');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_wishlist_items')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          notes,
          priority
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate entry
        if (error.code === '23505') {
          toast.info('Item is already in your wishlist');
          return false;
        }
        throw error;
      }

      setState(prev => ({
        ...prev,
        wishlist: [data, ...prev.wishlist],
        counts: {
          ...prev.counts,
          wishlist: prev.counts.wishlist + 1
        }
      }));

      toast.success('Added to wishlist!');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to wishlist';
      toast.error(errorMessage);
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }, [user?.id]);

  /**
   * Remove item from wishlist
   */
  const removeFromWishlist = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('user_wishlist_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        wishlist: prev.wishlist.filter(item => item.id !== itemId),
        counts: {
          ...prev.counts,
          wishlist: Math.max(0, prev.counts.wishlist - 1)
        }
      }));

      toast.success('Removed from wishlist');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove from wishlist';
      toast.error(errorMessage);
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }, [user?.id]);

  /**
   * Check if business is favorited (uses cache for performance)
   */
  const isBusinessFavorited = useCallback((businessId: string): boolean => {
    return favoritesCache.current.businesses.has(businessId);
  }, []);

  /**
   * Check if coupon is favorited (uses cache for performance)
   */
  const isCouponFavorited = useCallback((couponId: string): boolean => {
    return favoritesCache.current.coupons.has(couponId);
  }, []);

  /**
   * Clear all favorites (with confirmation)
   */
  const clearAllFavorites = useCallback(async (type?: 'businesses' | 'coupons' | 'wishlist') => {
    if (!user?.id) return false;

    try {
      if (type === 'businesses' || !type) {
        await supabase
          .from('user_favorites_businesses')
          .delete()
          .eq('user_id', user.id);
      }

      if (type === 'coupons' || !type) {
        await supabase
          .from('user_favorites_coupons')
          .delete()
          .eq('user_id', user.id);
      }

      if (type === 'wishlist' || !type) {
        await supabase
          .from('user_wishlist_items')
          .delete()
          .eq('user_id', user.id);
      }

      // Update local state
      setState(prev => ({
        ...prev,
        businesses: type === 'businesses' || !type ? [] : prev.businesses,
        coupons: type === 'coupons' || !type ? [] : prev.coupons,
        wishlist: type === 'wishlist' || !type ? [] : prev.wishlist,
        counts: {
          businesses: type === 'businesses' || !type ? 0 : prev.counts.businesses,
          coupons: type === 'coupons' || !type ? 0 : prev.counts.coupons,
          wishlist: type === 'wishlist' || !type ? 0 : prev.counts.wishlist
        }
      }));

      // Clear cache
      if (type === 'businesses' || !type) {
        favoritesCache.current.businesses.clear();
      }
      if (type === 'coupons' || !type) {
        favoritesCache.current.coupons.clear();
      }

      toast.success('Favorites cleared successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear favorites';
      toast.error(errorMessage);
      console.error('Error clearing favorites:', error);
      return false;
    }
  }, [user?.id]);

  /**
   * Setup realtime subscriptions for favorites updates
   */
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user?.id || !enableRealtime) return;

    // Clean up existing subscriptions
    subscriptions.current.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    subscriptions.current = [];

    // Business favorites subscription
    const businessFavoritesChannel = supabase
      .channel('user_favorites_businesses')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_favorites_businesses',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Reload favorites when changes occur
        loadFavorites(false);
      })
      .subscribe();

    // Coupon favorites subscription
    const couponFavoritesChannel = supabase
      .channel('user_favorites_coupons')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_favorites_coupons',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Reload favorites when changes occur
        loadFavorites(false);
      })
      .subscribe();

    // Wishlist subscription
    const wishlistChannel = supabase
      .channel('user_wishlist_items')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_wishlist_items',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Reload wishlist when changes occur
        loadWishlist().then(wishlist => {
          setState(prev => ({
            ...prev,
            wishlist,
            counts: {
              ...prev.counts,
              wishlist: wishlist.length
            }
          }));
        });
      })
      .subscribe();

    subscriptions.current = [businessFavoritesChannel, couponFavoritesChannel, wishlistChannel];
  }, [user?.id, enableRealtime, loadFavorites, loadWishlist]);

  // Auto-load favorites when user changes
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadFavorites();
      setupRealtimeSubscriptions();
    } else if (!user?.id) {
      // Clear state when user logs out
      setState({
        businesses: [],
        coupons: [],
        wishlist: [],
        isLoading: false,
        error: null,
        counts: { businesses: 0, coupons: 0, wishlist: 0 }
      });
      favoritesCache.current = {
        businesses: new Set(),
        coupons: new Set(),
        lastUpdated: 0
      };
    }
  }, [user?.id, autoLoad, loadFavorites, setupRealtimeSubscriptions]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptions.current.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, []);

  return {
    // State
    ...state,
    isAuthenticated: !!user?.id,
    
    // Actions
    loadFavorites,
    loadFavoriteBusinesses,
    loadFavoriteCoupons,
    loadWishlist,
    toggleBusinessFavorite,
    toggleCouponFavorite,
    addToWishlist,
    removeFromWishlist,
    clearAllFavorites,
    
    // Utilities
    isBusinessFavorited,
    isCouponFavorited,
    refresh: () => loadFavorites(false),
    
    // Stats
    totalFavorites: state.counts.businesses + state.counts.coupons,
    hasAnyFavorites: state.counts.businesses > 0 || state.counts.coupons > 0 || state.counts.wishlist > 0
  };
};

export default useFavorites;